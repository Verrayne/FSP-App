import type {
  DashboardAction,
  DashboardPeriod,
  DashboardSubmission,
  SubmissionStatus,
} from '../types/dashboard'
import { hasFspPermission } from '../../permissions/fspPermissions'

export const submissionStatusPresentation: Record<
  SubmissionStatus,
  { label: string; badge: 'neutral' | 'info' | 'warning' | 'success' | 'danger' }
> = {
  NOT_STARTED: { label: 'Not started', badge: 'neutral' },
  IN_PROGRESS: { label: 'In progress', badge: 'info' },
  SUBMITTED: { label: 'Submitted', badge: 'info' },
  UNDER_REVIEW: { label: 'Under review', badge: 'warning' },
  HUMAN_REVIEW_REQUIRED: { label: 'Under review', badge: 'warning' },
  CHANGES_REQUESTED: { label: 'Changes requested', badge: 'warning' },
  COMPLETED: { label: 'Completed', badge: 'success' },
  REJECTED: { label: 'Rejected', badge: 'danger' },
}

function dateOnlyUtc(date: string) {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number)
  return Date.UTC(year, month - 1, day, 12)
}

export function formatDateOnly(date: string) {
  return new Intl.DateTimeFormat('en-ZA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Johannesburg',
  }).format(new Date(dateOnlyUtc(date)))
}

export function formatTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat('en-ZA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Johannesburg',
  }).format(new Date(timestamp))
}

export function daysUntil(date: string, today: string) {
  return Math.round((dateOnlyUtc(date) - dateOnlyUtc(today)) / 86_400_000)
}

export function deadlineMessage(period: DashboardPeriod, today: string) {
  if (period.openDate > today) return `Opens ${formatDateOnly(period.openDate)}`
  const remaining = daysUntil(period.closeDate, today)
  if (remaining < 0) return `Closed ${formatDateOnly(period.closeDate)}`
  if (remaining === 0) return 'Due today'
  if (remaining <= 14) return `${remaining} day${remaining === 1 ? '' : 's'} remaining`
  return `Due ${formatDateOnly(period.closeDate)}`
}

export function dashboardAction(
  submission: DashboardSubmission | null,
  period: DashboardPeriod,
  role: 'ADMIN' | 'SUBMITTER' | 'VIEWER',
  today: string,
  tenantFspId: string,
): DashboardAction {
  const canEdit = hasFspPermission({ role }, 'submissions:edit')
  const canStart = period.status === 'OPEN' && period.openDate <= today && period.closeDate >= today

  if (!submission) {
    return canEdit && canStart
      ? {
          label: 'Start submission',
          href: `/app/submissions/new?period=${period.id}&relationship=${tenantFspId}`,
          readOnly: false,
        }
      : { label: 'Read-only access', href: null, readOnly: true }
  }

  if (submission.status === 'NOT_STARTED' && canEdit && canStart) {
    return {
      label: 'Start submission',
      href: `/app/submissions/new?period=${period.id}&relationship=${tenantFspId}&submission=${submission.id}`,
      readOnly: false,
    }
  }
  if (submission.status === 'IN_PROGRESS' && canEdit) {
    return {
      label: 'Continue submission',
      href: `/app/submissions/${submission.id}`,
      readOnly: false,
    }
  }
  return {
    label: 'View submission',
    href: `/app/submissions/${submission.id}`,
    readOnly: true,
  }
}
