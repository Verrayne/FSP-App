import { createHash, randomBytes } from 'node:crypto'

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'

import { deliverInvitationEmail } from '../_lib/invitationEmail'
import { requirePlatformAdmin } from '../_lib/platformAdmin'
import { handleApiError, sendApiError } from '../_lib/responses'
import { getTrustedAppUrl } from '../_lib/serverConfig'

const bodySchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[A-Za-z][A-Za-z0-9_]*$/),
  name: z.string().trim().min(2).max(255),
  adminEmail: z.string().trim().email().max(320),
})

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') return sendApiError(response, 'NOT_FOUND', 'Route not found.')
  try {
    const body = bodySchema.parse(request.body)
    const { service, userClient } = await requirePlatformAdmin(request)
    const rawToken = randomBytes(32).toString('base64url')
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')
    const result = await userClient.rpc('create_platform_tenant', {
      target_code: body.code.toUpperCase(),
      target_name: body.name,
      target_admin_email: body.adminEmail,
      target_token_hash: tokenHash,
    })
    if (result.error) {
      if (result.error.code === '23505')
        return sendApiError(response, 'CONFLICT', result.error.message)
      if (result.error.code === '42501')
        return sendApiError(response, 'FORBIDDEN', 'Platform administrator access required.')
      throw result.error
    }
    const created = result.data?.[0]
    if (!created) throw new Error('Tenant was not created.')

    const invitationUrl = new URL(`/tenant-invite/${rawToken}`, getTrustedAppUrl()).toString()
    const delivery = await deliverInvitationEmail({
      email: created.admin_email,
      workspaceName: body.name,
      role: 'Tenant Administrator',
      invitationUrl,
    })
    await service
      .from('tenant_invitations')
      .update({
        delivery_status: delivery.status,
        delivery_date: new Date().toISOString(),
        delivery_error_code: delivery.status === 'FAILED' ? delivery.errorCode : null,
      })
      .eq('id', created.invitation_id)

    return response.status(201).json({
      tenantId: created.tenant_id,
      adminEmail: created.admin_email,
      previewUrl: delivery.status === 'CAPTURED' ? delivery.previewUrl : undefined,
      deliveryStatus: delivery.status,
    })
  } catch (error) {
    return handleApiError(response, error)
  }
}
