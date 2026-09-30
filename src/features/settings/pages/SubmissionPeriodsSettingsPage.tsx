import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MoreHorizontal, Plus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import {
  Alert,
  Badge,
  Button,
  Dialog,
  Dropdown,
  EmptyState,
  FormError,
  Input,
  PageHeader,
  Select,
  Skeleton,
  Table,
} from '../../../components/ui'
import { formatDateOnly } from '../../dashboard/lib/dashboardPresentation'
import { useTenant } from '../../tenant/hooks/useTenant'
import { periodSchema, type PeriodValues } from '../schemas'
import {
  createPeriod,
  deletePeriod,
  getQuestionnaireVersions,
  getSettingsPeriods,
  settingsQueryKeys,
  updatePeriod,
} from '../services/settingsService'
import { reviewModeLabels, type TenantSettingsPeriod } from '../types'

const statusBadge = {
  DRAFT: 'neutral',
  UPCOMING: 'info',
  OPEN: 'success',
  CLOSED: 'neutral',
} as const
const statusLabel = {
  DRAFT: 'Draft',
  UPCOMING: 'Upcoming',
  OPEN: 'Open',
  CLOSED: 'Closed',
} as const

function valuesFor(period?: TenantSettingsPeriod): PeriodValues {
  return period
    ? {
        name: period.name,
        year: period.year,
        openDate: period.openDate,
        closeDate: period.closeDate,
        questionnaireVersionId: period.questionnaireVersionId,
        reviewMode: period.reviewMode,
        status: period.storedStatus === 'ARCHIVED' ? 'CLOSED' : period.storedStatus,
      }
    : {
        name: '',
        year: new Date().getFullYear(),
        openDate: '',
        closeDate: '',
        questionnaireVersionId: '',
        reviewMode: 'HUMAN_REVIEW',
        status: 'DRAFT',
      }
}

export function SubmissionPeriodsSettingsPage() {
  const { currentTenant } = useTenant()
  const tenantId = currentTenant?.tenantId ?? ''
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<TenantSettingsPeriod>()
  const [deleting, setDeleting] = useState<TenantSettingsPeriod>()
  const [notice, setNotice] = useState<string>()
  const periods = useQuery({
    queryKey: settingsQueryKeys.periods(tenantId),
    queryFn: () => getSettingsPeriods(tenantId),
    enabled: Boolean(tenantId),
  })
  const versions = useQuery({
    queryKey: settingsQueryKeys.questionnaires(tenantId),
    queryFn: () => getQuestionnaireVersions(tenantId),
    enabled: Boolean(tenantId),
  })
  const form = useForm<PeriodValues>({
    resolver: zodResolver(periodSchema),
    defaultValues: valuesFor(),
  })
  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: settingsQueryKeys.root(tenantId) })
  }
  const save = useMutation({
    mutationFn: (values: PeriodValues) =>
      editing ? updatePeriod(editing.id, values) : createPeriod(tenantId, values),
    onSuccess: async () => {
      setOpen(false)
      setEditing(undefined)
      setNotice(editing ? 'Submission period updated.' : 'Submission period created.')
      await refresh()
    },
  })
  const remove = useMutation({
    mutationFn: () => deletePeriod(deleting!.id),
    onSuccess: async () => {
      setDeleting(undefined)
      setNotice('Draft submission period deleted.')
      await refresh()
    },
  })
  function showEditor(period?: TenantSettingsPeriod) {
    setEditing(period)
    form.reset(valuesFor(period))
    setOpen(true)
  }

  if (periods.isPending || versions.isPending)
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-72 w-full" />
        <span className="sr-only" role="status">
          Loading submission periods…
        </span>
      </div>
    )
  const locked = editing?.storedStatus === 'OPEN'
  return (
    <section className="space-y-5">
      <PageHeader
        title="Submission Periods"
        action={
          <Button onClick={() => showEditor()}>
            <Plus className="size-4" />
            Create Period
          </Button>
        }
      />
      {notice && <Alert title={notice} />}{' '}
      {(periods.isError || versions.isError || save.isError || remove.isError) && (
        <Alert title="Unable to update submission periods" variant="danger">
          Check the dates, lifecycle, questionnaire version, and overlapping periods.
        </Alert>
      )}
      {(periods.data?.length ?? 0) === 0 ? (
        <EmptyState
          title="No submission periods"
          description="Create a draft period to prepare the next B-BBEE collection window."
        />
      ) : (
        <Table>
          <thead>
            <tr className="border-b text-xs tracking-wide text-slate-500 uppercase">
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3">Questionnaire Version</th>
              <th className="px-4 py-3">Review Method</th>
              <th className="px-4 py-3">Open Date</th>
              <th className="px-4 py-3">Close Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="w-14 px-4 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {periods.data?.map((period) => (
              <tr key={period.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium">{period.name}</p>
                  <p className="text-xs text-slate-500">
                    {period.year} · {period.submissionCount} submission
                    {period.submissionCount === 1 ? '' : 's'}
                  </p>
                </td>
                <td className="px-4 py-3">
                  {period.questionnaireName} v{period.questionnaireVersion}
                </td>
                <td className="px-4 py-3">{reviewModeLabels[period.reviewMode]}</td>
                <td className="px-4 py-3 whitespace-nowrap">{formatDateOnly(period.openDate)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{formatDateOnly(period.closeDate)}</td>
                <td className="px-4 py-3">
                  <Badge variant={statusBadge[period.displayStatus]}>
                    {statusLabel[period.displayStatus]}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Dropdown
                    labelText={`Actions for ${period.name}`}
                    label={
                      <Button size="sm" variant="ghost">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    }
                  >
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      disabled={period.displayStatus === 'CLOSED'}
                      onClick={() => showEditor(period)}
                    >
                      Edit period
                    </Button>
                    {period.storedStatus === 'DRAFT' && period.submissionCount === 0 && (
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-red-700"
                        onClick={() => setDeleting(period)}
                      >
                        Delete draft
                      </Button>
                    )}
                  </Dropdown>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Dialog
        open={open}
        title={editing ? 'Edit Submission Period' : 'Create Period'}
        onClose={() => setOpen(false)}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => void form.handleSubmit((values) => save.mutate(values))(event)}
        >
          <div>
            <label htmlFor="period-name" className="text-sm font-medium">
              Period name
            </label>
            <Input
              id="period-name"
              {...form.register('name')}
              aria-describedby="period-name-error"
            />
            <FormError id="period-name-error">{form.formState.errors.name?.message}</FormError>
          </div>
          <div>
            <label htmlFor="period-year" className="text-sm font-medium">
              Year
            </label>
            <Input id="period-year" type="number" disabled={locked} {...form.register('year')} />
            <FormError>{form.formState.errors.year?.message}</FormError>
          </div>
          <div>
            <label htmlFor="period-questionnaire" className="text-sm font-medium">
              Questionnaire version
            </label>
            <Select
              id="period-questionnaire"
              disabled={locked || Boolean(editing?.submissionCount)}
              {...form.register('questionnaireVersionId')}
            >
              <option value="">Select a published version</option>
              {versions.data?.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.name} · version {version.version}
                </option>
              ))}
            </Select>
            <FormError>{form.formState.errors.questionnaireVersionId?.message}</FormError>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="period-open" className="text-sm font-medium">
                Open date
              </label>
              <Input
                id="period-open"
                type="date"
                disabled={locked}
                {...form.register('openDate')}
              />
            </div>
            <div>
              <label htmlFor="period-close" className="text-sm font-medium">
                Close date
              </label>
              <Input id="period-close" type="date" {...form.register('closeDate')} />
              <FormError>{form.formState.errors.closeDate?.message}</FormError>
            </div>
          </div>
          <div>
            <label htmlFor="period-review-mode" className="text-sm font-medium">
              Review Method
            </label>
            <Select id="period-review-mode" {...form.register('reviewMode')}>
              <option value="AUTOMATIC_ACCEPTANCE">Automatic Acceptance</option>
              <option value="HUMAN_REVIEW">Human Review</option>
              <option value="AI_REVIEW" disabled={!periods.data?.[0]?.aiReviewAvailable}>
                AI Review{periods.data?.[0]?.aiReviewAvailable ? '' : ' — unavailable'}
              </option>
            </Select>
            <div className="mt-2 space-y-1 text-xs text-slate-600">
              <p>
                <strong>Automatic Acceptance:</strong> completes after successful submission
                validation.
              </p>
              <p>
                <strong>Human Review:</strong> enters the insurer review queue.
              </p>
              <p>
                <strong>AI Review:</strong> clean, high-confidence results can complete; all other
                outcomes escalate to a human.
              </p>
            </div>
            {editing && editing.submissionCount > 0 && (
              <p className="mt-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                Existing submissions keep their snapshotted review method. This change applies only
                to later first submissions for this period.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="period-status" className="text-sm font-medium">
              Status
            </label>
            <Select id="period-status" {...form.register('status')}>
              <option value="DRAFT" disabled={locked}>
                Draft
              </option>
              <option value="OPEN">Open</option>
              {locked && <option value="CLOSED">Closed</option>}
            </Select>
          </div>
          {locked && (
            <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
              Once open, only the name, close date, and transition to Closed can change.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : editing ? 'Save changes' : 'Create Period'}
            </Button>
          </div>
        </form>
      </Dialog>
      <Dialog
        open={Boolean(deleting)}
        title="Delete Draft Period"
        onClose={() => setDeleting(undefined)}
      >
        <p className="text-sm text-slate-600">
          This unused draft has no submissions. Deletion cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleting(undefined)}>
            Cancel
          </Button>
          <Button variant="danger" disabled={remove.isPending} onClick={() => remove.mutate()}>
            {remove.isPending ? 'Deleting…' : 'Delete Draft Period'}
          </Button>
        </div>
      </Dialog>
    </section>
  )
}
