import { afterEach, describe, expect, it } from 'vitest'

import { aiReviewResultSchema, reviewWithConfiguredAdapter } from './aiReview'

const completeContext = {
  submission_route: 'AFFIDAVIT',
  response_snapshot: [{ questionnaire_question_id: 'question-a', text_value: 'Answer' }],
  declaration_snapshot: { declarant_name: 'Test Declarant' },
  document_snapshot: [],
}

afterEach(() => {
  delete process.env.AI_REVIEW_ADAPTER
  delete process.env.AI_REVIEW_MOCK_SCENARIO
  delete process.env.VERCEL_ENV
})

describe('AI review adapter boundary', () => {
  it('is disabled by default and refuses mock operation in production', async () => {
    await expect(reviewWithConfiguredAdapter(completeContext)).rejects.toThrow(
      'AI_PROVIDER_NOT_CONFIGURED',
    )
    process.env.AI_REVIEW_ADAPTER = 'mock'
    process.env.VERCEL_ENV = 'production'
    await expect(reviewWithConfiguredAdapter(completeContext)).rejects.toThrow(
      'AI_PROVIDER_NOT_CONFIGURED',
    )
  })

  it('returns a high-confidence pass only when deterministic requirements are present', async () => {
    process.env.AI_REVIEW_ADAPTER = 'mock'
    const result = await reviewWithConfiguredAdapter(completeContext)
    expect(result).toMatchObject({ recommendation: 'COMPLETE', confidence: 'HIGH', findings: [] })
  })

  it('escalates missing route evidence and unresolved output', async () => {
    process.env.AI_REVIEW_ADAPTER = 'mock'
    const missing = await reviewWithConfiguredAdapter({
      ...completeContext,
      declaration_snapshot: null,
    })
    expect(missing.recommendation).toBe('ESCALATE')
    expect(missing.findings[0]).toMatchObject({ code: 'DECLARATION_MISSING', severity: 'BLOCKING' })

    process.env.AI_REVIEW_MOCK_SCENARIO = 'ESCALATE_UNRESOLVED'
    const unresolved = await reviewWithConfiguredAdapter(completeContext)
    expect(unresolved.recommendation).toBe('ESCALATE')
    expect(unresolved.findings.some((finding) => finding.unresolved)).toBe(true)
  })

  it('rejects malformed structured output', () => {
    expect(() => aiReviewResultSchema.parse({ recommendation: 'COMPLETE' })).toThrow()
  })
})
