import type { QuestionTypeCode } from '../submissions/types/submission'

export type TenantRole = 'ADMIN' | 'REVIEWER' | 'VIEWER'

export interface TenantMembership {
  membershipId: string
  tenantId: string
  code: string
  name: string
  role: TenantRole
}

export interface TenantDashboardMetrics {
  period: null | { id: string; name: string; year: number; openDate: string; closeDate: string }
  totalFsps: number
  submittedFsps: number
  outstandingFsps: number
  underReviewSubmissions: number
  completedSubmissions: number
}

export type TenantSubmissionStatus =
  | 'OUTSTANDING'
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'HUMAN_REVIEW_REQUIRED'
  | 'CHANGES_REQUESTED'
  | 'COMPLETED'
  | 'REJECTED'

export type ReviewMode = 'AUTOMATIC_ACCEPTANCE' | 'HUMAN_REVIEW' | 'AI_REVIEW'

export interface TenantFspListItem {
  tenantFspId: string
  fspId: string
  fspNumber: string
  registeredName: string
  tradeName: string | null
  regulatoryStatus: string | null
  brokerReference: string | null
  relationshipStatus: string
  submissionId: string | null
  submissionStatus: TenantSubmissionStatus
  submissionRoute: 'CERTIFICATE' | 'AFFIDAVIT' | null
  submitDate: string | null
  periodId: string | null
  periodName: string | null
}

export interface TenantSubmissionListItem {
  submissionId: string
  tenantFspId: string
  fspId: string
  fspNumber: string
  registeredName: string
  tradeName: string | null
  brokerReference: string | null
  periodId: string
  periodName: string
  periodYear: number
  status: Exclude<TenantSubmissionStatus, 'OUTSTANDING'>
  route: 'CERTIFICATE' | 'AFFIDAVIT' | null
  reviewMode: ReviewMode
  reviewStatus: string | null
  startDate: string | null
  submitDate: string | null
}

export interface PagedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface TenantPeriod {
  id: string
  name: string
  year: number
  status: string
  openDate: string
  closeDate: string
}

export interface TenantSubmissionOverview {
  id: string
  fspNumber: string
  fspName: string
  brokerReference: string | null
  period: TenantPeriod
  questionnaire: { name: string; version: number }
  status: string
  reviewMode: ReviewMode
  route: string | null
  startDate: string | null
  submitDate: string | null
  sections: Array<{
    id: string
    title: string
    responses: Array<{ id: string; label: string; type: QuestionTypeCode; value: string }>
  }>
  documents: Array<{
    id: string
    filename: string
    mimeType: string
    sizeBytes: number
    uploadDate: string
  }>
  declaration: null | { title: string; declarantName: string; acceptedDate: string }
  reviews: TenantSubmissionReview[]
  findings: TenantSubmissionFinding[]
}

export interface TenantSubmissionReview {
  attemptNumber: number
  id: string | null
  type: 'AUTOMATIC' | 'HUMAN' | 'AI' | null
  status: string | null
  outcome: string | null
  reviewerName: string | null
  summary: string | null
  provider: string | null
  model: string | null
  configVersion: string | null
  ruleSetVersion: string | null
  retryCount: number
  startDate: string | null
  completeDate: string | null
}

export interface TenantSubmissionFinding {
  id: string
  reviewId: string
  attemptNumber: number
  code: string | null
  category: string
  severity: 'INFO' | 'WARNING' | 'BLOCKING'
  title: string
  description: string
  source: 'DETERMINISTIC_RULE' | 'AI' | 'HUMAN' | 'SYSTEM'
  questionId: string | null
  documentId: string | null
  resolutionStatus: string
  confidence: string | null
  createDate: string
}
