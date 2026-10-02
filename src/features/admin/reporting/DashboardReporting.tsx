import { useMutation, useQuery } from '@tanstack/react-query'
import {
  CheckCircle2,
  Clock3,
  Download,
  FileCheck2,
  FileText,
  Mail,
  Maximize2,
  LoaderCircle,
  Search,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Alert, Button, Card, Dialog, Input, Select, Skeleton, Table } from '../../../components/ui'
import type { TenantDashboardMetrics } from '../../tenant/types'
import { useTenant } from '../../tenant/hooks/useTenant'
import {
  historyData,
  monthLabel,
  portfolioCell,
  portfolioColumns,
  reportSeries,
  reportTitles,
  type ReportKind,
  type ReportSeries,
  type ReportingWindow,
  type TenantReporting,
} from './model'
import { downloadReport, emailReport, getTenantReporting } from './service'

function Bars({
  series,
  total,
  onExpand,
}: {
  series: ReportSeries[]
  total: number
  onExpand?: () => void
}) {
  const bars = (
    <div className="space-y-4">
      {series.map((item) => (
        <div key={item.label} className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-600">{item.label}</span>
            <span className="font-semibold text-slate-950 tabular-nums">
              {item.value.toLocaleString('en-ZA')}{' '}
              <span className="font-normal text-slate-400">
                {total ? `${Math.round((item.value / total) * 100)}%` : '0%'}
              </span>
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-[width] motion-reduce:transition-none"
              style={{
                width: `${total ? (item.value / total) * 100 : 0}%`,
                backgroundColor: item.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
  return onExpand ? (
    <button
      type="button"
      onClick={onExpand}
      className="w-full rounded text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-600"
      aria-label="Expand graph and monthly data"
    >
      {bars}
    </button>
  ) : (
    bars
  )
}

function HistoryGraph({
  report,
  kind,
}: {
  report: TenantReporting
  kind: Exclude<ReportKind, 'fsps'>
}) {
  const history = historyData(kind, report)
  const max = Math.max(
    1,
    ...history.rows.flatMap((row) =>
      row.values.flatMap((value) => (value === null ? [] : [value])),
    ),
  )
  const colors = new Map(
    reportSeries(kind, report.portfolio, report.asOf, history.labels).map((item) => [
      item.label,
      item.color,
    ]),
  )
  return (
    <div
      className="space-y-4"
      role="img"
      aria-label={`${reportTitles[kind]} over the previous 12 months. Exact figures follow in the table.`}
    >
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">
        {history.labels.map((label) => (
          <span key={label} className="flex items-center gap-2">
            <span className="size-2.5 rounded-sm" style={{ backgroundColor: colors.get(label) }} />
            {label}
          </span>
        ))}
      </div>
      <div className="space-y-3">
        {history.rows.map((month) => (
          <div key={month.month} className="grid grid-cols-[5.5rem_1fr] items-center gap-3">
            <span className="text-xs text-slate-500">{month.month}</span>
            {month.total === null ? (
              <div className="rounded bg-slate-50 px-3 py-1 text-xs text-slate-400">
                No recorded snapshot
              </div>
            ) : (
              <div className="space-y-1">
                {month.values.map((value, i) => (
                  <div key={history.labels[i]} className="flex h-3.5 items-center gap-2">
                    <div
                      className="h-full rounded-sm"
                      style={{
                        width: `${((value ?? 0) / max) * 85}%`,
                        backgroundColor: colors.get(history.labels[i]!),
                      }}
                    />
                    <span className="text-[10px] text-slate-500 tabular-nums">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ReportActions({
  report,
  kind,
  windowDays,
}: {
  report: TenantReporting
  kind: ReportKind
  windowDays: ReportingWindow
}) {
  const { currentTenant } = useTenant()
  const [emailOpen, setEmailOpen] = useState(false)
  const [recipient, setRecipient] = useState('')
  const email = useMutation({
    mutationFn: () =>
      emailReport(currentTenant!.tenantId, kind, windowDays, recipient, crypto.randomUUID()),
  })
  const canEmail = currentTenant?.role === 'ADMIN' || currentTenant?.role === 'REVIEWER'
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => downloadReport(report, kind, currentTenant!.name, windowDays)}
        >
          <Download className="size-4" />
          Download
        </Button>
        {canEmail && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setEmailOpen(!emailOpen)
              email.reset()
            }}
          >
            <Mail className="size-4" />
            Mail
          </Button>
        )}
      </div>
      {emailOpen && (
        <form
          className="rounded-lg border bg-slate-50 p-4"
          onSubmit={(event) => {
            event.preventDefault()
            email.mutate()
          }}
        >
          <label htmlFor="report-recipient" className="mb-2 block text-sm font-medium">
            Recipient email address
          </label>
          <div className="flex flex-wrap gap-2">
            <Input
              id="report-recipient"
              type="email"
              required
              maxLength={254}
              value={recipient}
              onChange={(event) => {
                setRecipient(event.target.value)
                email.reset()
              }}
              placeholder="colleague@company.co.za"
              className="min-w-48 flex-1"
              disabled={email.isPending}
            />
            <Button type="submit" size="sm" disabled={email.isPending}>
              {email.isPending ? 'Sending…' : 'Send report'}
            </Button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Includes this insurer’s{' '}
            {kind === 'fsps'
              ? 'full FSP portfolio and contact information'
              : 'graph and monthly figures'}{' '}
            as an Excel attachment.
          </p>
          {email.isError && (
            <p role="alert" className="mt-2 text-sm text-red-700">
              {email.error.message}
            </p>
          )}
          {email.isSuccess && (
            <p role="status" className="mt-2 text-sm text-teal-700">
              The email service accepted the report for delivery.
            </p>
          )}
        </form>
      )}
    </div>
  )
}

function PortfolioTable({
  report,
  windowDays,
}: {
  report: TenantReporting
  windowDays: ReportingWindow
}) {
  const [search, setSearch] = useState('')
  const [visibleCount, setVisibleCount] = useState(20)
  const filtered = report.portfolio.filter((row) =>
    [row.fspNumber, row.tiaFspNumber, row.fspName, row.contactPerson, row.email].some((value) =>
      value?.toLowerCase().includes(search.toLowerCase()),
    ),
  )
  useEffect(() => {
    if (visibleCount >= filtered.length) return
    const timer = window.setTimeout(() => setVisibleCount((count) => count + 20), 100)
    return () => window.clearTimeout(timer)
  }, [visibleCount, filtered.length, search])
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <label className="relative block w-full max-w-md">
          <span className="sr-only">Search</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-2.5 left-3 size-4 text-slate-400"
          />
          <Input
            className="pl-9"
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setVisibleCount(20)
            }}
            placeholder="Search"
          />
        </label>
        <ReportActions report={report} kind="fsps" windowDays={windowDays} />
      </div>
      <Table className="portfolio-scroll max-h-[48dvh] overflow-x-scroll overflow-y-auto">
        <thead>
          <tr>
            {portfolioColumns.map((item) => (
              <th
                key={item.key}
                className={`sticky top-0 z-10 min-w-40 border-b bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600 ${item.key === 'fspNumber' ? 'left-0 z-20' : ''}`}
              >
                {item.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.slice(0, visibleCount).map((row) => (
            <tr key={row.id}>
              {portfolioColumns.map((item) => (
                <td
                  key={item.key}
                  className={`border-b px-4 py-3 whitespace-nowrap ${item.key === 'fspNumber' ? 'sticky left-0 bg-white font-medium' : ''}`}
                >
                  {portfolioCell(row, item.key, report.asOf)}
                </td>
              ))}
            </tr>
          ))}
          {!filtered.length && (
            <tr>
              <td colSpan={portfolioColumns.length} className="px-4 py-8 text-slate-500">
                No matching FSPs.
              </td>
            </tr>
          )}
        </tbody>
      </Table>
      {visibleCount < filtered.length && (
        <div role="status" className="flex justify-center py-2" aria-label="Loading more FSPs">
          <LoaderCircle className="size-5 animate-spin text-slate-500" />
        </div>
      )}
    </div>
  )
}

export function DashboardReporting({
  metrics,
  portfolioOpen,
  closePortfolio,
}: {
  metrics: TenantDashboardMetrics
  portfolioOpen: boolean
  closePortfolio: () => void
}) {
  const { currentTenant } = useTenant()
  const [windowDays, setWindowDays] = useState<ReportingWindow>(7)
  const [expanded, setExpanded] = useState<Exclude<ReportKind, 'fsps'> | null>(null)
  const report = useQuery({
    queryKey: ['tenant-reporting', currentTenant!.tenantId, windowDays],
    queryFn: () => getTenantReporting(currentTenant!.tenantId, windowDays),
  })
  const cards = [
    {
      label: 'Submitted',
      value: metrics.submittedFsps,
      icon: FileCheck2,
    },
    {
      label: 'Outstanding',
      value: metrics.outstandingFsps,
      icon: Clock3,
    },
    {
      label: 'Under review',
      value: metrics.underReviewSubmissions,
      icon: FileText,
    },
    {
      label: 'Completed',
      value: metrics.completedSubmissions,
      icon: CheckCircle2,
    },
  ]
  const activeKind: ReportKind | null = portfolioOpen ? 'fsps' : expanded
  return (
    <>
      <div className="flex flex-wrap items-end justify-end gap-3">
        <label className="text-xs font-medium text-slate-500">
          Reporting window
          <Select
            className="mt-1 min-w-36"
            value={windowDays}
            onChange={(event) => setWindowDays(Number(event.target.value) as ReportingWindow)}
          >
            <option value={1}>Last day</option>
            <option value={7}>Last week</option>
            <option value={30}>Last month</option>
          </Select>
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((item) => (
          <Card key={item.label} className="p-5">
            <div className="flex items-center gap-2 text-slate-500">
              <item.icon className="size-4" />
              <p className="text-sm">{item.label}</p>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-950 tabular-nums">
              {item.value.toLocaleString('en-ZA')}
            </p>
          </Card>
        ))}
      </div>
      {report.isPending ? (
        <div className="grid gap-4 lg:grid-cols-3" aria-busy="true">
          {[1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-64 w-full" />
          ))}
          <span className="sr-only">Loading portfolio reports…</span>
        </div>
      ) : report.isError ? (
        <Alert variant="danger" title="Portfolio reports could not be loaded">
          <Button
            className="mt-2"
            size="sm"
            variant="secondary"
            onClick={() => void report.refetch()}
          >
            Retry reports
          </Button>
        </Alert>
      ) : (
        <>
          <div className="grid items-start gap-4 lg:grid-cols-3">
            {(['completion', 'validity', 'enterprise'] as const).map((kind) => (
              <Card key={kind} className="h-full p-5">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <h2 className="font-semibold">{reportTitles[kind]}</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Expand ${reportTitles[kind]}`}
                    onClick={() => setExpanded(kind)}
                  >
                    <Maximize2 className="size-4" />
                  </Button>
                </div>
                <Bars
                  series={reportSeries(
                    kind,
                    report.data.portfolio,
                    report.data.asOf,
                    report.data.enterpriseTypes,
                  )}
                  total={report.data.portfolio.length}
                  onExpand={() => setExpanded(kind)}
                />
              </Card>
            ))}
          </div>
        </>
      )}
      <Dialog
        open={activeKind !== null}
        title={activeKind ? reportTitles[activeKind] : 'Portfolio report'}
        onClose={() => {
          setExpanded(null)
          closePortfolio()
        }}
        className="w-[min(76rem,calc(100%-var(--workspace-inset,0rem)-2rem))]"
      >
        {report.isPending ? (
          <Skeleton className="h-64 w-full" />
        ) : report.isError || !report.data ? (
          <Alert variant="danger" title="The report is unavailable">
            <Button
              variant="secondary"
              size="sm"
              className="mt-2"
              onClick={() => void report.refetch()}
            >
              Retry
            </Button>
          </Alert>
        ) : (
          activeKind && (
            <div key={activeKind} className="space-y-6">
              {activeKind !== 'fsps' && (
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="mt-1 text-xs text-slate-500">
                      As of{' '}
                      {new Date(report.data.asOf).toLocaleDateString('en-ZA', {
                        timeZone: 'Africa/Johannesburg',
                      })}{' '}
                      · Previous 12 months
                    </p>
                  </div>
                  <ReportActions report={report.data} kind={activeKind} windowDays={windowDays} />
                </div>
              )}
              {activeKind === 'fsps' ? (
                <PortfolioTable report={report.data} windowDays={windowDays} />
              ) : (
                <>
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                    <Card className="p-5">
                      <h3 className="mb-5 text-sm font-semibold">Current portfolio</h3>
                      <Bars
                        series={reportSeries(
                          activeKind,
                          report.data.portfolio,
                          report.data.asOf,
                          report.data.enterpriseTypes,
                        )}
                        total={report.data.portfolio.length}
                      />
                    </Card>
                    <Card className="p-5">
                      <h3 className="mb-5 text-sm font-semibold">Monthly portfolio status</h3>
                      <HistoryGraph report={report.data} kind={activeKind} />
                    </Card>
                  </div>
                  <section aria-label="Monthly report data">
                    <h3 className="mb-3 text-sm font-semibold">Monthly data</h3>
                    <Table>
                      <thead>
                        <tr>
                          {[
                            'Month',
                            ...historyData(activeKind, report.data).labels,
                            'Total FSPs',
                          ].map((label) => (
                            <th
                              key={label}
                              className="border-b bg-slate-50 px-4 py-3 text-xs font-semibold whitespace-nowrap text-slate-600"
                            >
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {historyData(activeKind, report.data).rows.map((month) => (
                          <tr key={month.month}>
                            <th
                              scope="row"
                              className="border-b px-4 py-3 font-medium whitespace-nowrap"
                            >
                              {month.month}
                              {month.month === monthLabel(report.data.asOf.slice(0, 7)) && (
                                <span className="ml-2 text-xs font-normal text-slate-400">
                                  to date
                                </span>
                              )}
                            </th>
                            {[...month.values, month.total].map((value, index) => (
                              <td key={index} className="border-b px-4 py-3 tabular-nums">
                                {value === null ? (
                                  <span className="text-xs text-slate-400">Unavailable</span>
                                ) : (
                                  value.toLocaleString('en-ZA')
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                    <p className="mt-3 text-xs text-slate-500">
                      Month-end portfolio status; the current month is shown to date. No values are
                      assumed before history capture started.
                    </p>
                  </section>
                </>
              )}
            </div>
          )
        )}
      </Dialog>
    </>
  )
}
