import { getSupabaseBrowserClient } from '../../../lib/supabase/client'
import type { Json } from '../../../types/database.types'
import type {
  QuestionCondition,
  QuestionTypeCode,
  QuestionValue,
  SubmissionQuestion,
  SubmissionWorkflow,
  ValueOption,
} from '../types/submission'

export const submissionQueryKeys = {
  root: ['submission-workflow'] as const,
  detail: (fspId: string, tenantFspId: string, submissionId: string) =>
    [...submissionQueryKeys.root, fspId, tenantFspId, submissionId] as const,
}

function dataOrThrow<T>(data: T | null, error: { message: string } | null): T {
  if (error || data === null) throw new Error('The submission request could not be completed.')
  return data
}

function optionalDataOrThrow<T>(data: T | null, error: { message: string } | null): T | null {
  if (error) throw new Error('The submission request could not be completed.')
  return data
}

export async function startSubmission(periodId: string, tenantFspId: string) {
  const { data, error } = await getSupabaseBrowserClient().rpc('start_submission', {
    target_period_id: periodId,
    target_tenant_fsp_id: tenantFspId,
  })
  const row = dataOrThrow(data, error)[0]
  if (!row) throw new Error('The submission could not be started.')
  return { id: row.submission_id, status: row.submission_status, route: row.submission_route }
}

export async function loadSubmissionWorkflow(
  submissionId: string,
  expectedFspId: string,
): Promise<SubmissionWorkflow> {
  const client = getSupabaseBrowserClient()
  const { data: detailData, error: detailError } = await client
    .from('submissions')
    .select(
      'id, status, submission_route, tenant_fsp_id, submit_date, period:submission_periods!submissions_submission_period_id_fkey(id, name, open_date, close_date, tenant_id, questionnaire_version_id, questionnaire_version:questionnaire_versions!submission_periods_questionnaire_version_id_fkey(status, version_number, questionnaire:questionnaires!questionnaire_versions_questionnaire_id_fkey(name))), relationship:tenant_fsps!submissions_tenant_fsp_id_fkey(id, fsp_id, tenant:tenants!tenant_fsps_tenant_id_fkey(name))',
    )
    .eq('id', submissionId)
    .single()
  const detail = dataOrThrow(detailData, detailError)
  if (detail.relationship.fsp_id !== expectedFspId)
    throw new Error('This submission is not available in the current FSP context.')
  if (detail.period.questionnaire_version.status !== 'PUBLISHED')
    throw new Error('The configured questionnaire is not published.')

  const versionId = detail.period.questionnaire_version_id
  const [
    sectionsResult,
    placementsResult,
    conditionsResult,
    responsesResult,
    documentsResult,
    declarationResult,
    templateResult,
    feedbackResult,
  ] = await Promise.all([
    client
      .from('questionnaire_sections')
      .select('id, title, description, sort_order')
      .eq('questionnaire_version_id', versionId)
      .order('sort_order'),
    client
      .from('questionnaire_questions')
      .select(
        'id, section_id, sort_order, required, read_only, default_value, question:questions!questionnaire_questions_question_id_fkey(code, label, help_text, placeholder, validation_rules, value_set_id, type:question_types!questions_question_type_id_fkey(code))',
      )
      .eq('questionnaire_version_id', versionId)
      .order('sort_order'),
    client
      .from('question_conditions')
      .select(
        'questionnaire_question_id, source_questionnaire_question_id, operator, comparison_value, action, sort_order',
      )
      .in('questionnaire_question_id', await placementIds(client, versionId))
      .order('sort_order'),
    client
      .from('submission_responses')
      .select(
        'id, questionnaire_question_id, text_value, numeric_value, date_value, boolean_value, selected_option_id, options:submission_response_options(value_set_option_id)',
      )
      .eq('submission_id', submissionId),
    client
      .from('documents')
      .select(
        'id, status, current_version_id, versions:document_versions!document_versions_document_id_fkey(id, original_filename, mime_type, size_bytes, storage_path, upload_date)',
      )
      .eq('submission_id', submissionId)
      .eq('document_type', 'BBEEE_CERTIFICATE'),
    client
      .from('submission_declarations')
      .select(
        'id, declarant_name, accepted_date, template:declaration_templates!submission_declarations_declaration_template_id_fkey(title, declaration_text)',
      )
      .eq('submission_id', submissionId)
      .maybeSingle(),
    client
      .from('declaration_templates')
      .select('id, title, declaration_text')
      .eq('questionnaire_version_id', versionId)
      .eq('active', true)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle(),
    detail.status === 'CHANGES_REQUESTED' || detail.status === 'REJECTED'
      ? client.rpc('get_my_submission_feedback', { target_submission_id: submissionId })
      : Promise.resolve({ data: [], error: null }),
  ])

  const placements = dataOrThrow(placementsResult.data, placementsResult.error)
  const valueSetIds = [
    ...new Set(placements.map((row) => row.question.value_set_id).filter(Boolean)),
  ] as string[]
  const optionsResult = valueSetIds.length
    ? await client
        .from('value_set_options')
        .select('id, value_set_id, code, label, sort_order')
        .in('value_set_id', valueSetIds)
        .eq('active', true)
        .order('sort_order')
    : { data: [], error: null }
  const options = dataOrThrow(optionsResult.data, optionsResult.error)
  const byValueSet = new Map<string, ValueOption[]>()
  for (const option of options) {
    const list = byValueSet.get(option.value_set_id) ?? []
    list.push({
      id: option.id,
      code: option.code,
      label: option.label,
      sortOrder: option.sort_order,
    })
    byValueSet.set(option.value_set_id, list)
  }

  const questions: SubmissionQuestion[] = placements.map((row) => ({
    id: row.id,
    sectionId: row.section_id,
    sortOrder: row.sort_order,
    required: row.required,
    readOnly: row.read_only,
    defaultValue: row.default_value,
    code: row.question.code,
    label: row.question.label,
    helpText: row.question.help_text,
    placeholder: row.question.placeholder,
    validationRules: (row.question.validation_rules as Record<string, unknown> | null) ?? {},
    type: row.question.type.code as QuestionTypeCode,
    options: row.question.value_set_id ? (byValueSet.get(row.question.value_set_id) ?? []) : [],
  }))
  const responses: Record<string, QuestionValue> = {}
  for (const response of dataOrThrow(responsesResult.data, responsesResult.error)) {
    responses[response.questionnaire_question_id] =
      response.options.length > 0
        ? response.options.map((item) => item.value_set_option_id)
        : (response.selected_option_id ??
          response.text_value ??
          response.numeric_value ??
          response.date_value ??
          response.boolean_value ??
          null)
  }
  for (const question of questions) {
    if (responses[question.id] === undefined && question.defaultValue !== null)
      responses[question.id] = question.defaultValue as QuestionValue
  }
  const conditions: QuestionCondition[] = dataOrThrow(
    conditionsResult.data,
    conditionsResult.error,
  ).map((row) => ({
    targetQuestionId: row.questionnaire_question_id,
    sourceQuestionId: row.source_questionnaire_question_id,
    operator: row.operator as QuestionCondition['operator'],
    comparisonValue: row.comparison_value,
    action: row.action as QuestionCondition['action'],
    sortOrder: row.sort_order,
  }))
  const currentDocument = dataOrThrow(documentsResult.data, documentsResult.error)[0] ?? null
  const currentVersion = currentDocument?.versions.find(
    (version) => version.id === currentDocument.current_version_id,
  )
  const declaration = optionalDataOrThrow(declarationResult.data, declarationResult.error)
  const template = optionalDataOrThrow(templateResult.data, templateResult.error)
  const feedback = dataOrThrow(feedbackResult.data, feedbackResult.error)

  return {
    id: detail.id,
    status: detail.status as SubmissionWorkflow['status'],
    route: detail.submission_route as SubmissionWorkflow['route'],
    tenantFspId: detail.tenant_fsp_id,
    tenantId: detail.period.tenant_id,
    tenantName: detail.relationship.tenant.name,
    fspId: detail.relationship.fsp_id,
    period: {
      id: detail.period.id,
      name: detail.period.name,
      openDate: detail.period.open_date,
      closeDate: detail.period.close_date,
      questionnaireVersionId: versionId,
    },
    questionnaire: {
      name: detail.period.questionnaire_version.questionnaire.name,
      versionNumber: detail.period.questionnaire_version.version_number,
    },
    sections: dataOrThrow(sectionsResult.data, sectionsResult.error).map((section) => ({
      id: section.id,
      title: section.title,
      description: section.description,
      sortOrder: section.sort_order,
      questions: questions.filter((question) => question.sectionId === section.id),
    })),
    conditions,
    responses,
    document: currentDocument
      ? {
          id: currentDocument.id,
          status: currentDocument.status,
          currentVersion: currentVersion
            ? {
                id: currentVersion.id,
                originalFilename: currentVersion.original_filename,
                mimeType: currentVersion.mime_type,
                sizeBytes: currentVersion.size_bytes,
                storagePath: currentVersion.storage_path,
                uploadDate: currentVersion.upload_date,
              }
            : null,
        }
      : null,
    declaration: declaration
      ? {
          id: declaration.id,
          title: declaration.template.title,
          text: declaration.template.declaration_text,
          declarantName: declaration.declarant_name,
          acceptedDate: declaration.accepted_date,
        }
      : null,
    declarationTemplate: template
      ? { id: template.id, title: template.title, text: template.declaration_text }
      : null,
    submitDate: detail.submit_date,
    feedback: feedback.map((row) => ({
      summary: row.summary,
      title: row.finding_title,
      description: row.finding_description,
      questionId: row.questionnaire_question_id,
      documentId: row.document_id,
    })),
  }
}

async function placementIds(
  client: ReturnType<typeof getSupabaseBrowserClient>,
  versionId: string,
) {
  const { data, error } = await client
    .from('questionnaire_questions')
    .select('id')
    .eq('questionnaire_version_id', versionId)
  return dataOrThrow(data, error).map((row) => row.id)
}

export async function saveSubmissionResponse(
  submissionId: string,
  questionId: string,
  value: QuestionValue,
) {
  const { data, error } = await getSupabaseBrowserClient().rpc('save_submission_response', {
    target_question_id: questionId,
    target_submission_id: submissionId,
    target_value: value as Json,
  })
  return dataOrThrow(data, error)[0]
}

export async function acknowledgeDeclaration(submissionId: string) {
  const { data, error } = await getSupabaseBrowserClient().rpc(
    'acknowledge_submission_declaration',
    { target_submission_id: submissionId },
  )
  return dataOrThrow(data, error)[0]
}

export async function submitSubmission(submissionId: string) {
  const { data, error } = await getSupabaseBrowserClient().rpc('submit_submission', {
    target_submission_id: submissionId,
  })
  return dataOrThrow(data, error)[0]
}

export async function reopenSubmissionForChanges(submissionId: string) {
  const { data, error } = await getSupabaseBrowserClient().rpc('reopen_submission_for_changes', {
    target_submission_id: submissionId,
  })
  return dataOrThrow(data, error)[0]
}

export const CERTIFICATE_MAX_BYTES = 4 * 1024 * 1024

export async function validateCertificateFile(file: File) {
  if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf'))
    throw new Error('Choose a PDF certificate.')
  if (file.size < 5 || file.size > CERTIFICATE_MAX_BYTES)
    throw new Error('The PDF must be no larger than 4 MB.')
  const signature = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer())
  if (signature !== '%PDF-') throw new Error('The selected file is not a valid PDF.')
}

async function sha256(file: File) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function uploadCertificate(submissionId: string, file: File) {
  await validateCertificateFile(file)
  const hash = await sha256(file)
  if (!import.meta.env.DEV) {
    const { data: sessionData } = await getSupabaseBrowserClient().auth.getSession()
    const response = await fetch(`/api/submissions/${submissionId}/certificate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sessionData.session?.access_token ?? ''}`,
        'Content-Type': 'application/pdf',
        'X-Original-Filename': encodeURIComponent(file.name),
        'X-Content-SHA256': hash,
      },
      body: file,
    })
    if (!response.ok) throw new Error('The certificate could not be uploaded.')
    return (await response.json()) as { documentId: string; documentVersionId: string }
  }

  const client = getSupabaseBrowserClient()
  const { data, error } = await client.rpc('prepare_certificate_upload', {
    target_filename: file.name,
    target_mime_type: file.type,
    target_sha256: hash,
    target_size_bytes: file.size,
    target_submission_id: submissionId,
  })
  const prepared = dataOrThrow(data, error)[0]
  if (!prepared) throw new Error('The certificate upload could not be prepared.')
  const uploaded = await client.storage
    .from('compliance-documents')
    .upload(prepared.storage_path, file, { contentType: 'application/pdf', upsert: false })
  if (uploaded.error) {
    await client.rpc('cancel_certificate_upload', {
      target_document_version_id: prepared.document_version_id,
    })
    throw new Error('The certificate could not be uploaded.')
  }
  const finalized = await client.rpc('finalize_certificate_upload', {
    target_document_version_id: prepared.document_version_id,
  })
  if (finalized.error) throw new Error('The certificate upload could not be finalized.')
  return { documentId: prepared.document_id, documentVersionId: prepared.document_version_id }
}

export async function createCertificateUrl(path: string) {
  const { data, error } = await getSupabaseBrowserClient()
    .storage.from('compliance-documents')
    .createSignedUrl(path, 60, { download: true })
  return dataOrThrow(data, error).signedUrl
}
