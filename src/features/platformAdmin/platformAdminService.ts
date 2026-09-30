import { apiRequest } from '../../lib/api/client'
import { getSupabaseBrowserClient } from '../../lib/supabase/client'
import type {
  PlatformQuestion,
  PlatformQuestionnaire,
  PlatformSummary,
  PlatformTenant,
  PlatformValueSet,
  QuestionnaireVersion,
  QuestionTypeOption,
  ValueSetOption,
} from './types'

export const platformQueryKeys = {
  root: ['platform-admin'] as const,
  dashboard: () => [...platformQueryKeys.root, 'dashboard'] as const,
  tenants: () => [...platformQueryKeys.root, 'tenants'] as const,
  references: () => [...platformQueryKeys.root, 'references'] as const,
  questionnaires: () => [...platformQueryKeys.root, 'questionnaires'] as const,
  questionnaire: (versionId: string) =>
    [...platformQueryKeys.root, 'questionnaire', versionId] as const,
}

async function accessToken() {
  const session = await getSupabaseBrowserClient().auth.getSession()
  const token = session.data.session?.access_token
  if (!token) throw new Error('Authentication required')
  return token
}

export async function getPlatformDashboard(): Promise<PlatformSummary> {
  const { data, error } = await getSupabaseBrowserClient().rpc('get_platform_dashboard')
  if (error || !data?.[0]) throw error ?? new Error('Platform summary unavailable')
  const row = data[0]
  return {
    activeTenants: row.active_tenants,
    activeFsps: row.active_fsps,
    publishedQuestionnaires: row.published_questionnaires,
    draftQuestionnaires: row.draft_questionnaires,
  }
}

export async function listPlatformTenants(): Promise<PlatformTenant[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc('list_platform_tenants')
  if (error) throw error
  return data.map((row) => ({
    id: row.tenant_id,
    code: row.tenant_code,
    name: row.tenant_name,
    status: row.tenant_status as PlatformTenant['status'],
    active: row.tenant_active,
    administratorCount: row.administrator_count,
    fspCount: row.fsp_count,
    submissionPeriodCount: row.submission_period_count,
    createDate: row.create_date,
    updateDate: row.update_date,
  }))
}

export async function createPlatformTenant(values: {
  code: string
  name: string
  adminEmail: string
}) {
  return apiRequest<{
    tenantId: string
    adminEmail: string
    previewUrl?: string
    deliveryStatus: string
  }>('/api/platform/tenants', {
    method: 'POST',
    headers: { Authorization: `Bearer ${await accessToken()}` },
    body: JSON.stringify(values),
  })
}

export async function updatePlatformTenant(id: string, name: string, status: string) {
  const { error } = await getSupabaseBrowserClient().rpc('update_platform_tenant', {
    target_tenant_id: id,
    target_name: name,
    target_status: status,
  })
  if (error) throw error
}

function valueSetOptions(value: unknown): ValueSetOption[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (item): item is ValueSetOption =>
      Boolean(item) &&
      typeof item === 'object' &&
      typeof (item as ValueSetOption).code === 'string' &&
      typeof (item as ValueSetOption).label === 'string',
  )
}

export async function listPlatformValueSets(): Promise<PlatformValueSet[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc('list_platform_value_sets')
  if (error) throw error
  return data.map((row) => ({
    id: row.value_set_id,
    code: row.value_set_code,
    name: row.value_set_name,
    description: row.description,
    active: row.active,
    optionCount: row.option_count,
    options: valueSetOptions(row.options),
  }))
}

export async function createPlatformValueSet(values: {
  name: string
  description: string
  options: Array<{ label: string }>
}) {
  const { error } = await getSupabaseBrowserClient().rpc('create_platform_value_set', {
    target_code: '',
    target_name: values.name,
    target_description: values.description,
    target_options: values.options,
  })
  if (error) throw error
}

export async function listQuestionTypes(): Promise<QuestionTypeOption[]> {
  const { data, error } = await getSupabaseBrowserClient()
    .from('question_types')
    .select('id,code,name,allows_value_set')
    .eq('active', true)
    .order('name')
  if (error) throw error
  return data.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    allowsValueSet: row.allows_value_set,
  }))
}

export async function listPlatformQuestions(): Promise<PlatformQuestion[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc('list_platform_questions')
  if (error) throw error
  return data.map((row) => ({
    id: row.question_id,
    code: row.question_code,
    label: row.question_label,
    helpText: row.help_text,
    typeId: row.question_type_id,
    typeCode: row.question_type_code,
    typeName: row.question_type_name,
    valueSetId: row.value_set_id,
    valueSetName: row.value_set_name,
    active: row.active,
  }))
}

export async function createPlatformQuestion(values: {
  label: string
  helpText: string
  questionTypeId: string
  valueSetId: string | null
}) {
  const { error } = await getSupabaseBrowserClient().rpc('create_platform_question', {
    target_code: '',
    target_label: values.label,
    target_help_text: values.helpText,
    target_question_type_id: values.questionTypeId,
    target_value_set_id: values.valueSetId ?? (null as unknown as string),
  })
  if (error) throw error
}

export async function listPlatformQuestionnaires(): Promise<PlatformQuestionnaire[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc('list_platform_questionnaires')
  if (error) throw error
  return data.map((row) => ({
    id: row.questionnaire_id,
    tenantId: row.tenant_id,
    tenantName: row.tenant_name,
    code: row.questionnaire_code,
    name: row.questionnaire_name,
    description: row.description,
    active: row.active,
    latestVersionId: row.latest_version_id,
    latestVersion: row.latest_version,
    latestStatus: row.latest_status as PlatformQuestionnaire['latestStatus'],
    sectionCount: row.section_count,
    questionCount: row.question_count,
  }))
}

export async function createPlatformQuestionnaire(values: {
  tenantId: string | null
  name: string
  description: string
}) {
  const { data, error } = await getSupabaseBrowserClient().rpc('create_platform_questionnaire', {
    target_tenant_id: values.tenantId ?? (null as unknown as string),
    target_code: '',
    target_name: values.name,
    target_description: values.description,
  })
  if (error || !data?.[0]) throw error ?? new Error('Questionnaire was not created')
  return { questionnaireId: data[0].questionnaire_id, versionId: data[0].version_id }
}

export async function getQuestionnaireVersion(versionId: string): Promise<QuestionnaireVersion> {
  const { data, error } = await getSupabaseBrowserClient().rpc(
    'get_platform_questionnaire_version',
    { target_version_id: versionId },
  )
  if (error || !data) throw error ?? new Error('Questionnaire version unavailable')
  return data as unknown as QuestionnaireVersion
}

export async function addQuestionnaireSection(
  versionId: string,
  values: { title: string; description: string },
) {
  const { error } = await getSupabaseBrowserClient().rpc('add_platform_questionnaire_section', {
    target_version_id: versionId,
    target_code: '',
    target_title: values.title,
    target_description: values.description,
  })
  if (error) throw error
}

export async function addQuestionnaireQuestion(
  versionId: string,
  sectionId: string,
  questionId: string,
  required: boolean,
) {
  const { error } = await getSupabaseBrowserClient().rpc('add_platform_questionnaire_question', {
    target_version_id: versionId,
    target_section_id: sectionId,
    target_question_id: questionId,
    target_required: required,
  })
  if (error) throw error
}

export async function removeQuestionnaireItem(itemId: string, type: 'SECTION' | 'QUESTION') {
  const { error } = await getSupabaseBrowserClient().rpc('remove_platform_questionnaire_item', {
    target_item_id: itemId,
    target_item_type: type,
  })
  if (error) throw error
}

export async function publishQuestionnaire(
  versionId: string,
  effectiveFrom: string,
  effectiveTo: string | null,
) {
  const { error } = await getSupabaseBrowserClient().rpc('publish_platform_questionnaire', {
    target_version_id: versionId,
    target_effective_from: effectiveFrom,
    target_effective_to: effectiveTo ?? (null as unknown as string),
  })
  if (error) throw error
}

export async function createQuestionnaireVersion(questionnaireId: string) {
  const { data, error } = await getSupabaseBrowserClient().rpc(
    'create_platform_questionnaire_version',
    { target_questionnaire_id: questionnaireId },
  )
  if (error) throw error
  return data
}
