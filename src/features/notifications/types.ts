export type NotificationCategory =
  'SUBMISSION_UPDATES' | 'SUBMISSION_REMINDERS' | 'REVIEW_ASSIGNMENTS' | 'REVIEW_OUTCOMES'

export interface UserNotification {
  id: string
  eventType: string
  title: string
  body: string
  actionPath: string | null
  category: string
  priority: 'NORMAL' | 'HIGH'
  tenantId: string | null
  fspId: string | null
  submissionId: string | null
  readDate: string | null
  createDate: string
  totalCount: number
}

export interface NotificationPreference {
  category: NotificationCategory
  emailEnabled: boolean
}
