import { afterEach, describe, expect, it, vi } from 'vitest'

import { createEmailProvider, escapeHtml } from './emailProvider'

describe('email provider', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('captures non-production delivery without network access', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview')
    const result = await createEmailProvider().send({
      to: 'user@example.test',
      subject: 'Submission completed',
      text: 'Complete',
      html: '<p>Complete</p>',
      idempotencyKey: 'notification-1',
    })
    expect(result).toEqual({
      accepted: true,
      provider: 'LOCAL_CAPTURE',
      messageId: 'notification-1',
    })
  })

  it('escapes values inserted into HTML templates', () => {
    expect(escapeHtml('<script>"x" & y</script>')).toBe(
      '&lt;script&gt;&quot;x&quot; &amp; y&lt;/script&gt;',
    )
  })

  it('fails closed when production delivery is not configured', async () => {
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('RESEND_API_KEY', '')
    vi.stubEnv('EMAIL_FROM', '')
    const result = await createEmailProvider().send({
      to: 'user@example.test',
      subject: 'Test',
      text: 'Test',
      html: '<p>Test</p>',
      idempotencyKey: 'test',
    })
    expect(result).toEqual({
      accepted: false,
      errorCode: 'EMAIL_CONFIGURATION_MISSING',
      permanent: true,
    })
  })
})
