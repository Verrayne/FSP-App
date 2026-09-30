import { getSupabaseBrowserClient } from '../../../lib/supabase/client'
import type {
  DashboardPeriod,
  DashboardRelationship,
  DashboardSubmission,
  DashboardSummary,
  SubmissionPeriodStatus,
  SubmissionStatus,
} from '../types/dashboard'

export const dashboardQueryKeys = {
  root: ['fsp-dashboard'] as const,
  relationships: (fspId: string) => [...dashboardQueryKeys.root, 'relationships', fspId] as const,
  summary: (fspId: string, tenantId: string, tenantFspId: string) =>
    [...dashboardQueryKeys.root, 'summary', fspId, tenantId, tenantFspId] as const,
}

function requireData<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message)
  if (data === null) throw new Error('Dashboard data was not returned.')
  return data
}

export async function getDashboardRelationships(fspId: string): Promise<DashboardRelationship[]> {
  const { data, error } = await getSupabaseBrowserClient()
    .from('tenant_fsps')
    .select('id, tenant_id, broker_reference, tenant:tenants!tenant_fsps_tenant_id_fkey(id, name)')
    .eq('fsp_id', fspId)
    .eq('status', 'ACTIVE')
    .order('link_date', { ascending: true })

  return requireData(data, error).map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    tenantName: row.tenant.name,
    brokerReference: row.broker_reference,
  }))
}

function mapPeriod(row: {
  id: string
  name: string
  year: number
  open_date: string
  close_date: string
  status: string
}): DashboardPeriod {
  return {
    id: row.id,
    name: row.name,
    year: row.year,
    openDate: row.open_date,
    closeDate: row.close_date,
    status: row.status as SubmissionPeriodStatus,
  }
}

function mapSubmission(row: {
  id: string
  submission_period_id: string
  status: string
  submission_route: string | null
  start_date: string | null
  submit_date: string | null
  update_date: string
}): DashboardSubmission {
  return {
    id: row.id,
    periodId: row.submission_period_id,
    status: row.status as SubmissionStatus,
    route: row.submission_route as DashboardSubmission['route'],
    startDate: row.start_date,
    submitDate: row.submit_date,
    updateDate: row.update_date,
  }
}

export function southAfricanDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-ZA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}`
}

export function resolveRelevantPeriod(periods: DashboardPeriod[], today: string) {
  const active = periods
    .filter(
      (period) => period.status === 'OPEN' && period.openDate <= today && period.closeDate >= today,
    )
    .sort((a, b) => a.closeDate.localeCompare(b.closeDate))[0]
  if (active) return active

  const upcoming = periods
    .filter(
      (period) =>
        (period.status === 'DRAFT' || period.status === 'OPEN') && period.openDate > today,
    )
    .sort((a, b) => a.openDate.localeCompare(b.openDate))[0]
  if (upcoming) return upcoming

  return (
    periods
      .filter((period) => period.status !== 'ARCHIVED' && period.closeDate < today)
      .sort((a, b) => b.closeDate.localeCompare(a.closeDate))[0] ?? null
  )
}

export async function getDashboardSummary(
  tenantId: string,
  tenantFspId: string,
  today = southAfricanDateKey(),
): Promise<DashboardSummary> {
  const client = getSupabaseBrowserClient()
  const [periodResult, submissionResult] = await Promise.all([
    client
      .from('submission_periods')
      .select('id, name, year, open_date, close_date, status')
      .eq('tenant_id', tenantId)
      .order('open_date', { ascending: false })
      .limit(12),
    client
      .from('submissions')
      .select(
        'id, submission_period_id, status, submission_route, start_date, submit_date, update_date',
      )
      .eq('tenant_fsp_id', tenantFspId)
      .order('update_date', { ascending: false })
      .limit(12),
  ])
  const periods = requireData(periodResult.data, periodResult.error).map(mapPeriod)
  const submissions = requireData(submissionResult.data, submissionResult.error).map(mapSubmission)
  const period = resolveRelevantPeriod(periods, today)
  const submission = period
    ? (submissions.find((item) => item.periodId === period.id) ?? null)
    : null
  const previousSubmission = submissions.find((item) => item.id !== submission?.id) ?? null

  return { period, submission, previousSubmission }
}
