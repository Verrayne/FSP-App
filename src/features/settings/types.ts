export type ManageableTenantRole = 'ADMIN' | 'REVIEWER'

export const tenantRoleLabels: Record<ManageableTenantRole | 'VIEWER', string> = {
  ADMIN: 'Tenant Administrator',
  REVIEWER: 'Compliance Reviewer',
  VIEWER: 'Viewer',
}

export interface TenantOrganisation {
  tenantId: string
  code: string
  name: string
  status: string
  active: boolean
  updateDate: string
}

export interface TenantNotificationSettings {
  notifyAdminReviewRequired: boolean
  notifyAdminAiEvents: boolean
  reminderOffsets: number[]
  reminderSendHour: number
  timezone: string
}

export interface TenantMember {
  membershipId: string
  userId: string
  firstName: string
  lastName: string
  email: string
  role: ManageableTenantRole | 'VIEWER'
  status: string
  createDate: string
  updateDate: string
}

export interface TenantInvitation {
  invitationId: string
  email: string
  role: ManageableTenantRole
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED'
  inviteDate: string
  expiryDate: string
  deliveryStatus: 'PENDING' | 'SENT' | 'CAPTURED' | 'FAILED'
  deliveryDate: string | null
}

export interface TenantInvitationContext {
  tenantName: string
  role: ManageableTenantRole
  expiryDate: string
}

export interface QuestionnaireVersionOption {
  id: string
  name: string
  version: number
  effectiveFrom: string | null
  effectiveTo: string | null
}

export type PeriodDisplayStatus = 'DRAFT' | 'UPCOMING' | 'OPEN' | 'CLOSED'
export type ReviewMode = 'AUTOMATIC_ACCEPTANCE' | 'HUMAN_REVIEW' | 'AI_REVIEW'

export const reviewModeLabels: Record<ReviewMode, string> = {
  AUTOMATIC_ACCEPTANCE: 'Automatic Acceptance',
  HUMAN_REVIEW: 'Human Review',
  AI_REVIEW: 'AI Review',
}

export interface TenantSettingsPeriod {
  id: string
  name: string
  year: number
  storedStatus: 'DRAFT' | 'OPEN' | 'CLOSED' | 'ARCHIVED'
  displayStatus: PeriodDisplayStatus
  openDate: string
  closeDate: string
  questionnaireVersionId: string
  questionnaireName: string
  questionnaireVersion: number
  reviewMode: ReviewMode
  aiReviewAvailable: boolean
  submissionCount: number
}

export interface TenantFspRelationship {
  tenantFspId: string
  fspId: string
  fspNumber: string
  registeredName: string
  tradeName: string | null
  regulatoryStatus: string
  brokerReference: string | null
  relationshipStatus: 'ACTIVE' | 'SUSPENDED' | 'DELINKED'
  linkDate: string
  delinkDate: string | null
  submissionCount: number
}

export interface TenantFspSearchResult {
  fspId: string
  fspNumber: string
  registeredName: string
  tradeName: string | null
  regulatoryStatus: string
  relationshipId: string | null
  relationshipStatus: string | null
}
