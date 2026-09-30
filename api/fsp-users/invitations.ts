import { createHash, randomBytes } from 'node:crypto'

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'

import { deliverInvitationEmail } from '../_lib/invitationEmail'
import { handleApiError, sendApiError } from '../_lib/responses'
import { createSupabaseUserServerClient } from '../../src/lib/supabase/server'
import { getTrustedAppUrl } from '../_lib/serverConfig'

const headersSchema = z.object({ authorization: z.string().regex(/^Bearer\s+\S+$/) })
const bodySchema = z.object({
  fspId: z.string().uuid(),
  email: z.string().trim().email().max(320),
  role: z.enum(['ADMIN', 'SUBMITTER', 'VIEWER']),
})

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') return sendApiError(response, 'NOT_FOUND', 'Route not found.')
  try {
    const headers = headersSchema.parse(request.headers)
    const body = bodySchema.parse(request.body)
    const client = createSupabaseUserServerClient(headers.authorization.replace(/^Bearer\s+/, ''))
    const { data: authData } = await client.auth.getUser()
    if (!authData.user)
      return sendApiError(response, 'UNAUTHENTICATED', 'Authentication is required.')

    const appUrl = getTrustedAppUrl()
    const rawToken = randomBytes(32).toString('base64url')
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')
    const { data, error } = await client.rpc('create_fsp_invitation', {
      target_fsp_id: body.fspId,
      target_email: body.email,
      target_role: body.role,
      target_token_hash: tokenHash,
    })
    if (error) {
      if (error.code === '42501')
        return sendApiError(response, 'FORBIDDEN', 'Only FSP administrators can invite users.')
      if (error.code === '23505') return sendApiError(response, 'CONFLICT', error.message)
      throw error
    }
    const invitation = data?.[0]
    if (!invitation) throw new Error('Invitation was not created.')
    const invitationUrl = new URL(`/invite/${rawToken}`, appUrl).toString()
    const fspResult = await client
      .from('fsps')
      .select('registered_name')
      .eq('id', body.fspId)
      .single()
    const delivery = await deliverInvitationEmail({
      email: invitation.email,
      workspaceName: fspResult.data?.registered_name ?? 'your FSP workspace',
      role: invitation.role,
      invitationUrl,
    })
    await client.rpc('record_fsp_invitation_delivery', {
      target_invitation_id: invitation.invitation_id,
      target_status: delivery.status,
      target_error_code: delivery.status === 'FAILED' ? delivery.errorCode : undefined,
    })
    if (delivery.status === 'FAILED') {
      return response.status(502).json({
        error: {
          code: 'INTERNAL_ERROR',
          message:
            'The invitation was saved, but its email could not be delivered. You can resend it.',
        },
      })
    }
    return response.status(201).json({
      invitation,
      previewUrl: delivery.status === 'CAPTURED' ? delivery.previewUrl : undefined,
    })
  } catch (error) {
    return handleApiError(response, error)
  }
}
