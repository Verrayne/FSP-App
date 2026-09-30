import type { Json } from '../../../types/database.types'

export type QuestionTypeCode =
  | 'TEXT'
  | 'TEXTAREA'
  | 'NUMBER'
  | 'PERCENTAGE'
  | 'CURRENCY'
  | 'DATE'
  | 'MONTH'
  | 'BOOLEAN'
  | 'SINGLE_SELECT'
  | 'MULTI_SELECT'

export type QuestionValue = string | number | boolean | string[] | null

export interface ValueOption {
  id: string
  code: string
  label: string
  sortOrder: number
}

export interface SubmissionQuestion {
  id: string
  sectionId: string
  sortOrder: number
  required: boolean
  readOnly: boolean
  defaultValue: Json | null
  code: string
  label: string
  helpText: string | null
  placeholder: string | null
  validationRules: Record<string, unknown>
  type: QuestionTypeCode
  options: ValueOption[]
}

export interface SubmissionSection {
  id: string
  title: string
  description: string | null
  sortOrder: number
  questions: SubmissionQuestion[]
}

export interface QuestionCondition {
  targetQuestionId: string
  sourceQuestionId: string
  operator:
    | 'EQUALS'
    | 'NOT_EQUALS'
    | 'IN'
    | 'NOT_IN'
    | 'GREATER_THAN'
    | 'LESS_THAN'
    | 'IS_EMPTY'
    | 'IS_NOT_EMPTY'
  comparisonValue: Json | null
  action: 'SHOW' | 'HIDE' | 'REQUIRE' | 'DISABLE'
  sortOrder: number
}

export interface SubmissionDocument {
  id: string
  status: string
  currentVersion: {
    id: string
    originalFilename: string
    mimeType: string
    sizeBytes: number
    storagePath: string
    uploadDate: string
  } | null
}

export interface SubmissionDeclaration {
  id: string
  title: string
  text: string
  declarantName: string
  acceptedDate: string
}

export interface SubmissionWorkflow {
  id: string
  status:
    | 'NOT_STARTED'
    | 'IN_PROGRESS'
    | 'SUBMITTED'
    | 'UNDER_REVIEW'
    | 'HUMAN_REVIEW_REQUIRED'
    | 'CHANGES_REQUESTED'
    | 'COMPLETED'
    | 'REJECTED'
  route: 'CERTIFICATE' | 'AFFIDAVIT' | null
  tenantFspId: string
  tenantId: string
  tenantName: string
  fspId: string
  period: {
    id: string
    name: string
    openDate: string
    closeDate: string
    questionnaireVersionId: string
  }
  questionnaire: { name: string; versionNumber: number }
  sections: SubmissionSection[]
  conditions: QuestionCondition[]
  responses: Record<string, QuestionValue>
  document: SubmissionDocument | null
  declaration: SubmissionDeclaration | null
  declarationTemplate: { id: string; title: string; text: string } | null
  submitDate: string | null
  feedback?: Array<{
    summary: string | null
    title: string | null
    description: string | null
    questionId: string | null
    documentId: string | null
  }>
}
