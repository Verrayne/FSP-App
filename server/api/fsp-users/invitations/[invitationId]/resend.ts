import { createHash, randomBytes } from 'node:crypto'

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'

import { deliverInvitationEmail } from '../../../_lib/invitationEmail'
import { handleApiError, sendApiError } from '../../../_lib/responses'
import { createSupabaseUserServerClient } from '../../../../../src/lib/supabase/server'
import { getTrustedAppUrl } from '../../../_lib/serverConfig'

const headersSchema = z.object({ authorization: z.string().regex(/^Bearer\s+\S+$/) })
const paramsSchema = z.object({ invitationId: z.string().uuid() })

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') return sendApiError(response, 'NOT_FOUND', 'Route not found.')
  try {
    const headers = headersSchema.parse(request.headers)
    const params = paramsSchema.parse(request.query)
    const client = createSupabaseUserServerClient(headers.authorization.replace(/^Bearer\s+/, ''))
    const appUrl = getTrustedAppUrl()
    const rawToken = randomBytes(32).toString('base64url')
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')
    const { data, error } = await client.rpc('resend_fsp_invitation', {
      target_invitation_id: params.invitationId,
      target_token_hash: tokenHash,
    })
    if (error) {
      if (error.code === '42501')
        return sendApiError(
          response,
          'FORBIDDEN',
          'Only FSP administrators can resend invitations.',
        )
      if (error.code === 'P0002' || error.code === '55000')
        return sendApiError(response, 'CONFLICT', 'This invitation can no longer be resent.')
      throw error
    }
    const invitation = data?.[0]
    if (!invitation) throw new Error('Invitation was not updated.')
    const invitationUrl = new URL(`/invite/${rawToken}`, appUrl).toString()
    const delivery = await deliverInvitationEmail({
      email: invitation.email,
      workspaceName: 'your FSP workspace',
      role: invitation.role,
      invitationUrl,
    })
    await client.rpc('record_fsp_invitation_delivery', {
      target_invitation_id: invitation.invitation_id,
      target_status: delivery.status,
      target_error_code: delivery.status === 'FAILED' ? delivery.errorCode : undefined,
    })
    if (delivery.status === 'FAILED')
      return response.status(502).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'The invitation was renewed, but its email could not be delivered. Try again.',
        },
      })
    return response.status(200).json({
      invitation,
      previewUrl: delivery.status === 'CAPTURED' ? delivery.previewUrl : undefined,
    })
  } catch (error) {
    return handleApiError(response, error)
  }
}
