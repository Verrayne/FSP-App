import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Download, FileText, LockKeyhole, Upload } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { Alert, Badge, Button, Card, Dialog, EmptyState } from '../../../components/ui'
import { useFsp } from '../../onboarding/hooks/useFsp'
import { hasFspPermission } from '../../permissions/fspPermissions'
import { dashboardQueryKeys } from '../../dashboard/services/dashboardService'
import {
  formatDateOnly,
  formatTimestamp,
  submissionStatusPresentation,
} from '../../dashboard/lib/dashboardPresentation'
import { QuestionField } from '../components/QuestionField'
import { ReviewPanel } from '../components/ReviewPanel'
import { SubmissionHistoryDetail } from '../components/SubmissionHistoryDetail'
import { SubmissionSkeleton } from '../components/SubmissionSkeleton'
import {
  questionState,
  responseForPersistence,
  validateQuestion,
  validateWorkflow,
} from '../lib/submissionRules'
import {
  acknowledgeDeclaration,
  CERTIFICATE_MAX_BYTES,
  createCertificateUrl,
  loadSubmissionWorkflow,
  reopenSubmissionForChanges,
  saveSubmissionResponse,
  startSubmission,
  submissionQueryKeys,
  submitSubmission,
  uploadCertificate,
} from '../services/submissionService'
import type { QuestionValue, SubmissionWorkflow } from '../types/submission'

export function StartSubmissionPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { currentFsp } = useFsp()
  const periodId = params.get('period')
  const relationshipId = params.get('relationship')
  const [error, setError] = useState(false)
  const invalidContext =
    !periodId || !relationshipId || !currentFsp || !hasFspPermission(currentFsp, 'submissions:edit')

  useEffect(() => {
    if (invalidContext) return
    let active = true
    void startSubmission(periodId, relationshipId)
      .then((submission) => {
        if (active) void navigate(`/app/submissions/${submission.id}`, { replace: true })
      })
      .catch(() => active && setError(true))
    return () => {
      active = false
    }
  }, [currentFsp, invalidContext, navigate, periodId, relationshipId])

  return (
    <div className="space-y-6">
      {invalidContext || error ? (
        <EmptyState
          title="Submission could not be started"
          description="The reporting period may be closed, your access may have changed, or the submission context is invalid."
          action={
            <Button onClick={() => void navigate('/app/dashboard')}>Return to dashboard</Button>
          }
        />
      ) : (
        <SubmissionSkeleton />
      )}
    </div>
  )
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function SubmissionWorkflowPage() {
  const { id = '' } = useParams()
  const { currentFsp, refresh: refreshFsp } = useFsp()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: submissionQueryKeys.detail(currentFsp?.fspId ?? '', 'resolve', id),
    queryFn: () => loadSubmissionWorkflow(id, currentFsp!.fspId),
    enabled: Boolean(id && currentFsp),
  })
  const workflowData = query.data
  const [responses, setResponses] = useState<Record<string, QuestionValue>>({})
  const [route, setRoute] = useState<SubmissionWorkflow['route']>(null)
  const [activeStep, setActiveStep] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [routeError, setRouteError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [reopening, setReopening] = useState(false)
  const [reopenError, setReopenError] = useState(false)
  const initializedId = useRef<string | null>(null)
  const queues = useRef(new Map<string, Promise<unknown>>())

  useEffect(() => {
    if (workflowData && initializedId.current !== workflowData.id) {
      initializedId.current = workflowData.id
      setResponses(workflowData.responses)
      setRoute(workflowData.route)
    }
  }, [workflowData])

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (saveState === 'saving' || saveState === 'error') event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [saveState])

  const save = useCallback(
    (questionId: string, value: QuestionValue) => {
      if (!workflowData) return
      setSaveState('saving')
      const previous = queues.current.get(questionId) ?? Promise.resolve()
      const next = previous
        .catch(() => undefined)
        .then(() => saveSubmissionResponse(workflowData.id, questionId, value))
        .then((result) => {
          setRoute((result?.submission_route as SubmissionWorkflow['route']) ?? null)
          setSaveState('saved')
          setRouteError(null)
        })
        .catch(() => setSaveState('error'))
      queues.current.set(questionId, next)
    },
    [workflowData],
  )

  if (query.isPending)
    return (
      <div className="space-y-6">
        <SubmissionSkeleton />
      </div>
    )
  if (query.isError || !workflowData)
    return (
      <div className="space-y-6">
        <Card role="alert" className="p-6">
          <h2 className="font-semibold">Submission could not be loaded</h2>
          <p className="mt-1 text-sm text-slate-600">
            Your access may have changed or the submission is unavailable.
          </p>
          <Button
            className="mt-4"
            variant="secondary"
            onClick={() => {
              void refreshFsp()
              void query.refetch()
            }}
          >
            Retry
          </Button>
        </Card>
      </div>
    )

  const workflow = workflowData
  const readOnly =
    workflow.status !== 'IN_PROGRESS' || !hasFspPermission(currentFsp, 'submissions:edit')
  if (readOnly) {
    return (
      <div className="space-y-6">
        <div className="flex justify-end">
          <Badge variant={submissionStatusPresentation[workflow.status].badge}>
            {submissionStatusPresentation[workflow.status].label}
          </Badge>
        </div>
        <Card className="flex items-center gap-3 p-4 text-sm text-slate-600">
          <LockKeyhole className="size-4" />
          This submission is read-only.
          {workflow.submitDate ? ` Submitted ${formatTimestamp(workflow.submitDate)}.` : ''}
        </Card>
        {workflow.status === 'CHANGES_REQUESTED' && (
          <Alert title="Changes requested" variant="info">
            <div className="space-y-3">
              {workflow.feedback?.length ? (
                workflow.feedback.map((item, index) => (
                  <div key={`${item.title ?? 'feedback'}-${index}`}>
                    <p className="font-medium">{item.title ?? 'Reviewer feedback'}</p>
                    <p>{item.description ?? item.summary}</p>
                  </div>
                ))
              ) : (
                <p>The insurer requested an update to this submission.</p>
              )}
              {hasFspPermission(currentFsp, 'submissions:edit') && (
                <>
                  {reopenError && (
                    <p className="text-red-700">
                      The submission could not be reopened. Refresh and try again.
                    </p>
                  )}
                  <Button
                    size="sm"
                    disabled={reopening}
                    onClick={() => {
                      setReopening(true)
                      setReopenError(false)
                      void reopenSubmissionForChanges(workflow.id)
                        .then(() => query.refetch())
                        .catch(() => setReopenError(true))
                        .finally(() => setReopening(false))
                    }}
                  >
                    {reopening ? 'Opening…' : 'Update submission'}
                  </Button>
                </>
              )}
            </div>
          </Alert>
        )}
        <SubmissionHistoryDetail
          scope="fsp"
          scopeId={currentFsp!.fspId}
          submissionId={workflow.id}
        />
      </div>
    )
  }

  const steps = [
    ...workflow.sections.map((section) => ({ id: section.id, label: section.title })),
    {
      id: 'route',
      label:
        route === 'AFFIDAVIT' ? 'Declaration' : route === 'CERTIFICATE' ? 'Certificate' : 'Route',
    },
    { id: 'review', label: 'Review' },
  ]
  const currentSection = workflow.sections[activeStep]
  const isRouteStep = activeStep === workflow.sections.length
  const isReview = activeStep === workflow.sections.length + 1

  function setValue(questionId: string, value: QuestionValue) {
    setResponses((current) => ({ ...current, [questionId]: value }))
    setErrors((current) => ({ ...current, [questionId]: '' }))
  }

  function commitValue(questionId: string, value: QuestionValue) {
    const question = workflow.sections
      .flatMap((section) => section.questions)
      .find((item) => item.id === questionId)
    if (!question) return
    const nextResponses = { ...responses, [questionId]: value }
    const state = questionState(question, workflow.conditions, nextResponses)
    const error = validateQuestion(question, value, state.required)
    setErrors((current) => ({ ...current, [questionId]: error ?? '' }))
    if (!error) save(questionId, responseForPersistence(question.type, value))
    for (const target of workflow.sections.flatMap((section) => section.questions)) {
      if (
        target.id !== questionId &&
        responses[target.id] != null &&
        !questionState(target, workflow.conditions, nextResponses).visible
      ) {
        setResponses((current) => ({ ...current, [target.id]: null }))
        save(target.id, null)
      }
    }
  }

  function continueStep() {
    if (currentSection) {
      const nextErrors: Record<string, string> = {}
      for (const question of currentSection.questions) {
        const state = questionState(question, workflow.conditions, responses)
        if (!state.visible) continue
        const error = validateQuestion(question, responses[question.id], state.required)
        if (error) nextErrors[question.id] = error
      }
      if (Object.keys(nextErrors).length) {
        setErrors((current) => ({ ...current, ...nextErrors }))
        window.setTimeout(
          () => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
          0,
        )
        return
      }
    }
    if (activeStep === workflow.sections.length - 1 && !route) {
      setRouteError('Complete the route-determining question before continuing.')
      return
    }
    if (isRouteStep && route === 'CERTIFICATE' && !workflow.document?.currentVersion) {
      setRouteError('Upload the required certificate before review.')
      return
    }
    if (isRouteStep && route === 'AFFIDAVIT' && !workflow.declaration) {
      setRouteError('Accept the declaration before review.')
      return
    }
    setRouteError(null)
    setActiveStep((step) => Math.min(step + 1, steps.length - 1))
  }

  async function handleUpload(file: File | undefined) {
    if (!file) return
    setUploadError(null)
    setUploading(true)
    try {
      await uploadCertificate(workflow.id, file)
      await query.refetch()
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : 'The certificate could not be uploaded.',
      )
    } finally {
      setUploading(false)
    }
  }

  async function acceptDeclaration() {
    setRouteError(null)
    try {
      await acknowledgeDeclaration(workflow.id)
      await query.refetch()
    } catch {
      setRouteError('The declaration could not be recorded.')
    }
  }

  async function finalSubmit() {
    setSubmitting(true)
    setSubmissionError(null)
    const validation = validateWorkflow(workflow.sections, workflow.conditions, responses)
    if (Object.keys(validation).length) {
      setErrors(validation)
      setActiveStep(
        workflow.sections.findIndex((section) => section.questions.some((q) => validation[q.id])),
      )
      setConfirmOpen(false)
      setSubmitting(false)
      return
    }
    try {
      await submitSubmission(workflow.id)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: submissionQueryKeys.root }),
        queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.root }),
      ])
      void navigate('/app/dashboard', { replace: true })
    } catch {
      setSubmissionError(
        'The submission could not be finalized. Check all required information and try again.',
      )
      setConfirmOpen(false)
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-3">
        <span
          role="status"
          className={`text-xs ${saveState === 'error' ? 'text-red-700' : 'text-slate-500'}`}
        >
          {saveState === 'saving'
            ? 'Saving…'
            : saveState === 'saved'
              ? 'Saved'
              : saveState === 'error'
                ? 'Save failed'
                : ''}
        </span>
        <Badge variant="info">In progress</Badge>
      </div>
      <Card className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4 text-sm">
        <span>
          <strong>{workflow.period.name}</strong>
        </span>
        <span className="text-slate-600">Deadline {formatDateOnly(workflow.period.closeDate)}</span>
        <span className="text-slate-600">{workflow.tenantName}</span>
      </Card>
      {saveState === 'error' && (
        <Alert title="An answer could not be saved" variant="danger">
          Check your connection and change the affected answer again before leaving this page.
        </Alert>
      )}
      <div className="grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <Card className="h-fit p-3">
          <nav
            aria-label="Submission sections"
            className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible"
          >
            {steps.map((step, index) => {
              const section = workflow.sections[index]
              const complete = section
                ? section.questions
                    .filter(
                      (q) =>
                        questionState(q, workflow.conditions, responses).visible &&
                        questionState(q, workflow.conditions, responses).required,
                    )
                    .every((q) => !validateQuestion(q, responses[q.id], true))
                : false
              return (
                <button
                  key={step.id}
                  className={`flex min-w-max items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${activeStep === index ? 'bg-navy-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                  onClick={() => setActiveStep(index)}
                >
                  <span className="flex size-5 items-center justify-center rounded-full border text-xs">
                    {complete ? <Check className="size-3" /> : index + 1}
                  </span>
                  {step.label}
                </button>
              )
            })}
          </nav>
        </Card>
        <Card className="min-w-0 p-5 sm:p-6">
          {currentSection && (
            <section>
              <h2 className="text-lg font-semibold">{currentSection.title}</h2>
              {currentSection.description && (
                <p className="mt-1 text-sm text-slate-600">{currentSection.description}</p>
              )}
              <div className="mt-6 space-y-6">
                {currentSection.questions.map((question) => {
                  const state = questionState(question, workflow.conditions, responses)
                  return state.visible ? (
                    <QuestionField
                      key={question.id}
                      question={question}
                      value={responses[question.id]}
                      required={state.required}
                      disabled={state.disabled}
                      error={errors[question.id]}
                      onChange={(value) => setValue(question.id, value)}
                      onCommit={(value) => commitValue(question.id, value)}
                    />
                  ) : null
                })}
              </div>
            </section>
          )}
          {isRouteStep && route === 'CERTIFICATE' && (
            <section>
              <div className="flex items-center gap-2">
                <FileText className="size-5 text-slate-500" />
                <h2 className="text-lg font-semibold">B-BBEE certificate</h2>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Upload one PDF certificate, no larger than {CERTIFICATE_MAX_BYTES / 1024 / 1024} MB.
                Replacements retain earlier versions.
              </p>
              {workflow.document?.currentVersion && (
                <div className="mt-4 rounded-md border bg-slate-50 p-4">
                  <p className="font-medium">{workflow.document.currentVersion.originalFilename}</p>
                  <p className="text-xs text-slate-500">
                    Uploaded {formatTimestamp(workflow.document.currentVersion.uploadDate)}
                  </p>
                  <Button
                    className="mt-3"
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      void createCertificateUrl(
                        workflow.document!.currentVersion!.storagePath,
                      ).then((url) => window.open(url, '_blank', 'noopener,noreferrer'))
                    }
                  >
                    <Download className="size-4" />
                    Download
                  </Button>
                </div>
              )}
              <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50">
                <Upload className="size-4" />
                {uploading
                  ? 'Uploading…'
                  : workflow.document?.currentVersion
                    ? 'Replace PDF'
                    : 'Upload PDF'}
                <input
                  className="sr-only"
                  type="file"
                  accept="application/pdf,.pdf"
                  disabled={uploading}
                  onChange={(event) => void handleUpload(event.target.files?.[0])}
                />
              </label>
              {uploadError && (
                <p role="alert" className="mt-2 text-sm text-red-700">
                  {uploadError}
                </p>
              )}
            </section>
          )}
          {isRouteStep && route === 'AFFIDAVIT' && (
            <section>
              <h2 className="text-lg font-semibold">
                {workflow.declarationTemplate?.title ?? 'Declaration'}
              </h2>
              <p className="mt-3 text-sm leading-6 whitespace-pre-line text-slate-700">
                {workflow.declarationTemplate?.text}
              </p>
              {workflow.declaration ? (
                <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  <strong>Accepted</strong> by {workflow.declaration.declarantName} on{' '}
                  {formatTimestamp(workflow.declaration.acceptedDate)}.
                </div>
              ) : (
                <label className="mt-5 flex items-start gap-3 rounded-md border p-4 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4"
                    onChange={(event) => {
                      if (event.target.checked) void acceptDeclaration()
                    }}
                  />
                  <span>
                    I explicitly accept this declaration using my authenticated account. I
                    understand this is an electronic acknowledgement, not a qualified digital
                    signature.
                  </span>
                </label>
              )}
            </section>
          )}
          {isRouteStep && !route && (
            <EmptyState
              title="Submission route pending"
              description="Complete the questionnaire so the configured rules can determine the next requirement."
            />
          )}
          {isReview && <ReviewPanel workflow={workflow} responses={responses} route={route} />}
          {routeError && (
            <p role="alert" className="mt-4 text-sm text-red-700">
              {routeError}
            </p>
          )}
          {submissionError && (
            <p role="alert" className="mt-4 text-sm text-red-700">
              {submissionError}
            </p>
          )}
          <div className="mt-6 flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-between">
            <Button
              variant="secondary"
              disabled={activeStep === 0}
              onClick={() => setActiveStep((step) => Math.max(0, step - 1))}
            >
              Back
            </Button>
            {isReview ? (
              <Button
                disabled={saveState === 'saving' || submitting}
                onClick={() => setConfirmOpen(true)}
              >
                Submit B-BBEE information
              </Button>
            ) : (
              <Button onClick={continueStep}>Continue</Button>
            )}
          </div>
        </Card>
      </div>
      <Dialog
        open={confirmOpen}
        title="Submit B-BBEE information"
        onClose={() => !submitting && setConfirmOpen(false)}
      >
        <p className="text-sm text-slate-600">
          Confirm that the reviewed information is correct. After submission, this record will
          become read-only.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" disabled={submitting} onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button disabled={submitting} onClick={() => void finalSubmit()}>
            {submitting ? 'Submitting…' : 'Submit B-BBEE information'}
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
