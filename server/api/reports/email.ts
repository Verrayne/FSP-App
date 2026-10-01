import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import type { Database } from '../../../src/types/database.types.js'
import { reportingSchema, reportTitles } from '../../../src/features/admin/reporting/model.js'
import {
  buildReportWorkbook,
  reportFilename,
} from '../../../src/features/admin/reporting/workbook.js'
import { createEmailProvider, escapeHtml } from '../_lib/emailProvider.js'

const payloadSchema = z
  .object({
    tenantId: z.string().uuid(),
    kind: z.enum(['completion', 'validity', 'enterprise', 'fsps']),
    windowDays: z.union([z.literal(1), z.literal(7), z.literal(30)]),
    recipient: z.string().trim().email().max(254),
    requestId: z.string().uuid(),
  })
  .strict()

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader('Cache-Control', 'no-store')
  if (request.method !== 'POST') return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' })
  const payload = payloadSchema.safeParse(request.body)
  if (!payload.success) return response.status(400).json({ error: 'INVALID_REPORT_REQUEST' })
  const token = /^Bearer (\S+)$/.exec(request.headers.authorization ?? '')?.[1]
  if (!token) return response.status(401).json({ error: 'UNAUTHENTICATED' })
  try {
    const config = z
      .object({
        VITE_SUPABASE_URL: z.string().url(),
        VITE_SUPABASE_PUBLISHABLE_KEY: z.string().startsWith('sb_publishable_'),
      })
      .safeParse(process.env)
    if (!config.success) return response.status(503).json({ error: 'REPORT_CONFIGURATION_MISSING' })
    // A user-scoped publishable client deliberately keeps reporting under database authorization.
    const client = createClient<Database>(
      config.data.VITE_SUPABASE_URL,
      config.data.VITE_SUPABASE_PUBLISHABLE_KEY,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      },
    )
    const { data: user, error: authError } = await client.auth.getUser(token)
    if (authError || !user.user) return response.status(401).json({ error: 'UNAUTHENTICATED' })
    const { data: memberships, error: membershipError } = await client.rpc(
      'list_my_tenant_memberships',
    )
    const membership = memberships?.find(
      (item) =>
        item.tenant_id === payload.data.tenantId &&
        ['ADMIN', 'REVIEWER'].includes(item.tenant_role),
    )
    if (membershipError || !membership) return response.status(403).json({ error: 'FORBIDDEN' })
    if (
      process.env.VERCEL_ENV !== 'production' ||
      !process.env.RESEND_API_KEY ||
      !process.env.EMAIL_FROM
    )
      return response.status(503).json({ error: 'EMAIL_CONFIGURATION_MISSING' })
    const { data, error } = await client.rpc('get_tenant_reporting', {
      target_tenant_id: payload.data.tenantId,
      window_days: payload.data.windowDays,
    })
    if (error)
      return response
        .status(error.code === '42501' ? 403 : 503)
        .json({ error: 'REPORT_UNAVAILABLE' })
    const report = reportingSchema.parse(data)
    const bytes = buildReportWorkbook(
      report,
      payload.data.kind,
      membership.tenant_name,
      payload.data.windowDays,
    )
    if (bytes.length > 10_000_000) return response.status(413).json({ error: 'REPORT_TOO_LARGE' })
    const reservation = await client.rpc('reserve_report_email', {
      target_tenant_id: payload.data.tenantId,
      target_request_id: payload.data.requestId,
    })
    if (reservation.error)
      return response
        .status(reservation.error.code === '42501' ? 403 : 503)
        .json({ error: 'REPORT_UNAVAILABLE' })
    if (!reservation.data) return response.status(429).json({ error: 'REPORT_EMAIL_LIMIT' })
    const title = reportTitles[payload.data.kind]
    const result = await createEmailProvider().send({
      to: payload.data.recipient,
      subject: `${membership.tenant_name} — ${title}`,
      text: `${title}\nInsurer: ${membership.tenant_name}\nAs of: ${report.asOf.slice(0, 10)}\nThe attached Excel workbook contains the report data${payload.data.kind === 'fsps' ? '' : ' and charts'}. Unavailable history is explicitly marked.`,
      html: `<p>${escapeHtml(title)} — ${escapeHtml(membership.tenant_name)}</p><p>The Excel report is attached. Historical gaps are explicitly marked.</p>`,
      idempotencyKey: `portfolio-report-${payload.data.requestId}`,
      attachments: [
        {
          filename: reportFilename(payload.data.kind, report.asOf),
          content: Buffer.from(bytes).toString('base64'),
        },
      ],
    })
    if (!result.accepted || result.provider === 'LOCAL_CAPTURE')
      return response.status(502).json({ error: 'REPORT_EMAIL_FAILED' })
    return response.status(202).json({ accepted: true })
  } catch {
    return response.status(503).json({ error: 'REPORT_UNAVAILABLE' })
  }
}
