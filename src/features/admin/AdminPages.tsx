import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Building2,
  CheckCircle2,
  Clock3,
  Download,
  FileCheck2,
  FileText,
  Search,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'

import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Select,
  Skeleton,
  Table,
  Textarea,
  Dialog,
} from '../../components/ui'
import { buttonVariants } from '../../components/ui/buttonVariants'
import { useTenant } from '../tenant/hooks/useTenant'
import { hasTenantPermission } from '../tenant/permissions'
import type { TenantSubmissionStatus } from '../tenant/types'
import { SubmissionHistoryDetail } from '../submissions/components/SubmissionHistoryDetail'
import {
  formatBytes,
  formatDate,
  humanCode,
  preferredFspName,
  routeLabels,
  reviewModeLabels,
  submissionLabels,
} from './lib/presentation'
import {
  adminQueryKeys,
  downloadTenantDocument,
  getTenantDashboard,
  getTenantFsps,
  getTenantPeriods,
  getTenantSubmissionOverview,
  getTenantSubmissions,
  decideSubmissionReview,
  retryAiReview,
} from './services/adminService'
import type { PortfolioFilters, SubmissionFilters } from './types'

const pageSizes = [10, 25, 50] as const

function statusVariant(status: string) {
  if (status === 'COMPLETED' || status === 'ACTIVE' || status === 'AUTHORISED') {
    return 'success' as const
  }
  if (status === 'UNDER_REVIEW' || status === 'SUBMITTED' || status === 'HUMAN_REVIEW_REQUIRED')
    return 'info' as const
  if (status === 'REJECTED' || status === 'SUSPENDED' || status === 'DELINKED')
    return 'danger' as const
  if (status === 'IN_PROGRESS' || status === 'CHANGES_REQUESTED') return 'warning' as const
  return 'neutral' as const
}

function QueryError({ title, retry }: { title: string; retry: () => void }) {
  return (
    <Alert title={title} variant="danger">
      <p>The information remains unavailable and no values have been assumed.</p>
      <Button size="sm" variant="secondary" className="mt-3" onClick={retry}>
        Retry
      </Button>
    </Alert>
  )
}

function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-64 w-full" />
      <span className="sr-only" role="status">
        Loading insurer information…
      </span>
    </div>
  )
}

function MetricCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <p className="text-sm">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-950">{value.toLocaleString('en-ZA')}</p>
    </Card>
  )
}

export function AdminDashboardPage() {
  const { currentTenant } = useTenant()
  const tenantId = currentTenant!.tenantId
  const dashboard = useQuery({
    queryKey: adminQueryKeys.dashboard(tenantId),
    queryFn: () => getTenantDashboard(tenantId),
  })
  const recent = useQuery({
    queryKey: adminQueryKeys.recent(tenantId),
    queryFn: () =>
      getTenantSubmissions(tenantId, {
        search: '',
        work: 'ALL',
        reviewMode: '',
        route: '',
        periodId: null,
        sort: 'submit_date',
        direction: 'desc',
        page: 1,
        pageSize: 10,
      }),
  })
  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" />
      {dashboard.isPending ? (
        <PageSkeleton />
      ) : dashboard.isError ? (
        <QueryError
          title="Dashboard metrics could not be loaded"
          retry={() => void dashboard.refetch()}
        />
      ) : (
        <>
          {dashboard.data.period ? (
            <Card className="border-l-brand-600 border-l-4 p-5">
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Current open period
              </p>
              <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold">{dashboard.data.period.name}</h2>
                <span className="text-sm text-slate-600">
                  {formatDate(dashboard.data.period.openDate)} –{' '}
                  {formatDate(dashboard.data.period.closeDate)}
                </span>
              </div>
            </Card>
          ) : (
            <Alert title="No open submission period">
              Portfolio totals are available, but submission metrics require an open period.
            </Alert>
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              icon={<Building2 className="size-4" />}
              label="Total FSPs"
              value={dashboard.data.totalFsps}
            />
            <MetricCard
              icon={<FileCheck2 className="size-4" />}
              label="Submitted"
              value={dashboard.data.submittedFsps}
            />
            <MetricCard
              icon={<Clock3 className="size-4" />}
              label="Outstanding"
              value={dashboard.data.outstandingFsps}
            />
            <MetricCard
              icon={<FileText className="size-4" />}
              label="Under review"
              value={dashboard.data.underReviewSubmissions}
            />
            <MetricCard
              icon={<CheckCircle2 className="size-4" />}
              label="Completed"
              value={dashboard.data.completedSubmissions}
            />
          </div>
        </>
      )}
      <section className="space-y-3" aria-labelledby="recent-submissions-title">
        <div className="flex items-center justify-between gap-3">
          <h2 id="recent-submissions-title" className="font-semibold">
            Recent submissions
          </h2>
          <Link
            to="/admin/submissions"
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            View queue
          </Link>
        </div>
        {recent.isPending ? (
          <Skeleton className="h-44 w-full" />
        ) : recent.isError ? (
          <QueryError
            title="Recent submissions could not be loaded"
            retry={() => void recent.refetch()}
          />
        ) : recent.data.items.length ? (
          <SubmissionTable items={recent.data.items.slice(0, 5)} />
        ) : (
          <EmptyState
            title="No submissions yet"
            description="No FSP has started a submission for the current open period."
          />
        )}
      </section>
    </div>
  )
}

function numberParam(value: string | null, fallback: number) {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 ? number : fallback
}
function pageSizeParam(value: string | null): 10 | 25 | 50 {
  const number = Number(value)
  return pageSizes.includes(number as 10 | 25 | 50) ? (number as 10 | 25 | 50) : 25
}

function SortButton({
  label,
  active,
  direction,
  onClick,
}: {
  label: string
  active: boolean
  direction: 'asc' | 'desc'
  onClick: () => void
}) {
  return (
    <button
      className="inline-flex items-center gap-1 font-semibold hover:text-slate-950"
      onClick={onClick}
    >
      {label}
      {active ? (
        direction === 'asc' ? (
          <ArrowUp className="size-3" />
        ) : (
          <ArrowDown className="size-3" />
        )
      ) : null}
    </button>
  )
}

function Pager({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
  page: number
  pageSize: 10 | 25 | 50
  total: number
  onPage: (page: number) => void
  onPageSize: (size: 10 | 25 | 50) => void
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  return (
    <div className="flex flex-col items-start justify-between gap-3 text-sm sm:flex-row sm:items-center">
      <p className="text-slate-600">
        {total
          ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`
          : '0 results'}
      </p>
      <div className="flex items-center gap-2">
        <label htmlFor="page-size" className="text-slate-600">
          Rows
        </label>
        <Select
          id="page-size"
          className="h-8 w-20"
          value={pageSize}
          onChange={(event) => onPageSize(Number(event.target.value) as 10 | 25 | 50)}
        >
          {pageSizes.map((size) => (
            <option key={size}>{size}</option>
          ))}
        </Select>
        <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <span aria-live="polite">
          Page {Math.min(page, pages)} of {pages}
        </span>
        <Button
          size="sm"
          variant="secondary"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

export function AdminFspPortfolioPage() {
  const { currentTenant } = useTenant()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('q') ?? '')
  const filters: PortfolioFilters = {
    search: params.get('q') ?? '',
    submissionStatus: params.get('submission') ?? '',
    regulatoryStatus: params.get('regulatory') ?? '',
    relationshipStatus: params.get('relationship') ?? 'ACTIVE',
    sort: (['name', 'fsp_number', 'submission_status', 'submit_date'].includes(
      params.get('sort') ?? '',
    )
      ? params.get('sort')
      : 'name') as PortfolioFilters['sort'],
    direction: params.get('direction') === 'desc' ? 'desc' : 'asc',
    page: numberParam(params.get('page'), 1),
    pageSize: pageSizeParam(params.get('pageSize')),
  }
  function update(values: Record<string, string | number | null>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(values)) {
      if (value === '' || value === null) next.delete(key)
      else next.set(key, String(value))
    }
    setParams(next)
  }
  function sort(field: PortfolioFilters['sort']) {
    update({
      sort: field,
      direction: filters.sort === field && filters.direction === 'asc' ? 'desc' : 'asc',
      page: 1,
    })
  }
  const query = useQuery({
    queryKey: adminQueryKeys.fsps(currentTenant!.tenantId, filters),
    queryFn: () => getTenantFsps(currentTenant!.tenantId, filters),
  })
  return (
    <div className="space-y-6">
      <PageHeader title="FSPs" />
      <Card className="p-4">
        <form
          className="grid gap-3 lg:grid-cols-[minmax(14rem,1fr)_repeat(3,minmax(10rem,auto))]"
          onSubmit={(event) => {
            event.preventDefault()
            update({ q: search.trim(), page: 1 })
          }}
        >
          <label className="relative">
            <span className="sr-only">Search FSPs</span>
            <Search className="absolute top-2.5 left-3 size-4 text-slate-400" />
            <Input
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search FSP name, number or reference"
            />
          </label>
          <label>
            <span className="sr-only">Submission status</span>
            <Select
              value={filters.submissionStatus}
              onChange={(event) => update({ submission: event.target.value, page: 1 })}
            >
              <option value="">All submission statuses</option>
              {[
                'OUTSTANDING',
                'NOT_STARTED',
                'IN_PROGRESS',
                'SUBMITTED',
                'UNDER_REVIEW',
                'COMPLETED',
                'REJECTED',
              ].map((value) => (
                <option key={value} value={value}>
                  {submissionLabels[value]}
                </option>
              ))}
            </Select>
          </label>
          <label>
            <span className="sr-only">Regulatory status</span>
            <Select
              value={filters.regulatoryStatus}
              onChange={(event) => update({ regulatory: event.target.value, page: 1 })}
            >
              <option value="">All regulatory statuses</option>
              {['AUTHORISED', 'LAPSED', 'WITHDRAWN', 'SUSPENDED'].map((value) => (
                <option key={value} value={value}>
                  {humanCode(value)}
                </option>
              ))}
            </Select>
          </label>
          <label>
            <span className="sr-only">Relationship status</span>
            <Select
              value={filters.relationshipStatus}
              onChange={(event) => update({ relationship: event.target.value, page: 1 })}
            >
              <option value="">All relationships</option>
              {['ACTIVE', 'SUSPENDED', 'DELINKED'].map((value) => (
                <option key={value} value={value}>
                  {humanCode(value)}
                </option>
              ))}
            </Select>
          </label>
        </form>
      </Card>
      {query.isPending ? (
        <PageSkeleton />
      ) : query.isError ? (
        <QueryError title="FSP portfolio could not be loaded" retry={() => void query.refetch()} />
      ) : query.data.items.length ? (
        <div className="space-y-4">
          <Table>
            <thead className="border-b bg-slate-50 text-xs tracking-wide text-slate-600 uppercase">
              <tr>
                <th
                  className="px-4 py-3"
                  aria-sort={
                    filters.sort === 'name'
                      ? filters.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                >
                  <SortButton
                    label="FSP"
                    active={filters.sort === 'name'}
                    direction={filters.direction}
                    onClick={() => sort('name')}
                  />
                </th>
                <th
                  className="px-4 py-3"
                  aria-sort={
                    filters.sort === 'fsp_number'
                      ? filters.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                >
                  <SortButton
                    label="FSP number"
                    active={filters.sort === 'fsp_number'}
                    direction={filters.direction}
                    onClick={() => sort('fsp_number')}
                  />
                </th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Regulatory</th>
                <th className="px-4 py-3">Relationship</th>
                <th
                  className="px-4 py-3"
                  aria-sort={
                    filters.sort === 'submission_status'
                      ? filters.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                >
                  <SortButton
                    label="Submission"
                    active={filters.sort === 'submission_status'}
                    direction={filters.direction}
                    onClick={() => sort('submission_status')}
                  />
                </th>
                <th
                  className="px-4 py-3"
                  aria-sort={
                    filters.sort === 'submit_date'
                      ? filters.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                >
                  <SortButton
                    label="Submitted"
                    active={filters.sort === 'submit_date'}
                    direction={filters.direction}
                    onClick={() => sort('submit_date')}
                  />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {query.data.items.map((item) => (
                <tr key={item.tenantFspId} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">
                    {preferredFspName(item.tradeName, item.registeredName)}
                  </td>
                  <td className="px-4 py-3">{item.fspNumber}</td>
                  <td className="px-4 py-3 text-slate-600">{item.brokerReference ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(item.regulatoryStatus ?? '')}>
                      {humanCode(item.regulatoryStatus)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(item.relationshipStatus)}>
                      {humanCode(item.relationshipStatus)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {item.submissionId ? (
                      <Link
                        className="font-medium text-blue-700 hover:underline"
                        to={`/admin/submissions/${item.submissionId}`}
                      >
                        <Badge variant={statusVariant(item.submissionStatus)}>
                          {submissionLabels[item.submissionStatus]}
                        </Badge>
                      </Link>
                    ) : (
                      <Badge>{submissionLabels[item.submissionStatus]}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(item.submitDate)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pager
            page={filters.page}
            pageSize={filters.pageSize}
            total={query.data.total}
            onPage={(page) => update({ page })}
            onPageSize={(pageSize) => update({ pageSize, page: 1 })}
          />
        </div>
      ) : (
        <EmptyState
          title="No FSPs match these filters"
          description="Adjust the search or filters to see this insurer's linked FSPs."
        />
      )}
    </div>
  )
}

type SubmissionTableItem = {
  submissionId: string
  fspNumber: string
  tradeName: string | null
  registeredName: string
  brokerReference: string | null
  periodName: string
  route: 'CERTIFICATE' | 'AFFIDAVIT' | null
  status: Exclude<TenantSubmissionStatus, 'OUTSTANDING'>
  reviewMode?: 'AUTOMATIC_ACCEPTANCE' | 'HUMAN_REVIEW' | 'AI_REVIEW'
  submitDate: string | null
}
function SubmissionTable({
  items,
  sort,
  direction = 'desc',
  onSort,
}: {
  items: SubmissionTableItem[]
  sort?: SubmissionFilters['sort']
  direction?: 'asc' | 'desc'
  onSort?: (field: SubmissionFilters['sort']) => void
}) {
  return (
    <Table>
      <thead className="border-b bg-slate-50 text-xs tracking-wide text-slate-600 uppercase">
        <tr>
          <th
            className="px-4 py-3"
            aria-sort={
              sort === 'fsp' ? (direction === 'asc' ? 'ascending' : 'descending') : undefined
            }
          >
            {onSort ? (
              <SortButton
                label="FSP"
                active={sort === 'fsp'}
                direction={direction}
                onClick={() => onSort('fsp')}
              />
            ) : (
              'FSP'
            )}
          </th>
          <th className="px-4 py-3">Reference</th>
          <th className="px-4 py-3">Period</th>
          <th className="px-4 py-3">Route</th>
          <th className="px-4 py-3">Review method</th>
          <th
            className="px-4 py-3"
            aria-sort={
              sort === 'status' ? (direction === 'asc' ? 'ascending' : 'descending') : undefined
            }
          >
            {onSort ? (
              <SortButton
                label="Status"
                active={sort === 'status'}
                direction={direction}
                onClick={() => onSort('status')}
              />
            ) : (
              'Status'
            )}
          </th>
          <th
            className="px-4 py-3"
            aria-sort={
              sort === 'submit_date'
                ? direction === 'asc'
                  ? 'ascending'
                  : 'descending'
                : undefined
            }
          >
            {onSort ? (
              <SortButton
                label="Submitted"
                active={sort === 'submit_date'}
                direction={direction}
                onClick={() => onSort('submit_date')}
              />
            ) : (
              'Submitted'
            )}
          </th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {items.map((item) => (
          <tr key={item.submissionId} className="hover:bg-slate-50">
            <td className="px-4 py-3">
              <Link
                className="font-medium text-blue-700 hover:underline"
                to={`/admin/submissions/${item.submissionId}`}
              >
                {preferredFspName(item.tradeName, item.registeredName)}
              </Link>
              <span className="block text-xs text-slate-500">FSP {item.fspNumber}</span>
            </td>
            <td className="px-4 py-3 text-slate-600">{item.brokerReference ?? '—'}</td>
            <td className="px-4 py-3">{item.periodName}</td>
            <td className="px-4 py-3">{item.route ? routeLabels[item.route] : '—'}</td>
            <td className="px-4 py-3">
              {item.reviewMode ? reviewModeLabels[item.reviewMode] : '—'}
            </td>
            <td className="px-4 py-3">
              <Badge variant={statusVariant(item.status)}>{submissionLabels[item.status]}</Badge>
            </td>
            <td className="px-4 py-3 text-slate-600">{formatDate(item.submitDate)}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}

export function AdminSubmissionQueuePage() {
  const { currentTenant } = useTenant()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('q') ?? '')
  const filters: SubmissionFilters = {
    search: params.get('q') ?? '',
    work: params.get('work') ?? 'NEEDS_REVIEW',
    reviewMode: params.get('reviewMode') ?? '',
    route: params.get('route') ?? '',
    periodId: params.get('period'),
    sort: (['submit_date', 'fsp', 'status'].includes(params.get('sort') ?? '')
      ? params.get('sort')
      : 'submit_date') as SubmissionFilters['sort'],
    direction: params.get('direction') === 'asc' ? 'asc' : 'desc',
    page: numberParam(params.get('page'), 1),
    pageSize: pageSizeParam(params.get('pageSize')),
  }
  function update(values: Record<string, string | number | null>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(values)) {
      if (value === '' || value === null) next.delete(key)
      else next.set(key, String(value))
    }
    setParams(next)
  }
  function sort(field: SubmissionFilters['sort']) {
    update({
      sort: field,
      direction: filters.sort === field && filters.direction === 'asc' ? 'desc' : 'asc',
      page: 1,
    })
  }
  const periods = useQuery({
    queryKey: adminQueryKeys.periods(currentTenant!.tenantId),
    queryFn: () => getTenantPeriods(currentTenant!.tenantId),
  })
  const query = useQuery({
    queryKey: adminQueryKeys.submissions(currentTenant!.tenantId, filters),
    queryFn: () => getTenantSubmissions(currentTenant!.tenantId, filters),
  })
  return (
    <div className="space-y-6">
      <PageHeader title="Submissions" />
      <Card className="p-4">
        <form
          className="grid gap-3 lg:grid-cols-[minmax(14rem,1fr)_repeat(4,minmax(10rem,auto))]"
          onSubmit={(event) => {
            event.preventDefault()
            update({ q: search.trim(), page: 1 })
          }}
        >
          <label className="relative">
            <span className="sr-only">Search submissions</span>
            <Search className="absolute top-2.5 left-3 size-4 text-slate-400" />
            <Input
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search FSP name, number or reference"
            />
          </label>
          <label>
            <span className="sr-only">Period</span>
            <Select
              value={filters.periodId ?? ''}
              disabled={periods.isPending || periods.isError}
              onChange={(event) => update({ period: event.target.value, page: 1 })}
            >
              <option value="">Current open period</option>
              {periods.data?.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.name}
                </option>
              ))}
            </Select>
          </label>
          <label>
            <span className="sr-only">Work queue</span>
            <Select
              value={filters.work}
              onChange={(event) => update({ work: event.target.value, page: 1 })}
            >
              <option value="NEEDS_REVIEW">Needs review</option>
              <option value="AI_ESCALATED">AI escalated</option>
              <option value="CHANGES_REQUESTED">Changes requested</option>
              <option value="COMPLETE">Complete</option>
              <option value="REJECTED">Rejected</option>
              <option value="ALL">All submissions</option>
            </Select>
          </label>
          <label>
            <span className="sr-only">Review method</span>
            <Select
              value={filters.reviewMode}
              onChange={(event) => update({ reviewMode: event.target.value, page: 1 })}
            >
              <option value="">All review methods</option>
              {Object.entries(reviewModeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </label>
          <label>
            <span className="sr-only">Route</span>
            <Select
              value={filters.route}
              onChange={(event) => update({ route: event.target.value, page: 1 })}
            >
              <option value="">All routes</option>
              <option value="CERTIFICATE">Certificate</option>
              <option value="AFFIDAVIT">Affidavit</option>
            </Select>
          </label>
        </form>
      </Card>
      {periods.isError && (
        <Alert title="Period list could not be loaded" variant="danger">
          The queue can still show the current open period.
        </Alert>
      )}
      {query.isPending ? (
        <PageSkeleton />
      ) : query.isError ? (
        <QueryError
          title="Submission queue could not be loaded"
          retry={() => void query.refetch()}
        />
      ) : query.data.items.length ? (
        <div className="space-y-4">
          <SubmissionTable
            items={query.data.items}
            sort={filters.sort}
            direction={filters.direction}
            onSort={sort}
          />
          <Pager
            page={filters.page}
            pageSize={filters.pageSize}
            total={query.data.total}
            onPage={(page) => update({ page })}
            onPageSize={(pageSize) => update({ pageSize, page: 1 })}
          />
        </div>
      ) : (
        <EmptyState
          title="No submissions match these filters"
          description="Adjust the period, search, or filters to find a submission."
        />
      )}
    </div>
  )
}

export function AdminSubmissionOverviewPage() {
  const { currentTenant } = useTenant()
  const { submissionId = '' } = useParams()
  const queryClient = useQueryClient()
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [decision, setDecision] = useState<'COMPLETE' | 'CHANGES_REQUESTED' | 'REJECTED' | null>(
    null,
  )
  const [reason, setReason] = useState('')
  const query = useQuery({
    queryKey: adminQueryKeys.submission(currentTenant!.tenantId, submissionId),
    queryFn: () => getTenantSubmissionOverview(currentTenant!.tenantId, submissionId),
    enabled: Boolean(submissionId),
    retry: false,
  })
  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (!decision || !query.data) throw new Error('Choose a review decision.')
      if (decision !== 'COMPLETE' && reason.trim().length < 5)
        throw new Error('Enter a meaningful reason of at least 5 characters.')
      return decideSubmissionReview(submissionId, decision, reason.trim(), query.data.status)
    },
    onSuccess: async () => {
      setDecision(null)
      setReason('')
      await queryClient.invalidateQueries({
        queryKey: adminQueryKeys.submission(currentTenant!.tenantId, submissionId),
      })
      await queryClient.invalidateQueries({
        queryKey: ['tenant-submissions', currentTenant!.tenantId],
      })
      await queryClient.invalidateQueries({
        queryKey: adminQueryKeys.dashboard(currentTenant!.tenantId),
      })
    },
  })
  const retryMutation = useMutation({
    mutationFn: () => retryAiReview(submissionId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.submission(currentTenant!.tenantId, submissionId),
      }),
  })
  if (query.isPending) return <PageSkeleton />
  if (query.isError)
    return (
      <div className="space-y-6">
        <Link className={buttonVariants({ variant: 'ghost', size: 'sm' })} to="/admin/submissions">
          <ArrowLeft className="size-4" /> Back to submissions
        </Link>
        <QueryError
          title="Submission could not be found or accessed"
          retry={() => void query.refetch()}
        />
      </div>
    )
  const submission = query.data
  const reviewsByAttempt = new Map<number, typeof submission.reviews>()
  for (const review of submission.reviews) {
    const group = reviewsByAttempt.get(review.attemptNumber) ?? []
    group.push(review)
    reviewsByAttempt.set(review.attemptNumber, group)
  }
  async function download(documentId: string, filename: string) {
    setDownloadError(null)
    setDownloading(documentId)
    try {
      await downloadTenantDocument(currentTenant!.tenantId, submissionId, documentId, filename)
    } catch {
      setDownloadError('The document could not be downloaded. Please try again.')
    } finally {
      setDownloading(null)
    }
  }
  return (
    <div className="space-y-6">
      <Link className={buttonVariants({ variant: 'ghost', size: 'sm' })} to="/admin/submissions">
        <ArrowLeft className="size-4" /> Back to submissions
      </Link>
      <PageHeader
        title="Submission"
        action={
          <Badge variant={statusVariant(submission.status)}>
            {submissionLabels[submission.status] ?? humanCode(submission.status)}
          </Badge>
        }
      />
      <Card className="p-5">
        <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs font-semibold text-slate-500 uppercase">FSP</dt>
            <dd className="mt-1">{submission.fspName}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500 uppercase">FSP number</dt>
            <dd className="mt-1">{submission.fspNumber}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500 uppercase">Broker reference</dt>
            <dd className="mt-1">{submission.brokerReference ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500 uppercase">Period</dt>
            <dd className="mt-1">{submission.period.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500 uppercase">Route</dt>
            <dd className="mt-1">{submission.route ? routeLabels[submission.route] : '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500 uppercase">Review method</dt>
            <dd className="mt-1">{reviewModeLabels[submission.reviewMode]}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500 uppercase">Questionnaire</dt>
            <dd className="mt-1">
              {submission.questionnaire.name} · version {submission.questionnaire.version}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500 uppercase">Started</dt>
            <dd className="mt-1">{formatDate(submission.startDate)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500 uppercase">Submitted</dt>
            <dd className="mt-1">{formatDate(submission.submitDate)}</dd>
          </div>
        </dl>
      </Card>
      {(submission.status === 'UNDER_REVIEW' || submission.status === 'HUMAN_REVIEW_REQUIRED') && (
        <Card className="sticky top-4 z-10 border-blue-200 bg-blue-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold">Review decision</h2>
              <p className="mt-1 text-sm text-slate-600">
                Actions are atomic and apply to attempt{' '}
                {submission.reviews[0]?.attemptNumber ?? '—'}.
              </p>
            </div>
            {hasTenantPermission(currentTenant, 'submissions:review') ? (
              <div className="flex flex-wrap gap-2">
                {hasTenantPermission(currentTenant, 'submissions:complete-review') && (
                  <Button onClick={() => setDecision('COMPLETE')}>Mark complete</Button>
                )}
                {hasTenantPermission(currentTenant, 'submissions:request-changes') && (
                  <Button variant="secondary" onClick={() => setDecision('CHANGES_REQUESTED')}>
                    Request changes
                  </Button>
                )}
                {hasTenantPermission(currentTenant, 'submissions:reject') && (
                  <Button variant="danger" onClick={() => setDecision('REJECTED')}>
                    Reject
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-600">You have read-only review access.</p>
            )}
          </div>
        </Card>
      )}
      {submission.reviewMode !== 'AI_REVIEW' && submission.reviews.length > 0 && (
        <Card className="p-5">
          <h2 className="font-semibold">Review history</h2>
          <div className="mt-4 space-y-4">
            {[...reviewsByAttempt.entries()].map(([attemptNumber, reviews]) => (
              <section key={attemptNumber} className="rounded-md border p-4">
                <h3 className="text-sm font-semibold">
                  {attemptNumber === 1
                    ? 'Original submission'
                    : `Resubmission ${attemptNumber - 1}`}
                </h3>
                <div className="mt-3 space-y-4">
                  {reviews.map((review, index) => (
                    <div key={review.id ?? `${attemptNumber}-${index}`} className="text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{review.type ? humanCode(review.type) : 'Pending'}</Badge>
                        {review.outcome && (
                          <Badge
                            variant={
                              review.outcome === 'REJECTED'
                                ? 'danger'
                                : review.outcome === 'COMPLETE'
                                  ? 'success'
                                  : 'warning'
                            }
                          >
                            {humanCode(review.outcome)}
                          </Badge>
                        )}
                      </div>
                      {review.summary && <p className="mt-2 text-slate-700">{review.summary}</p>}
                      {(review.reviewerName || review.completeDate) && (
                        <p className="mt-2 text-xs text-slate-500">
                          {review.reviewerName
                            ? `Reviewed by ${review.reviewerName}`
                            : 'System review'}
                          {review.completeDate ? ` · ${formatDate(review.completeDate)}` : ''}
                        </p>
                      )}
                      {submission.findings
                        .filter((finding) => finding.reviewId === review.id)
                        .map((finding) => (
                          <div key={finding.id} className="mt-3 rounded-md bg-slate-50 p-3">
                            <p className="font-medium">{finding.title}</p>
                            <p className="mt-1 text-slate-600">{finding.description}</p>
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </Card>
      )}
      {submission.reviewMode === 'AI_REVIEW' && (
        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold">AI review</h2>
              <p className="mt-1 text-sm text-slate-600">
                Structured review output only. No hidden reasoning or chain-of-thought is displayed.
              </p>
            </div>
            {submission.reviews[0]?.status === 'FAILED' &&
              hasTenantPermission(currentTenant, 'submissions:review') && (
                <Button
                  variant="secondary"
                  disabled={retryMutation.isPending}
                  onClick={() => retryMutation.mutate()}
                >
                  {retryMutation.isPending ? 'Queuing…' : 'Retry AI review'}
                </Button>
              )}
          </div>
          {retryMutation.isError && (
            <div className="mt-4">
              <Alert variant="danger" title="Retry failed">
                {retryMutation.error.message}
              </Alert>
            </div>
          )}
          {submission.reviews[0]?.summary && (
            <p className="mt-4 text-sm text-slate-700">{submission.reviews[0].summary}</p>
          )}
          <div className="mt-4 space-y-3">
            {submission.findings.length ? (
              submission.findings.map((finding) => (
                <div key={finding.id} className="rounded-md border bg-white p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        finding.severity === 'BLOCKING'
                          ? 'danger'
                          : finding.severity === 'WARNING'
                            ? 'warning'
                            : 'neutral'
                      }
                    >
                      {humanCode(finding.severity)}
                    </Badge>
                    <Badge>{humanCode(finding.source)}</Badge>
                    <span className="font-medium">{finding.title}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{finding.description}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No findings were recorded.</p>
            )}
          </div>
        </Card>
      )}
      <SubmissionHistoryDetail
        scope="tenant"
        scopeId={currentTenant!.tenantId}
        submissionId={submissionId}
        showAudit
      />
      {(submission.status === 'IN_PROGRESS' || submission.status === 'NOT_STARTED') && (
        <section className="space-y-4" aria-labelledby="draft-responses-title">
          <h2 id="draft-responses-title" className="text-lg font-semibold">
            Current draft responses
          </h2>
          {submission.sections.length ? (
            submission.sections.map((section) => (
              <Card key={section.id} className="overflow-hidden">
                <h3 className="border-b bg-slate-50 px-5 py-3 font-semibold">{section.title}</h3>
                <dl className="divide-y">
                  {section.responses.map((response) => (
                    <div
                      key={response.id}
                      className="grid gap-1 px-5 py-4 md:grid-cols-[minmax(12rem,2fr)_3fr]"
                    >
                      <dt className="text-sm font-medium text-slate-700">{response.label}</dt>
                      <dd className="text-sm whitespace-pre-wrap text-slate-950">
                        {response.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Card>
            ))
          ) : (
            <EmptyState
              title="No responses recorded"
              description="This draft does not contain any saved questionnaire answers."
            />
          )}
          {downloadError && (
            <Alert title="Download failed" variant="danger">
              {downloadError}
            </Alert>
          )}
          {submission.documents.map((document) => (
            <Card
              key={document.id}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div>
                <p className="font-medium">{document.filename}</p>
                <p className="text-xs text-slate-500">
                  {formatBytes(document.sizeBytes)} · {formatDate(document.uploadDate)}
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                disabled={downloading === document.id}
                onClick={() => void download(document.id, document.filename)}
              >
                <Download className="size-4" />
                {downloading === document.id ? 'Downloading…' : 'Download'}
              </Button>
            </Card>
          ))}
        </section>
      )}
      <Dialog
        open={Boolean(decision)}
        title="Confirm review decision"
        onClose={() => !reviewMutation.isPending && setDecision(null)}
      >
        <dl className="grid gap-2 text-sm">
          <div>
            <dt className="font-medium">FSP</dt>
            <dd>
              {submission.fspName} · {submission.fspNumber}
            </dd>
          </div>
          <div>
            <dt className="font-medium">Period</dt>
            <dd>{submission.period.name}</dd>
          </div>
          <div>
            <dt className="font-medium">Current status</dt>
            <dd>{submissionLabels[submission.status] ?? humanCode(submission.status)}</dd>
          </div>
          <div>
            <dt className="font-medium">Result</dt>
            <dd>{decision ? (submissionLabels[decision] ?? humanCode(decision)) : '—'}</dd>
          </div>
        </dl>
        <label className="mt-4 block text-sm font-medium" htmlFor="review-reason">
          {decision === 'COMPLETE' ? 'Reviewer note (optional)' : 'Reason (required)'}
        </label>
        <Textarea
          id="review-reason"
          className="mt-2"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={4000}
        />
        {reviewMutation.isError && (
          <div className="mt-4">
            <Alert variant="danger" title="Decision not saved">
              {reviewMutation.error.message}
            </Alert>
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="secondary"
            disabled={reviewMutation.isPending}
            onClick={() => setDecision(null)}
          >
            Cancel
          </Button>
          <Button
            variant={decision === 'REJECTED' ? 'danger' : 'primary'}
            disabled={
              reviewMutation.isPending || (decision !== 'COMPLETE' && reason.trim().length < 5)
            }
            onClick={() => reviewMutation.mutate()}
          >
            {reviewMutation.isPending ? 'Saving…' : 'Confirm decision'}
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
