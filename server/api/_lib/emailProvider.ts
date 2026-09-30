import { z } from 'zod'

const productionEmailEnv = z.object({
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
})

export interface EmailMessage {
  to: string
  subject: string
  text: string
  html: string
  idempotencyKey: string
}

export type EmailResult =
  | { accepted: true; provider: string; messageId: string }
  | { accepted: false; errorCode: string; permanent: boolean }

export interface EmailProvider {
  send(message: EmailMessage): Promise<EmailResult>
}

function safeProviderCode(value: unknown) {
  const code =
    typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
      ? String(value)
      : 'UNKNOWN'
  return code
    .replace(/[^A-Z0-9_]/gi, '_')
    .toUpperCase()
    .slice(0, 80)
}

export function createEmailProvider(): EmailProvider {
  if (process.env.VERCEL_ENV !== 'production') {
    return {
      send(message) {
        return Promise.resolve({
          accepted: true as const,
          provider: 'LOCAL_CAPTURE',
          messageId: message.idempotencyKey,
        })
      },
    }
  }
  const parsed = productionEmailEnv.safeParse(process.env)
  if (!parsed.success) {
    return {
      send() {
        return Promise.resolve({
          accepted: false as const,
          errorCode: 'EMAIL_CONFIGURATION_MISSING',
          permanent: true,
        })
      },
    }
  }
  return {
    async send(message) {
      try {
        const result = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${parsed.data.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': message.idempotencyKey,
          },
          body: JSON.stringify({
            from: parsed.data.EMAIL_FROM,
            to: [message.to],
            subject: message.subject,
            text: message.text,
            html: message.html,
          }),
          signal: AbortSignal.timeout(10_000),
        })
        if (!result.ok) {
          return {
            accepted: false,
            errorCode: `EMAIL_PROVIDER_${result.status}`,
            permanent: result.status >= 400 && result.status < 500 && result.status !== 429,
          }
        }
        const body = (await result.json().catch(() => ({}))) as { id?: unknown }
        return {
          accepted: true,
          provider: 'RESEND',
          messageId: typeof body.id === 'string' ? body.id : message.idempotencyKey,
        }
      } catch (error) {
        return {
          accepted: false,
          errorCode: `EMAIL_PROVIDER_${safeProviderCode(error instanceof Error ? error.name : error)}`,
          permanent: false,
        }
      }
    },
  }
}

export function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      })[character] ?? character,
  )
}
