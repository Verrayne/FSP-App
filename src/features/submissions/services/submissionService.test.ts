import { beforeEach, describe, expect, it, vi } from 'vitest'

const client = vi.hoisted(() => ({ from: vi.fn() }))

vi.mock('../../../lib/supabase/client', () => ({
  getSupabaseBrowserClient: () => client,
}))

import { loadSubmissionWorkflow } from './submissionService'

type QueryResult = { data: unknown; error: { message: string } | null }

function query(result: QueryResult) {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    then: resultThen,
  }

  function resultThen<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve(result).then(onfulfilled, onrejected)
  }

  builder.select.mockReturnValue(builder)
  builder.eq.mockReturnValue(builder)
  builder.in.mockReturnValue(builder)
  builder.order.mockReturnValue(builder)
  builder.limit.mockReturnValue(builder)
  builder.single.mockResolvedValue(result)
  builder.maybeSingle.mockResolvedValue(result)
  return builder
}

describe('loadSubmissionWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    client.from.mockImplementation((table: string) => {
      if (table === 'submissions')
        return query({
          data: {
            id: 'submission-a',
            status: 'IN_PROGRESS',
            submission_route: null,
            tenant_fsp_id: 'relationship-a',
            submit_date: null,
            period: {
              id: 'period-a',
              name: '2026 Annual B-BBEE Submission',
              open_date: '2026-08-01',
              close_date: '2026-10-31',
              tenant_id: 'tenant-a',
              questionnaire_version_id: 'version-a',
              questionnaire_version: {
                status: 'PUBLISHED',
                version_number: 1,
                questionnaire: { name: 'Annual B-BBEE Questionnaire' },
              },
            },
            relationship: {
              id: 'relationship-a',
              fsp_id: 'fsp-a',
              tenant: { name: 'Cape Horizon Assurance' },
            },
          },
          error: null,
        })
      if (table === 'questionnaire_sections')
        return query({
          data: [{ id: 'section-a', title: 'Organisation', description: null, sort_order: 10 }],
          error: null,
        })
      if (table === 'questionnaire_questions') return query({ data: [], error: null })
      if (table === 'question_conditions') return query({ data: [], error: null })
      if (table === 'submission_responses') return query({ data: [], error: null })
      if (table === 'documents') return query({ data: [], error: null })
      if (table === 'submission_declarations') return query({ data: null, error: null })
      if (table === 'declaration_templates') return query({ data: null, error: null })
      throw new Error(`Unexpected table: ${table}`)
    })
  })

  it('loads a new submission before a declaration or document exists', async () => {
    await expect(loadSubmissionWorkflow('submission-a', 'fsp-a')).resolves.toMatchObject({
      id: 'submission-a',
      declaration: null,
      declarationTemplate: null,
      document: null,
    })
  })
})
