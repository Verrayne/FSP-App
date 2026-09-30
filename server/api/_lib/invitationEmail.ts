import { createEmailProvider, escapeHtml } from './emailProvider.js'
import { createHash } from 'node:crypto'

export interface InvitationEmailInput {
  email: string
  workspaceName: string
  role: string
  invitationUrl: string
}

export type InvitationDelivery =
  | { status: 'SENT' }
  | { status: 'CAPTURED'; previewUrl: string }
  | { status: 'FAILED'; errorCode: string }

export async function deliverInvitationEmail(
  input: InvitationEmailInput,
): Promise<InvitationDelivery> {
  if (process.env.VERCEL_ENV !== 'production')
    return { status: 'CAPTURED', previewUrl: input.invitationUrl }
  const provider = createEmailProvider()
  const text = `You have been invited to ${input.workspaceName} as ${input.role}. This invitation expires in 7 days. Accept it here: ${input.invitationUrl}`
  const result = await provider.send({
    to: input.email,
    subject: `Invitation to ${input.workspaceName}`,
    text,
    html: `<p>You have been invited to <strong>${escapeHtml(input.workspaceName)}</strong> as ${escapeHtml(input.role)}.</p><p>This invitation expires in 7 days.</p><p><a href="${escapeHtml(input.invitationUrl)}">Accept invitation</a></p>`,
    idempotencyKey: `invitation-${createHash('sha256').update(input.invitationUrl).digest('hex')}`,
  })
  return result.accepted ? { status: 'SENT' } : { status: 'FAILED', errorCode: result.errorCode }
}
