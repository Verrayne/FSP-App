export interface PlatformSummary {
  activeTenants: number
  activeFsps: number
  publishedQuestionnaires: number
  draftQuestionnaires: number
}

export interface PlatformTenant {
  id: string
  code: string
  name: string
  status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED'
  active: boolean
  administratorCount: number
  fspCount: number
  submissionPeriodCount: number
  createDate: string
  updateDate: string
}

export interface ValueSetOption {
  id?: string
  code: string
  label: string
  sortOrder?: number
  active?: boolean
}

export interface PlatformValueSet {
  id: string
  code: string
  name: string
  description: string | null
  active: boolean
  optionCount: number
  options: ValueSetOption[]
}

export interface PlatformQuestion {
  id: string
  code: string
  label: string
  helpText: string | null
  typeId: string
  typeCode: string
  typeName: string
  valueSetId: string | null
  valueSetName: string | null
  active: boolean
}

export interface QuestionTypeOption {
  id: string
  code: string
  name: string
  allowsValueSet: boolean
}

export interface PlatformQuestionnaire {
  id: string
  tenantId: string | null
  tenantName: string | null
  code: string
  name: string
  description: string | null
  active: boolean
  latestVersionId: string
  latestVersion: number
  latestStatus: 'DRAFT' | 'PUBLISHED' | 'RETIRED'
  sectionCount: number
  questionCount: number
}

export interface QuestionnaireVersionQuestion {
  id: string
  questionId: string
  code: string
  label: string
  typeCode: string
  valueSetName: string | null
  required: boolean
  sortOrder: number
}

export interface QuestionnaireVersionSection {
  id: string
  code: string
  title: string
  description: string | null
  sortOrder: number
  questions: QuestionnaireVersionQuestion[]
}

export interface QuestionnaireVersion {
  questionnaireId: string
  versionId: string
  code: string
  name: string
  description: string | null
  tenantId: string | null
  tenantName: string | null
  versionNumber: number
  status: 'DRAFT' | 'PUBLISHED' | 'RETIRED'
  effectiveFrom: string | null
  effectiveTo: string | null
  sections: QuestionnaireVersionSection[]
}
