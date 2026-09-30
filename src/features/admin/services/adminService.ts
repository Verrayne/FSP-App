import { getSupabaseBrowserClient } from '../../../lib/supabase/client'
import { southAfricanDateKey } from '../../dashboard/services/dashboardService'
import { formatResponse, preferredFspName } from '../lib/presentation'
import type { PortfolioFilters, SubmissionFilters } from '../types'
import type {
  PagedResult,
  TenantDashboardMetrics,
  TenantFspListItem,
  TenantPeriod,
  TenantSubmissionListItem,
  TenantSubmissionOverview,
} from '../../tenant/types'
import type { QuestionTypeCode } from '../../submissions/types/submission'

export const adminQueryKeys = {
  dashboard: (tenantId: string) => ['tenant-dashboard', tenantId] as const,
  recent: (tenantId: string) => ['tenant-dashboard', tenantId, 'recent'] as const,
  periods: (tenantId: string) => ['tenant-periods', tenantId] as const,
  fsps: (tenantId: string, filters: PortfolioFilters) =>
    ['tenant-fsps', tenantId, filters] as const,
  submissions: (tenantId: string, filters: SubmissionFilters) =>
    ['tenant-submissions', tenantId, filters] as const,
  submission: (tenantId: string, id: string) => ['tenant-submission', tenantId, id] as const,
}

export async function getTenantDashboard(tenantId: string): Promise<TenantDashboardMetrics> {
  const client = getSupabaseBrowserClient()
  const today = southAfricanDateKey()
  const [{ data, error }, reviewMetrics] = await Promise.all([
    client.rpc('get_tenant_dashboard', { target_tenant_id: tenantId, target_today: today }),
    client.rpc('get_tenant_review_dashboard', { target_tenant_id: tenantId, target_today: today }),
  ])
  const row = data?.[0]
  const reviewRow = reviewMetrics.data?.[0]
  if (error || reviewMetrics.error || !row || !reviewRow)
    throw new Error('Dashboard metrics could not be loaded.')
  return {
    period: row.period_id
      ? {
          id: row.period_id,
          name: row.period_name,
          year: row.period_year,
          openDate: row.period_open_date,
          closeDate: row.period_close_date,
        }
      : null,
    totalFsps: Number(reviewRow.total_fsps),
    submittedFsps: Number(reviewRow.submitted_fsps),
    outstandingFsps: Number(reviewRow.outstanding_fsps),
    underReviewSubmissions: Number(reviewRow.needs_review_submissions),
    completedSubmissions: Number(reviewRow.completed_submissions),
  }
}

export async function getTenantPeriods(tenantId: string): Promise<TenantPeriod[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc('list_tenant_periods', {
    target_tenant_id: tenantId,
  })
  if (error) throw new Error('Submission periods could not be loaded.')
  return data.map((row) => ({
    id: row.period_id,
    name: row.period_name,
    year: row.period_year,
    status: row.period_status,
    openDate: row.open_date,
    closeDate: row.close_date,
  }))
}

export async function getTenantFsps(
  tenantId: string,
  filters: PortfolioFilters,
): Promise<PagedResult<TenantFspListItem>> {
  const { data, error } = await getSupabaseBrowserClient().rpc('list_tenant_fsps', {
    target_tenant_id: tenantId,
    target_today: southAfricanDateKey(),
    search_query: filters.search,
    submission_filter: filters.submissionStatus || 'ALL',
    regulatory_filter: filters.regulatoryStatus || 'ALL',
    relationship_filter: filters.relationshipStatus || 'ALL',
    sort_field: filters.sort,
    sort_direction: filters.direction,
    page_number: filters.page,
    page_size: filters.pageSize,
  })
  if (error) throw new Error('FSP portfolio could not be loaded.')
  return {
    items: data.map((row) => ({
      tenantFspId: row.tenant_fsp_id,
      fspId: row.fsp_id,
      fspNumber: row.fsp_number,
      registeredName: row.registered_name,
      tradeName: row.trade_name,
      regulatoryStatus: row.regulatory_status,
      brokerReference: row.broker_reference,
      relationshipStatus: row.relationship_status,
      submissionId: row.submission_id,
      submissionStatus: row.submission_status as TenantFspListItem['submissionStatus'],
      submissionRoute: row.submission_route as TenantFspListItem['submissionRoute'],
      submitDate: row.submit_date,
      periodId: row.period_id,
      periodName: row.period_name,
    })),
    total: Number(data[0]?.total_count ?? 0),
    page: filters.page,
    pageSize: filters.pageSize,
  }
}

export async function getTenantSubmissions(
  tenantId: string,
  filters: SubmissionFilters,
): Promise<PagedResult<TenantSubmissionListItem>> {
  const { data, error } = await getSupabaseBrowserClient().rpc('list_tenant_review_submissions', {
    target_tenant_id: tenantId,
    target_today: southAfricanDateKey(),
    target_period_id: filters.periodId as string,
    search_query: filters.search,
    work_filter: filters.work || 'NEEDS_REVIEW',
    review_mode_filter: filters.reviewMode || 'ALL',
    route_filter: filters.route || 'ALL',
    sort_field: filters.sort,
    sort_direction: filters.direction,
    page_number: filters.page,
    page_size: filters.pageSize,
  })
  if (error) throw new Error('Submission queue could not be loaded.')
  return {
    items: data.map((row) => ({
      submissionId: row.submission_id,
      tenantFspId: row.tenant_fsp_id,
      fspId: row.fsp_id,
      fspNumber: row.fsp_number,
      registeredName: row.registered_name,
      tradeName: row.trade_name,
      brokerReference: row.broker_reference,
      periodId: row.period_id,
      periodName: row.period_name,
      periodYear: row.period_year,
      status: row.submission_status as TenantSubmissionListItem['status'],
      route: row.submission_route as TenantSubmissionListItem['route'],
      reviewMode: row.review_mode as TenantSubmissionListItem['reviewMode'],
      reviewStatus: row.review_status,
      startDate: row.start_date,
      submitDate: row.submit_date,
    })),
    total: Number(data[0]?.total_count ?? 0),
    page: filters.page,
    pageSize: filters.pageSize,
  }
}

export async function getTenantSubmissionOverview(
  tenantId: string,
  submissionId: string,
): Promise<TenantSubmissionOverview> {
  const client = getSupabaseBrowserClient()
  const headerResult = await client.rpc('get_tenant_submission_header', {
    target_tenant_id: tenantId,
    target_submission_id: submissionId,
  })
  const header = headerResult.data?.[0]
  if (headerResult.error || !header) throw new Error('Submission not found.')
  const [
    sectionsResult,
    responsesResult,
    documentsResult,
    declarationResult,
    reviewsResult,
    findingsResult,
  ] = await Promise.all([
    client
      .from('questionnaire_sections')
      .select('id,title,sort_order')
      .eq('questionnaire_version_id', header.questionnaire_version_id)
      .order('sort_order'),
    client
      .from('submission_responses')
      .select(
        'id,text_value,numeric_value,date_value,boolean_value,selected_option_id,question:questionnaire_questions!submission_responses_questionnaire_question_id_fkey(section_id,sort_order,question:questions!questionnaire_questions_question_id_fkey(label,type:question_types!questions_question_type_id_fkey(code))),selected_option:value_set_options!submission_responses_selected_option_id_fkey(label),options:submission_response_options(option:value_set_options!submission_response_options_value_set_option_id_fkey(label,sort_order))',
      )
      .eq('submission_id', submissionId),
    client
      .from('documents')
      .select(
        'id,current_version_id,versions:document_versions!document_versions_document_id_fkey(id,original_filename,mime_type,size_bytes,upload_date)',
      )
      .eq('submission_id', submissionId)
      .eq('status', 'ACTIVE'),
    client
      .from('submission_declarations')
      .select(
        'declarant_name,accepted_date,template:declaration_templates!submission_declarations_declaration_template_id_fkey(title)',
      )
      .eq('submission_id', submissionId)
      .maybeSingle(),
    client.rpc('get_tenant_submission_review', {
      target_tenant_id: tenantId,
      target_submission_id: submissionId,
    }),
    client.rpc('list_tenant_submission_findings', {
      target_tenant_id: tenantId,
      target_submission_id: submissionId,
    }),
  ])
  if (
    sectionsResult.error ||
    responsesResult.error ||
    documentsResult.error ||
    declarationResult.error ||
    reviewsResult.error ||
    findingsResult.error
  )
    throw new Error('Submission detail could not be loaded.')
  const sectionMap = new Map(
    (sectionsResult.data ?? []).map((section) => [
      section.id,
      {
        id: section.id,
        title: section.title,
        sort: section.sort_order,
        responses: [] as Array<{
          id: string
          label: string
          type: QuestionTypeCode
          value: string
          sort: number
        }>,
      },
    ]),
  )
  for (const row of responsesResult.data ?? []) {
    const type = row.question.question.type.code as QuestionTypeCode
    const raw = row.options.length
      ? row.options
          .slice()
          .sort((a, b) => a.option.sort_order - b.option.sort_order)
          .map((item) => item.option.label)
      : (row.selected_option?.label ??
        row.text_value ??
        row.numeric_value ??
        row.date_value ??
        row.boolean_value ??
        null)
    sectionMap.get(row.question.section_id)?.responses.push({
      id: row.id,
      label: row.question.question.label,
      type,
      value: formatResponse(type, raw),
      sort: row.question.sort_order,
    })
  }
  const documents = (documentsResult.data ?? []).flatMap((document) => {
    const version = document.versions.find((item) => item.id === document.current_version_id)
    return version
      ? [
          {
            id: document.id,
            filename: version.original_filename,
            mimeType: version.mime_type,
            sizeBytes: version.size_bytes,
            uploadDate: version.upload_date,
          },
        ]
      : []
  })
  return {
    id: header.submission_id,
    fspNumber: header.fsp_number,
    fspName: preferredFspName(header.trade_name, header.registered_name),
    brokerReference: header.broker_reference,
    period: {
      id: header.period_id,
      name: header.period_name,
      year: header.period_year,
      status: '',
      openDate: '',
      closeDate: '',
    },
    questionnaire: { name: header.questionnaire_name, version: header.questionnaire_version },
    status: header.submission_status,
    reviewMode: (reviewsResult.data?.[0]?.review_mode ??
      'HUMAN_REVIEW') as TenantSubmissionOverview['reviewMode'],
    route: header.submission_route,
    startDate: header.start_date,
    submitDate: header.submit_date,
    sections: [...sectionMap.values()]
      .filter((section) => section.responses.length)
      .sort((a, b) => a.sort - b.sort)
      .map((section) => ({
        id: section.id,
        title: section.title,
        responses: section.responses
          .sort((a, b) => a.sort - b.sort)
          .map((response) => ({
            id: response.id,
            label: response.label,
            type: response.type,
            value: response.value,
          })),
      })),
    documents,
    declaration: declarationResult.data
      ? {
          title: declarationResult.data.template.title,
          declarantName: declarationResult.data.declarant_name,
          acceptedDate: declarationResult.data.accepted_date,
        }
      : null,
    reviews: (reviewsResult.data ?? []).map((row) => ({
      attemptNumber: row.attempt_number,
      id: row.review_id,
      type: row.review_type as TenantSubmissionOverview['reviews'][number]['type'],
      status: row.review_status,
      outcome: row.outcome,
      reviewerName: row.reviewer_name,
      summary: row.summary,
      provider: row.provider,
      model: row.model,
      configVersion: row.config_version,
      ruleSetVersion: row.rule_set_version,
      retryCount: row.retry_count,
      startDate: row.start_date,
      completeDate: row.complete_date,
    })),
    findings: (findingsResult.data ?? []).map((row) => ({
      id: row.finding_id,
      reviewId: row.review_id,
      attemptNumber: row.attempt_number,
      code: row.code,
      category: row.category,
      severity: row.severity as TenantSubmissionOverview['findings'][number]['severity'],
      title: row.title,
      description: row.description,
      source: row.source as TenantSubmissionOverview['findings'][number]['source'],
      questionId: row.questionnaire_question_id,
      documentId: row.document_id,
      resolutionStatus: row.resolution_status,
      confidence: row.confidence,
      createDate: row.create_date,
    })),
  }
}

export async function decideSubmissionReview(
  submissionId: string,
  decision: 'COMPLETE' | 'CHANGES_REQUESTED' | 'REJECTED',
  summary: string,
  expectedStatus: string,
) {
  const { data, error } = await getSupabaseBrowserClient().rpc('decide_submission_review', {
    target_submission_id: submissionId,
    target_decision: decision,
    target_summary: summary,
    target_expected_status: expectedStatus,
  })
  if (error) {
    if (error.code === '40001')
      throw new Error('This submission was already reviewed. Refresh to see its current status.')
    throw new Error('The review decision could not be saved.')
  }
  return data[0]
}

export async function retryAiReview(submissionId: string) {
  const { data, error } = await getSupabaseBrowserClient().rpc('retry_ai_review', {
    target_submission_id: submissionId,
  })
  if (error) throw new Error('The AI review could not be retried.')
  return data[0]
}

export async function downloadTenantDocument(
  tenantId: string,
  submissionId: string,
  documentId: string,
  filename: string,
) {
  const {
    data: { session },
  } = await getSupabaseBrowserClient().auth.getSession()
  if (!session) throw new Error('Authentication is required.')
  const response = await fetch(`/api/admin/submissions/${submissionId}/documents/${documentId}`, {
    headers: { Authorization: `Bearer ${session.access_token}`, 'x-tenant-id': tenantId },
  })
  if (!response.ok) throw new Error('Document download failed.')
  const url = URL.createObjectURL(await response.blob())
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
