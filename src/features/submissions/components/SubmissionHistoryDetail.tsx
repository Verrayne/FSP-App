import { useQuery } from '@tanstack/react-query'
import { Download, FileText } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { Alert, Badge, Button, Card, EmptyState, Select, Skeleton } from '../../../components/ui'
import {
  formatTimestamp,
  submissionStatusPresentation,
} from '../../dashboard/lib/dashboardPresentation'
import {
  downloadHistoricalDocument,
  listSubmissionAttempts,
  listSubmissionTimeline,
  listTenantSubmissionAudit,
  loadHistoricalSections,
  submissionHistoryQueryKeys,
} from '../services/submissionHistoryService'
import type { SubmissionAttempt } from '../types/history'

function humanCode(value: string) {
  return value
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^./, (letter) => letter.toUpperCase())
}

function DetailSkeleton() {
  return (
    <Card className="space-y-4 p-5">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </Card>
  )
}

export function SubmissionHistoryDetail({
  scope,
  scopeId,
  submissionId,
  showAudit = false,
}: {
  scope: 'fsp' | 'tenant'
  scopeId: string
  submissionId: string
  showAudit?: boolean
}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedAttempt = searchParams.get('version') ?? ''
  const [auditPage, setAuditPage] = useState(1)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const attempts = useQuery({
    queryKey: submissionHistoryQueryKeys.attempts(scope, scopeId, submissionId),
    queryFn: () => listSubmissionAttempts(scope, scopeId, submissionId),
    retry: false,
  })
  const selected = useMemo(
    () => attempts.data?.find((attempt) => attempt.id === requestedAttempt) ?? attempts.data?.[0],
    [attempts.data, requestedAttempt],
  )
  const sections = useQuery({
    queryKey: submissionHistoryQueryKeys.attempt(scope, scopeId, submissionId, selected?.id ?? ''),
    queryFn: () => loadHistoricalSections(selected!),
    enabled: Boolean(selected),
    retry: false,
  })
  const timeline = useQuery({
    queryKey: submissionHistoryQueryKeys.timeline(scope, scopeId, submissionId),
    queryFn: () => listSubmissionTimeline(scope, scopeId, submissionId),
    retry: false,
  })
  const audit = useQuery({
    queryKey: submissionHistoryQueryKeys.audit(scopeId, submissionId, auditPage),
    queryFn: () => listTenantSubmissionAudit(scopeId, submissionId, auditPage),
    enabled: scope === 'tenant' && showAudit,
    retry: false,
  })

  if (attempts.isPending) return <DetailSkeleton />
  if (attempts.isError)
    return (
      <Alert title="Submission history could not be loaded" variant="danger">
        Your access may have changed. Refresh and try again.
      </Alert>
    )
  if (!attempts.data.length)
    return (
      <EmptyState
        title="No submitted versions yet"
        description="An immutable version will appear here after this submission is submitted."
      />
    )

  function selectAttempt(attemptId: string) {
    const next = new URLSearchParams(searchParams)
    next.set('version', attemptId)
    setSearchParams(next, { replace: true })
  }

  async function download(attempt: SubmissionAttempt, documentIndex: number) {
    const document = attempt.documents[documentIndex]
    if (!document) return
    setDownloadError(null)
    setDownloading(document.documentVersionId)
    try {
      await downloadHistoricalDocument(scope, scopeId, submissionId, attempt.id, document)
    } catch {
      setDownloadError('The exact historical document could not be downloaded.')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <label className="w-full max-w-xs text-sm font-medium text-slate-700">
            Submission version
            <Select
              className="mt-1"
              value={selected?.id}
              onChange={(event) => selectAttempt(event.target.value)}
            >
              {attempts.data.map((attempt) => (
                <option key={attempt.id} value={attempt.id}>
                  {attempt.label} · {formatTimestamp(attempt.submitDate)}
                </option>
              ))}
            </Select>
          </label>
          {selected && (
            <div className="flex flex-wrap gap-2">
              <Badge>{humanCode(selected.route)}</Badge>
              <Badge variant="info">{humanCode(selected.reviewMode)}</Badge>
            </div>
          )}
        </div>
        {selected && (
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-slate-500">Submitted</dt>
              <dd className="font-medium">{formatTimestamp(selected.submitDate)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Submitted by</dt>
              <dd className="font-medium">{selected.submittedBy ?? 'FSP user'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Questionnaire</dt>
              <dd className="font-medium">
                {selected.questionnaireName} · version {selected.questionnaireVersion}
              </dd>
            </div>
          </dl>
        )}
      </Card>

      {sections.isPending ? (
        <DetailSkeleton />
      ) : sections.isError ? (
        <Alert title="Historical answers could not be loaded" variant="danger">
          The selected version remains unchanged. Refresh and try again.
        </Alert>
      ) : (
        sections.data.map((section) => (
          <Card key={section.id} className="p-5">
            <h2 className="font-semibold">{section.title}</h2>
            {section.responses.length ? (
              <dl className="mt-4 divide-y">
                {section.responses.map((response) => (
                  <div key={response.id} className="grid gap-1 py-3 sm:grid-cols-2 sm:gap-5">
                    <dt className="text-sm text-slate-600">{response.label}</dt>
                    <dd className="text-sm font-medium whitespace-pre-wrap">{response.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                No answers were recorded in this section.
              </p>
            )}
          </Card>
        ))
      )}

      {selected?.route === 'AFFIDAVIT' && selected.declaration && (
        <Card className="p-5">
          <h2 className="font-semibold">{selected.declaration.title}</h2>
          <p className="mt-3 text-sm whitespace-pre-wrap text-slate-700">
            {selected.declaration.text}
          </p>
          <p className="mt-4 text-sm text-slate-600">
            Accepted by {selected.declaration.declarantName ?? 'FSP user'}
            {selected.declaration.acceptedDate
              ? ` on ${formatTimestamp(selected.declaration.acceptedDate)}`
              : ''}
          </p>
        </Card>
      )}

      {selected?.route === 'CERTIFICATE' && (
        <Card className="p-5">
          <h2 className="font-semibold">Supporting documents</h2>
          {downloadError && (
            <div className="mt-4">
              <Alert title="Download failed" variant="danger">
                {downloadError}
              </Alert>
            </div>
          )}
          <div className="mt-4 space-y-3">
            {selected.documents.map((document, index) => (
              <div
                key={document.documentVersionId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <FileText className="size-5 shrink-0 text-slate-500" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{document.filename}</p>
                    <p className="text-xs text-slate-500">
                      {(document.sizeBytes / 1024).toFixed(0)} KB · uploaded{' '}
                      {formatTimestamp(document.uploadDate)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={downloading === document.documentVersionId}
                  onClick={() => void download(selected, index)}
                >
                  <Download className="size-4" />
                  {downloading === document.documentVersionId ? 'Downloading…' : 'Download'}
                </Button>
              </div>
            ))}
            {!selected.documents.length && (
              <p className="text-sm text-slate-500">No document was attached to this version.</p>
            )}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="font-semibold">Status history</h2>
        {timeline.isPending ? (
          <div className="mt-4 space-y-3">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : timeline.isError ? (
          <div className="mt-4">
            <Alert title="Status history unavailable" variant="danger">
              Other submission details are still available.
            </Alert>
          </div>
        ) : (
          <ol className="mt-4 space-y-4 border-l-2 border-slate-200 pl-5">
            {timeline.data.map((item) => {
              const presentation =
                submissionStatusPresentation[
                  item.toStatus as keyof typeof submissionStatusPresentation
                ]
              return (
                <li key={item.id} className="relative">
                  <span className="absolute top-1 -left-[1.66rem] size-3 rounded-full bg-slate-400 ring-4 ring-white" />
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={presentation?.badge}>
                      {presentation?.label ?? humanCode(item.toStatus)}
                    </Badge>
                    <span className="text-xs text-slate-500">
                      {formatTimestamp(item.occurrenceDate)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {item.actorLabel}
                    {item.reason ? ` · ${item.reason}` : ''}
                  </p>
                </li>
              )
            })}
          </ol>
        )}
      </Card>

      {scope === 'tenant' && showAudit && (
        <Card className="p-5">
          <h2 className="font-semibold">Audit trail</h2>
          <p className="mt-1 text-sm text-slate-600">Newest activity first.</p>
          {audit.isPending ? (
            <div className="mt-4 space-y-3">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : audit.isError ? (
            <div className="mt-4">
              <Alert title="Audit trail unavailable" variant="danger">
                Submission review data is unaffected.
              </Alert>
            </div>
          ) : audit.data.items.length ? (
            <>
              <ol className="mt-4 divide-y">
                {audit.data.items.map((item) => (
                  <li key={item.id} className="py-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{item.eventLabel}</span>
                      <span className="text-xs text-slate-500">
                        {formatTimestamp(item.occurrenceDate)}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-600">
                      {item.actorLabel} · {item.entityLabel}
                      {item.detail ? ` · ${item.detail}` : ''}
                    </p>
                  </li>
                ))}
              </ol>
              <div className="mt-4 flex items-center justify-between">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={auditPage === 1}
                  onClick={() => setAuditPage((page) => page - 1)}
                >
                  Previous
                </Button>
                <span className="text-xs text-slate-500">Page {auditPage}</span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={auditPage * 25 >= audit.data.total}
                  onClick={() => setAuditPage((page) => page + 1)}
                >
                  Next
                </Button>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No audit events were recorded.</p>
          )}
        </Card>
      )}
    </div>
  )
}
