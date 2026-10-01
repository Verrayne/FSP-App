import { getSupabaseBrowserClient } from '../../../lib/supabase/client'
import {
  reportingSchema,
  type ReportingWindow,
  type ReportKind,
  type TenantReporting,
} from './model'
import { buildReportWorkbook, reportFilename } from './workbook'

export async function getTenantReporting(tenantId: string, windowDays: ReportingWindow) {
  const { data, error } = await getSupabaseBrowserClient().rpc('get_tenant_reporting', {
    target_tenant_id: tenantId,
    window_days: windowDays,
  })
  if (error) throw new Error('Portfolio reports could not be loaded.')
  return reportingSchema.parse(data)
}

export function downloadReport(
  report: TenantReporting,
  kind: ReportKind,
  tenantName: string,
  windowDays: ReportingWindow,
) {
  const bytes = buildReportWorkbook(report, kind, tenantName, windowDays)
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(bytes)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
  )
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = reportFilename(kind, report.asOf)
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function emailReport(
  tenantId: string,
  kind: ReportKind,
  windowDays: ReportingWindow,
  recipient: string,
  requestId: string,
) {
  const {
    data: { session },
  } = await getSupabaseBrowserClient().auth.getSession()
  if (!session) throw new Error('Sign in to email a report.')
  const response = await fetch('/api/reports/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ tenantId, kind, windowDays, recipient, requestId }),
  })
  const body = (await response.json().catch(() => ({}))) as { error?: string }
  if (!response.ok) {
    if (body.error === 'EMAIL_CONFIGURATION_MISSING')
      throw new Error(
        'Report email is not configured. Ask an administrator to set RESEND_API_KEY and EMAIL_FROM on the server. You can still download the report.',
      )
    if (response.status === 429)
      throw new Error('Too many reports have been emailed. Try again in ten minutes.')
    if (response.status === 403)
      throw new Error('Only insurer administrators and reviewers can email reports.')
    throw new Error('The report could not be emailed. Please try again.')
  }
}
