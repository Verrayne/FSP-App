export type SubmissionStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'HUMAN_REVIEW_REQUIRED'
  | 'CHANGES_REQUESTED'
  | 'COMPLETED'
  | 'REJECTED'

export type SubmissionPeriodStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'ARCHIVED'

export interface DashboardRelationship {
  id: string
  tenantId: string
  tenantName: string
  brokerReference: string | null
}

export interface DashboardPeriod {
  id: string
  name: string
  year: number
  openDate: string
  closeDate: string
  status: SubmissionPeriodStatus
}

export interface DashboardSubmission {
  id: string
  periodId: string
  status: SubmissionStatus
  route: 'CERTIFICATE' | 'AFFIDAVIT' | null
  startDate: string | null
  submitDate: string | null
  updateDate: string
}

export interface DashboardSummary {
  period: DashboardPeriod | null
  submission: DashboardSubmission | null
  previousSubmission: DashboardSubmission | null
}

export interface DashboardAction {
  label: string
  href: string | null
  readOnly: boolean
}
