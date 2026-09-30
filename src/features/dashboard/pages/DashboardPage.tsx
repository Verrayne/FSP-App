import { useQuery } from '@tanstack/react-query'
import { AlertCircle, CalendarDays, CheckCircle2, Clock3, FileText } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Button, Card, EmptyState, Select } from '../../../components/ui'
import { buttonVariants } from '../../../components/ui/buttonVariants'
import { useFsp } from '../../onboarding/hooks/useFsp'
import { hasFspPermission } from '../../permissions/fspPermissions'
import {
  dashboardAction,
  formatDateOnly,
  formatTimestamp,
  submissionStatusPresentation,
} from '../lib/dashboardPresentation'
import {
  dashboardQueryKeys,
  getDashboardRelationships,
  getDashboardSummary,
  southAfricanDateKey,
} from '../services/dashboardService'
import type { DashboardPeriod, DashboardSubmission } from '../types/dashboard'
import { DashboardSkeleton } from '../components/DashboardSkeleton'

const MINIMUM_INITIAL_LOADING_MS = 250

async function withMinimumInitialLoading<T>(promise: Promise<T>) {
  const [data] = await Promise.all([
    promise,
    new Promise((resolve) => window.setTimeout(resolve, MINIMUM_INITIAL_LOADING_MS)),
  ])
  return data
}

function DashboardError({ retry }: { retry: () => void }) {
  return (
    <Card className="p-6" role="alert">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-700" aria-hidden="true" />
        <div>
          <h2 className="font-semibold text-slate-950">Dashboard data could not be loaded</h2>
          <p className="mt-1 text-sm text-slate-600">
            Check your connection and try again. No compliance values have been assumed.
          </p>
          <Button className="mt-4" variant="secondary" onClick={retry}>
            Retry
          </Button>
        </div>
      </div>
    </Card>
  )
}

function periodState(period: DashboardPeriod, today: string) {
  if (period.openDate > today) return 'Not open yet'
  if (period.closeDate < today || period.status === 'CLOSED') return 'Closed'
  return 'Open'
}

export function DashboardPage() {
  const { currentFsp } = useFsp()
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string | null>(null)
  const fspId = currentFsp?.fspId ?? ''
  const relationshipsQuery = useQuery({
    queryKey: dashboardQueryKeys.relationships(fspId),
    queryFn: () => withMinimumInitialLoading(getDashboardRelationships(fspId)),
    enabled: Boolean(fspId),
  })
  const relationships = relationshipsQuery.data ?? []
  const relationship =
    relationships.find((item) => item.id === selectedRelationshipId) ?? relationships[0] ?? null
  const summaryQuery = useQuery({
    queryKey: dashboardQueryKeys.summary(
      fspId,
      relationship?.tenantId ?? '',
      relationship?.id ?? '',
    ),
    queryFn: () => getDashboardSummary(relationship!.tenantId, relationship!.id),
    enabled: Boolean(relationship),
  })
  const today = southAfricanDateKey()

  return (
    <div className="space-y-6">
      {relationships.length > 1 && (
        <div className="flex justify-end">
          <div className="w-full sm:w-72">
            <label
              htmlFor="reporting-relationship"
              className="mb-1 block text-xs font-medium text-slate-600"
            >
              Reporting relationship
            </label>
            <Select
              id="reporting-relationship"
              value={relationship?.id ?? ''}
              onChange={(event) => setSelectedRelationshipId(event.target.value)}
            >
              {relationships.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.tenantName}
                </option>
              ))}
            </Select>
          </div>
        </div>
      )}

      {relationshipsQuery.isPending ? (
        <DashboardSkeleton />
      ) : relationshipsQuery.isError ? (
        <DashboardError retry={() => void relationshipsQuery.refetch()} />
      ) : !relationship ? (
        <EmptyState
          title="No reporting relationship"
          description="This FSP is not linked to an active insurer reporting relationship, so there is no submission period to display."
        />
      ) : summaryQuery.isPending ? (
        <DashboardSkeleton />
      ) : summaryQuery.isError ? (
        <DashboardError retry={() => void summaryQuery.refetch()} />
      ) : summaryQuery.data?.period ? (
        <DashboardContent
          period={summaryQuery.data.period}
          submission={summaryQuery.data.submission}
          previousSubmission={summaryQuery.data.previousSubmission}
          role={currentFsp!.role}
          relationshipId={relationship.id}
          tenantName={relationship.tenantName}
          today={today}
        />
      ) : (
        <EmptyState
          title="No submission period available"
          description={`${relationship.tenantName} has not published a current or upcoming B-BBEE submission period for this FSP.`}
        />
      )}
    </div>
  )
}

function DashboardContent({
  period,
  submission,
  previousSubmission,
  role,
  relationshipId,
  tenantName,
  today,
}: {
  period: DashboardPeriod
  submission: DashboardSubmission | null
  previousSubmission: DashboardSubmission | null
  role: 'ADMIN' | 'SUBMITTER' | 'VIEWER'
  relationshipId: string
  tenantName: string
  today: string
}) {
  const status = submission?.status ?? 'NOT_STARTED'
  const statusView = submissionStatusPresentation[status]
  const action = dashboardAction(submission, period, role, today, relationshipId)
  const statusColour = {
    neutral: 'text-slate-700',
    info: 'text-blue-700',
    warning: 'text-amber-700',
    success: 'text-emerald-700',
    danger: 'text-red-700',
  }[statusView.badge]

  return (
    <div className="space-y-4" aria-busy="false">
      <Card className="border-l-brand-600 border-l-4 p-5 sm:p-6">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{period.name}</h2>
          <h3 className={`mt-2 text-lg font-semibold ${statusColour}`}>{statusView.label}</h3>
          <dl className="mt-5 grid gap-4 text-sm">
            <div>
              <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                Insurer
              </dt>
              <dd className="mt-1 font-semibold text-slate-900">{tenantName}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                Deadline
              </dt>
              <dd className="mt-1 font-semibold text-slate-900">
                {formatDateOnly(period.closeDate)}
              </dd>
            </div>
          </dl>
          <div className="mt-4 flex items-end justify-between gap-4">
            {submission?.submitDate && (
              <dl className="text-sm">
                <div>
                  <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                    Submitted
                  </dt>
                  <dd className="mt-1 font-semibold text-slate-900">
                    {formatTimestamp(submission.submitDate)}
                  </dd>
                </div>
              </dl>
            )}
            <div className="ml-auto flex flex-col items-end">
              {action.href ? (
                <Link className={buttonVariants({ size: 'lg' })} to={action.href}>
                  {action.label}
                </Link>
              ) : (
                <div className="rounded-md border bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {action.label}
                </div>
              )}
              {!hasFspPermission({ role }, 'submissions:edit') && (
                <p className="mt-2 text-xs text-slate-500">Your access is read-only.</p>
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-slate-500">
            <CalendarDays className="size-4" aria-hidden="true" />
            <h3 className="text-xs font-semibold tracking-wide uppercase">Submission period</h3>
          </div>
          <p className="mt-3 font-semibold text-slate-950">{periodState(period, today)}</p>
          <p className="mt-1 text-sm text-slate-600">
            {formatDateOnly(period.openDate)} – {formatDateOnly(period.closeDate)}
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-slate-500">
            {previousSubmission?.status === 'COMPLETED' ? (
              <CheckCircle2 className="size-4" aria-hidden="true" />
            ) : previousSubmission ? (
              <FileText className="size-4" aria-hidden="true" />
            ) : (
              <Clock3 className="size-4" aria-hidden="true" />
            )}
            <h3 className="text-xs font-semibold tracking-wide uppercase">History</h3>
          </div>
          {previousSubmission ? (
            <>
              <p className="mt-3 font-semibold text-slate-950">
                {submissionStatusPresentation[previousSubmission.status].label}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Last updated {formatTimestamp(previousSubmission.updateDate)}
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-600">No earlier submission is available.</p>
          )}
        </Card>
      </div>
    </div>
  )
}
