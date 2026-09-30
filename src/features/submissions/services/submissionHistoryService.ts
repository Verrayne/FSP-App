import { getSupabaseBrowserClient } from '../../../lib/supabase/client'
import type { Json } from '../../../types/database.types'
import { formatResponse } from '../../admin/lib/presentation'
import { submissionAttemptLabel } from '../lib/historyPresentation'
import type { QuestionTypeCode } from '../types/submission'
import type {
  HistoricalDocument,
  HistoricalSection,
  SubmissionAttempt,
  SubmissionAuditItem,
  SubmissionHistoryItem,
  SubmissionTimelineItem,
} from '../types/history'

export const submissionHistoryQueryKeys = {
  root: ['submission-history'] as const,
  list: (fspId: string, periodId: string, status: string) =>
    [...submissionHistoryQueryKeys.root, 'fsp', fspId, periodId, status] as const,
  attempts: (scope: 'fsp' | 'tenant', scopeId: string, submissionId: string) =>
    [...submissionHistoryQueryKeys.root, scope, scopeId, submissionId, 'attempts'] as const,
  attempt: (scope: 'fsp' | 'tenant', scopeId: string, submissionId: string, attemptId: string) =>
    [...submissionHistoryQueryKeys.root, scope, scopeId, submissionId, attemptId] as const,
  timeline: (scope: 'fsp' | 'tenant', scopeId: string, submissionId: string) =>
    [...submissionHistoryQueryKeys.root, scope, scopeId, submissionId, 'timeline'] as const,
  audit: (tenantId: string, submissionId: string, page: number) =>
    [...submissionHistoryQueryKeys.root, 'tenant', tenantId, submissionId, 'audit', page] as const,
}

export async function listFspSubmissionHistory(
  fspId: string,
  periodId: string,
  status: string,
): Promise<SubmissionHistoryItem[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc('list_my_fsp_submission_history', {
    target_fsp_id: fspId,
    target_period_id: periodId || undefined,
    target_status: status || undefined,
  })
  if (error) throw new Error('Submission history could not be loaded.')
  return data.map((row) => ({
    id: row.submission_id,
    tenantId: row.tenant_id,
    tenantName: row.tenant_name,
    periodId: row.period_id,
    periodName: row.period_name,
    periodYear: row.period_year,
    status: row.submission_status,
    route: row.submission_route,
    reviewMode: row.review_mode,
    startDate: row.start_date,
    submitDate: row.submit_date,
    completedDate: row.completed_date,
  }))
}

type AttemptRow = {
  attempt_id: string
  attempt_number: number
  review_mode: string
  submission_route: string
  submitted_by_name: string | null
  submit_date: string
  questionnaire_version_id: string
  questionnaire_name: string
  questionnaire_version: number
  response_snapshot: Json
  declaration_snapshot: Json
  declaration_title: string | null
  declaration_text: string | null
  documents: Json
}

function objectValue(value: Json): Record<string, Json | undefined> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null
}

function attemptFromRow(row: AttemptRow): SubmissionAttempt {
  const declaration = objectValue(row.declaration_snapshot)
  const documents = Array.isArray(row.documents) ? row.documents : []
  return {
    id: row.attempt_id,
    number: row.attempt_number,
    label: submissionAttemptLabel(row.attempt_number),
    reviewMode: row.review_mode,
    route: row.submission_route,
    submittedBy: row.submitted_by_name,
    submitDate: row.submit_date,
    questionnaireVersionId: row.questionnaire_version_id,
    questionnaireName: row.questionnaire_name,
    questionnaireVersion: row.questionnaire_version,
    responseSnapshot: row.response_snapshot,
    declaration:
      declaration && row.declaration_title && row.declaration_text
        ? {
            title: row.declaration_title,
            text: row.declaration_text,
            declarantName:
              typeof declaration.declarant_name === 'string' ? declaration.declarant_name : null,
            acceptedDate:
              typeof declaration.accepted_date === 'string' ? declaration.accepted_date : null,
          }
        : null,
    documents: documents.flatMap((value): HistoricalDocument[] => {
      const item = objectValue(value)
      return item &&
        typeof item.document_id === 'string' &&
        typeof item.document_version_id === 'string' &&
        typeof item.filename === 'string' &&
        typeof item.mime_type === 'string' &&
        typeof item.size_bytes === 'number' &&
        typeof item.upload_date === 'string'
        ? [
            {
              documentId: item.document_id,
              documentVersionId: item.document_version_id,
              filename: item.filename,
              mimeType: item.mime_type,
              sizeBytes: item.size_bytes,
              uploadDate: item.upload_date,
            },
          ]
        : []
    }),
  }
}

export async function listSubmissionAttempts(
  scope: 'fsp' | 'tenant',
  scopeId: string,
  submissionId: string,
): Promise<SubmissionAttempt[]> {
  const client = getSupabaseBrowserClient()
  const result =
    scope === 'fsp'
      ? await client.rpc('list_fsp_submission_attempts', {
          target_fsp_id: scopeId,
          target_submission_id: submissionId,
        })
      : await client.rpc('list_tenant_submission_attempts', {
          target_tenant_id: scopeId,
          target_submission_id: submissionId,
        })
  if (result.error) throw new Error('Submission versions could not be loaded.')
  return (result.data as AttemptRow[]).map(attemptFromRow)
}

export async function loadHistoricalSections(
  attempt: SubmissionAttempt,
): Promise<HistoricalSection[]> {
  const client = getSupabaseBrowserClient()
  const [sectionsResult, placementsResult] = await Promise.all([
    client
      .from('questionnaire_sections')
      .select('id,title,sort_order')
      .eq('questionnaire_version_id', attempt.questionnaireVersionId)
      .order('sort_order'),
    client
      .from('questionnaire_questions')
      .select(
        'id,section_id,sort_order,question:questions!questionnaire_questions_question_id_fkey(label,type:question_types!questions_question_type_id_fkey(code))',
      )
      .eq('questionnaire_version_id', attempt.questionnaireVersionId)
      .order('sort_order'),
  ])
  if (sectionsResult.error || placementsResult.error)
    throw new Error('Historical answers could not be loaded.')
  const snapshots = Array.isArray(attempt.responseSnapshot) ? attempt.responseSnapshot : []
  const snapshotMap = new Map<string, Record<string, Json | undefined>>()
  for (const value of snapshots) {
    const item = objectValue(value)
    if (item && typeof item.questionnaire_question_id === 'string')
      snapshotMap.set(item.questionnaire_question_id, item)
  }
  const optionIds = snapshots.flatMap((value) => {
    const item = objectValue(value)
    const multiple = Array.isArray(item?.selected_option_ids) ? item.selected_option_ids : []
    const single = typeof item?.selected_option_id === 'string' ? [item.selected_option_id] : []
    return [...multiple, ...single].filter((id): id is string => typeof id === 'string')
  })
  const optionsResult = optionIds.length
    ? await client.from('value_set_options').select('id,label,sort_order').in('id', optionIds)
    : { data: [], error: null }
  if (optionsResult.error) throw new Error('Historical answer labels could not be loaded.')
  const options = new Map((optionsResult.data ?? []).map((option) => [option.id, option]))
  return (sectionsResult.data ?? []).map((section) => ({
    id: section.id,
    title: section.title,
    responses: (placementsResult.data ?? [])
      .filter((placement) => placement.section_id === section.id && snapshotMap.has(placement.id))
      .map((placement) => {
        const snapshot = snapshotMap.get(placement.id)!
        const type = placement.question.type.code as QuestionTypeCode
        const selectedIds = Array.isArray(snapshot.selected_option_ids)
          ? snapshot.selected_option_ids.filter((id): id is string => typeof id === 'string')
          : []
        const raw = selectedIds.length
          ? selectedIds
              .map((id) => options.get(id))
              .filter(Boolean)
              .sort((a, b) => a!.sort_order - b!.sort_order)
              .map((option) => option!.label)
          : typeof snapshot.selected_option_id === 'string'
            ? options.get(snapshot.selected_option_id)?.label
            : (snapshot.text_value ??
              snapshot.numeric_value ??
              snapshot.date_value ??
              snapshot.boolean_value ??
              null)
        return {
          id: placement.id,
          label: placement.question.label,
          type,
          value: formatResponse(type, raw),
        }
      }),
  }))
}

export async function listSubmissionTimeline(
  scope: 'fsp' | 'tenant',
  scopeId: string,
  submissionId: string,
): Promise<SubmissionTimelineItem[]> {
  const client = getSupabaseBrowserClient()
  const result =
    scope === 'fsp'
      ? await client.rpc('list_fsp_submission_timeline', {
          target_fsp_id: scopeId,
          target_submission_id: submissionId,
        })
      : await client.rpc('list_tenant_submission_timeline', {
          target_tenant_id: scopeId,
          target_submission_id: submissionId,
        })
  if (result.error) throw new Error('Status history could not be loaded.')
  return result.data.map((row) => ({
    id: row.history_id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    actorType: row.actor_type,
    actorLabel: row.actor_label,
    reason: 'reason' in row && typeof row.reason === 'string' ? row.reason : null,
    occurrenceDate: row.occurrence_date,
  }))
}

export async function listTenantSubmissionAudit(
  tenantId: string,
  submissionId: string,
  page: number,
  pageSize = 25,
): Promise<{ items: SubmissionAuditItem[]; total: number }> {
  const { data, error } = await getSupabaseBrowserClient().rpc('list_tenant_submission_audit', {
    target_tenant_id: tenantId,
    target_submission_id: submissionId,
    page_number: page,
    page_size: pageSize,
  })
  if (error) throw new Error('Audit trail could not be loaded.')
  return {
    items: data.map((row) => ({
      id: row.audit_id,
      eventType: row.event_type,
      eventLabel: row.event_label,
      entityLabel: row.entity_label,
      actorLabel: row.actor_label,
      detail: row.event_detail || null,
      occurrenceDate: row.occurrence_date,
    })),
    total: Number(data[0]?.total_count ?? 0),
  }
}

async function downloadHistoricalDocument(
  scope: 'fsp' | 'tenant',
  scopeId: string,
  submissionId: string,
  attemptId: string,
  document: HistoricalDocument,
) {
  const { data } = await getSupabaseBrowserClient().auth.getSession()
  if (!data.session) throw new Error('Authentication is required.')
  const prefix = scope === 'fsp' ? '/api/submissions' : '/api/admin/submissions'
  const response = await fetch(
    `${prefix}/${submissionId}/attempts/${attemptId}/documents/${document.documentVersionId}`,
    {
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        [scope === 'fsp' ? 'x-fsp-id' : 'x-tenant-id']: scopeId,
      },
    },
  )
  if (!response.ok) throw new Error('Document download failed.')
  const url = URL.createObjectURL(await response.blob())
  const anchor = window.document.createElement('a')
  anchor.href = url
  anchor.download = document.filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export { downloadHistoricalDocument }
