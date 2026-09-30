import type { QuestionTypeCode } from '../../submissions/types/submission'

export const submissionLabels: Record<string, string> = {
  OUTSTANDING: 'Outstanding',
  NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under review',
  HUMAN_REVIEW_REQUIRED: 'Human review required',
  CHANGES_REQUESTED: 'Changes requested',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
}
export const reviewModeLabels: Record<string, string> = {
  AUTOMATIC_ACCEPTANCE: 'Automatic acceptance',
  HUMAN_REVIEW: 'Human review',
  AI_REVIEW: 'AI review',
}
export const routeLabels: Record<string, string> = {
  CERTIFICATE: 'Certificate',
  AFFIDAVIT: 'Affidavit',
}
export function preferredFspName(tradeName: string | null, registeredName: string) {
  return tradeName || registeredName
}
export function humanCode(value: string | null) {
  return value
    ? value
        .toLowerCase()
        .replaceAll('_', ' ')
        .replace(/^./, (c) => c.toUpperCase())
    : '—'
}
export function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat('en-ZA', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Africa/Johannesburg',
      }).format(new Date(value))
    : '—'
}
export function formatBytes(value: number) {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}
export function formatResponse(type: QuestionTypeCode, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (Array.isArray(value))
    return value
      .filter((item): item is string | number | boolean =>
        ['string', 'number', 'boolean'].includes(typeof item),
      )
      .map((item) => String(item))
      .join(', ')
  if (type === 'BOOLEAN') return value ? 'Yes' : 'No'
  if (type === 'PERCENTAGE')
    return `${new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 2 }).format(Number(value))}%`
  if (type === 'CURRENCY')
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      maximumFractionDigits: 2,
    }).format(Number(value))
  if (type === 'NUMBER')
    return new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 4 }).format(Number(value))
  if ((type === 'DATE' || type === 'MONTH') && typeof value === 'string') return formatDate(value)
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return '—'
}
