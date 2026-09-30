import type { Json } from '../../../types/database.types'
import type { QuestionTypeCode } from './submission'

export interface SubmissionHistoryItem {
  id: string
  tenantId: string
  tenantName: string
  periodId: string
  periodName: string
  periodYear: number
  status: string
  route: string | null
  reviewMode: string
  startDate: string | null
  submitDate: string | null
  completedDate: string | null
}

export interface HistoricalDocument {
  documentId: string
  documentVersionId: string
  filename: string
  mimeType: string
  sizeBytes: number
  uploadDate: string
}

export interface SubmissionAttempt {
  id: string
  number: number
  label: string
  reviewMode: string
  route: string
  submittedBy: string | null
  submitDate: string
  questionnaireVersionId: string
  questionnaireName: string
  questionnaireVersion: number
  responseSnapshot: Json
  declaration: null | {
    title: string
    text: string
    declarantName: string | null
    acceptedDate: string | null
  }
  documents: HistoricalDocument[]
}

export interface HistoricalSection {
  id: string
  title: string
  responses: Array<{ id: string; label: string; type: QuestionTypeCode; value: string }>
}

export interface SubmissionTimelineItem {
  id: string
  fromStatus: string | null
  toStatus: string
  actorType: string
  actorLabel: string
  reason?: string | null
  occurrenceDate: string
}

export interface SubmissionAuditItem {
  id: string
  eventType: string
  eventLabel: string
  entityLabel: string
  actorLabel: string
  detail: string | null
  occurrenceDate: string
}
