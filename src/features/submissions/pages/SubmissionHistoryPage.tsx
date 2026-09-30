import { useQuery } from '@tanstack/react-query'
import { Eye } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Select,
  Skeleton,
  Table,
} from '../../../components/ui'
import { buttonVariants } from '../../../components/ui/buttonVariants'
import { useFsp } from '../../onboarding/hooks/useFsp'
import {
  formatTimestamp,
  submissionStatusPresentation,
} from '../../dashboard/lib/dashboardPresentation'
import {
  listFspSubmissionHistory,
  submissionHistoryQueryKeys,
} from '../services/submissionHistoryService'

function humanCode(value: string | null) {
  return value
    ? value
        .toLowerCase()
        .replaceAll('_', ' ')
        .replace(/^./, (letter) => letter.toUpperCase())
    : '—'
}

export function SubmissionHistoryPage() {
  const { currentFsp } = useFsp()
  const [params, setParams] = useSearchParams()
  const period = params.get('period') ?? ''
  const status = params.get('status') ?? ''
  const query = useQuery({
    queryKey: submissionHistoryQueryKeys.list(currentFsp?.fspId ?? '', period, status),
    queryFn: () => listFspSubmissionHistory(currentFsp!.fspId, period, status),
    enabled: Boolean(currentFsp),
    retry: false,
  })
  const allPeriods = useQuery({
    queryKey: submissionHistoryQueryKeys.list(currentFsp?.fspId ?? '', '', ''),
    queryFn: () => listFspSubmissionHistory(currentFsp!.fspId, '', ''),
    enabled: Boolean(currentFsp),
    retry: false,
  })
  const periods = [
    ...new Map((allPeriods.data ?? query.data ?? []).map((item) => [item.periodId, item])).values(),
  ]

  function update(key: 'period' | 'status', value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Period
            <Select
              className="mt-1"
              value={period}
              onChange={(event) => update('period', event.target.value)}
            >
              <option value="">All periods</option>
              {periods.map((item) => (
                <option key={item.periodId} value={item.periodId}>
                  {item.periodName}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Status
            <Select
              className="mt-1"
              value={status}
              onChange={(event) => update('status', event.target.value)}
            >
              <option value="">All statuses</option>
              {Object.entries(submissionStatusPresentation).map(([value, presentation]) => (
                <option key={value} value={value}>
                  {presentation.label}
                </option>
              ))}
            </Select>
          </label>
        </div>
      </Card>
      {query.isPending ? (
        <Card className="space-y-3 p-5">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </Card>
      ) : query.isError ? (
        <Alert title="Submission history could not be loaded" variant="danger">
          <Button
            className="mt-3"
            variant="secondary"
            size="sm"
            onClick={() => void query.refetch()}
          >
            Retry
          </Button>
        </Alert>
      ) : query.data.length ? (
        <Table>
          <thead>
            <tr className="border-b bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3">Insurer</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Route</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Completed</th>
              <th className="px-4 py-3">Review method</th>
              <th className="px-4 py-3">
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {query.data.map((item) => {
              const presentation =
                submissionStatusPresentation[
                  item.status as keyof typeof submissionStatusPresentation
                ]
              return (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-medium">{item.periodName}</td>
                  <td className="px-4 py-3 text-slate-600">{item.tenantName}</td>
                  <td className="px-4 py-3">
                    <Badge variant={presentation?.badge}>
                      {presentation?.label ?? humanCode(item.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{humanCode(item.route)}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {item.submitDate ? formatTimestamp(item.submitDate) : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {item.completedDate ? formatTimestamp(item.completedDate) : '—'}
                  </td>
                  <td className="px-4 py-3">{humanCode(item.reviewMode)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                      to={`/app/submissions/${item.id}`}
                    >
                      <Eye className="size-4" /> View
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      ) : (
        <EmptyState
          title="No submissions found"
          description="Submission records will appear here once a reporting period is available."
        />
      )}
    </div>
  )
}
