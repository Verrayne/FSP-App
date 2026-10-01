import type { VercelRequest, VercelResponse } from '@vercel/node'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reportingFixture } from '../../../src/features/admin/reporting/testFixtures'
import handler from './email'
import type { EmailMessage, EmailResult } from '../_lib/emailProvider'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  rpc: vi.fn<(name: string, args?: unknown) => Promise<{ data: unknown; error: null }>>(),
  send: vi.fn<(message: EmailMessage) => Promise<EmailResult>>(),
}))
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc }),
}))
vi.mock('../_lib/emailProvider', () => ({
  createEmailProvider: () => ({ send: mocks.send }),
  escapeHtml: (value: string) => value,
}))
const tenantId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
function request(overrides: Record<string, unknown> = {}): VercelRequest {
  return {
    method: 'POST',
    headers: { authorization: 'Bearer valid-token' },
    body: {
      tenantId,
      kind: 'completion',
      windowDays: 7,
      recipient: 'recipient@example.test',
      requestId: '11000000-0000-4000-8000-000000000001',
    },
    ...overrides,
  } as VercelRequest
}
function response() {
  const result = { status: vi.fn(), json: vi.fn(), setHeader: vi.fn() }
  result.status.mockReturnValue(result)
  return result as unknown as VercelResponse & typeof result
}

describe('report email endpoint', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test')
    vi.stubEnv('RESEND_API_KEY', 're_test')
    vi.stubEnv('EMAIL_FROM', 'Reports <reports@example.test>')
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'actor' } }, error: null })
    mocks.rpc.mockImplementation((name: string) =>
      Promise.resolve(
        name === 'list_my_tenant_memberships'
          ? {
              data: [{ tenant_id: tenantId, tenant_role: 'ADMIN', tenant_name: 'Cape Horizon' }],
              error: null,
            }
          : name === 'get_tenant_reporting'
            ? { data: reportingFixture(), error: null }
            : { data: true, error: null },
      ),
    )
    mocks.send.mockResolvedValue({ accepted: true, provider: 'RESEND', messageId: 'email-1' })
  })
  afterEach(() => vi.unstubAllEnvs())
  it('authenticates and sends a server-generated Excel attachment rather than client-supplied data', async () => {
    const res = response()
    await handler(request(), res)
    expect(res.status).toHaveBeenCalledWith(202)
    expect(mocks.rpc).toHaveBeenCalledWith('get_tenant_reporting', {
      target_tenant_id: tenantId,
      window_days: 7,
    })
    const message = mocks.send.mock.calls[0][0]
    expect(message.to).toBe('recipient@example.test')
    expect(message.attachments?.[0]?.filename).toBe('fsp-completion-2026-10-01.xlsx')
    expect(
      Buffer.from(message.attachments?.[0]?.content ?? '', 'base64')
        .subarray(0, 2)
        .toString(),
    ).toBe('PK')
  })
  it('denies another tenant and viewer email access before reading report data', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ tenant_id: tenantId, tenant_role: 'VIEWER', tenant_name: 'Cape Horizon' }],
      error: null,
    })
    const res = response()
    await handler(request(), res)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(mocks.rpc).not.toHaveBeenCalledWith('get_tenant_reporting', expect.anything())
    expect(mocks.send).not.toHaveBeenCalled()
  })
  it('does not send without a valid bearer session', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'invalid' } })
    const res = response()
    await handler(request(), res)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(mocks.send).not.toHaveBeenCalled()
  })
  it('fails clearly when email delivery is not configured', async () => {
    vi.stubEnv('RESEND_API_KEY', '')
    const res = response()
    await handler(request(), res)
    expect(res.status).toHaveBeenCalledWith(503)
    expect(res.json).toHaveBeenCalledWith({ error: 'EMAIL_CONFIGURATION_MISSING' })
    expect(mocks.send).not.toHaveBeenCalled()
  })
  it('enforces durable throttling and does not claim a local capture was delivered', async () => {
    const original = mocks.rpc.getMockImplementation()!
    mocks.rpc.mockImplementation((name: string, ...args: unknown[]) =>
      name === 'reserve_report_email'
        ? Promise.resolve({ data: false, error: null })
        : original(name, args[0]),
    )
    const res = response()
    await handler(request(), res)
    expect(res.status).toHaveBeenCalledWith(429)
    expect(mocks.send).not.toHaveBeenCalled()
    mocks.rpc.mockImplementation(original)
    mocks.send.mockResolvedValue({
      accepted: true,
      provider: 'LOCAL_CAPTURE',
      messageId: 'capture',
    })
    const second = response()
    await handler(request(), second)
    expect(second.status).toHaveBeenCalledWith(502)
  })
  it('rejects attempts to inject report rows or invalid email addresses', async () => {
    const res = response()
    await handler(request({ body: { ...request().body, portfolio: [{ fspName: 'Forged' }] } }), res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(mocks.getUser).not.toHaveBeenCalled()
  })
})
