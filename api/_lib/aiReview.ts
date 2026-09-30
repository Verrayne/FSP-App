import { z } from 'zod'

export const aiFindingSchema = z.object({
  code: z.string().max(100).optional(),
  category: z.string().min(1).max(100),
  severity: z.enum(['INFO', 'WARNING', 'BLOCKING']),
  title: z.string().min(2).max(255),
  description: z.string().min(2).max(2000),
  source: z.enum(['DETERMINISTIC_RULE', 'AI', 'SYSTEM']),
  questionnaireQuestionId: z.string().uuid().optional(),
  documentId: z.string().uuid().optional(),
  confidence: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  unresolved: z.boolean().optional(),
})

export const aiReviewResultSchema = z.object({
  summary: z.string().min(2).max(2000),
  recommendation: z.enum(['COMPLETE', 'ESCALATE']),
  confidence: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  findings: z.array(aiFindingSchema).max(100),
  provider: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  configVersion: z.string().min(1).max(100),
  ruleSetVersion: z.string().min(1).max(100),
})

export type AiReviewResult = z.infer<typeof aiReviewResultSchema>

export interface AiReviewContext {
  submission_route: string
  response_snapshot: unknown
  declaration_snapshot: unknown
  document_snapshot: unknown
}

export type MockScenario =
  'PASS' | 'ESCALATE_BLOCKING' | 'ESCALATE_UNRESOLVED' | 'TECHNICAL_FAILURE' | 'MALFORMED_RESPONSE'

function deterministicFindings(context: AiReviewContext): AiReviewResult['findings'] {
  const findings: AiReviewResult['findings'] = []
  if (!Array.isArray(context.response_snapshot) || context.response_snapshot.length === 0) {
    findings.push({
      code: 'RESPONSES_MISSING',
      category: 'COMPLETENESS',
      severity: 'BLOCKING',
      title: 'Questionnaire responses are missing',
      description: 'The immutable attempt contains no questionnaire responses.',
      source: 'DETERMINISTIC_RULE',
    })
  }
  if (context.submission_route === 'AFFIDAVIT' && !context.declaration_snapshot) {
    findings.push({
      code: 'DECLARATION_MISSING',
      category: 'ROUTE_REQUIREMENT',
      severity: 'BLOCKING',
      title: 'Declaration is missing',
      description: 'The affidavit route requires an accepted declaration in the submitted attempt.',
      source: 'DETERMINISTIC_RULE',
    })
  }
  if (
    context.submission_route === 'CERTIFICATE' &&
    (!Array.isArray(context.document_snapshot) || context.document_snapshot.length === 0)
  ) {
    findings.push({
      code: 'CERTIFICATE_MISSING',
      category: 'ROUTE_REQUIREMENT',
      severity: 'BLOCKING',
      title: 'Certificate is missing',
      description: 'The certificate route requires a snapshotted supporting document.',
      source: 'DETERMINISTIC_RULE',
    })
  }
  return findings
}

export async function reviewWithConfiguredAdapter(
  context: AiReviewContext,
): Promise<AiReviewResult> {
  await Promise.resolve()
  const adapter = process.env.AI_REVIEW_ADAPTER ?? 'disabled'
  if (adapter !== 'mock' || process.env.VERCEL_ENV === 'production') {
    throw new Error('AI_PROVIDER_NOT_CONFIGURED')
  }
  const scenario = (process.env.AI_REVIEW_MOCK_SCENARIO ?? 'PASS') as MockScenario
  if (scenario === 'TECHNICAL_FAILURE') throw new Error('MOCK_TECHNICAL_FAILURE')
  if (scenario === 'MALFORMED_RESPONSE') {
    return aiReviewResultSchema.parse({ recommendation: 'COMPLETE' })
  }
  const findings = deterministicFindings(context)
  if (scenario === 'ESCALATE_BLOCKING') {
    findings.push({
      code: 'MOCK_BLOCKING',
      category: 'MOCK',
      severity: 'BLOCKING',
      title: 'Manual evidence check required',
      description: 'The deterministic mock scenario requires a reviewer to inspect the evidence.',
      source: 'AI',
      confidence: 'HIGH',
    })
  }
  if (scenario === 'ESCALATE_UNRESOLVED') {
    findings.push({
      code: 'MOCK_UNRESOLVED',
      category: 'MOCK',
      severity: 'WARNING',
      title: 'Unresolved ambiguity',
      description:
        'The deterministic mock scenario could not reach a sufficiently confident result.',
      source: 'AI',
      confidence: 'LOW',
      unresolved: true,
    })
  }
  const escalate = findings.some((finding) => finding.severity === 'BLOCKING' || finding.unresolved)
  return aiReviewResultSchema.parse({
    summary: escalate
      ? 'Automated checks require human review.'
      : 'Automated checks completed without a blocking or unresolved finding.',
    recommendation: escalate ? 'ESCALATE' : 'COMPLETE',
    confidence: escalate ? 'MEDIUM' : 'HIGH',
    findings,
    provider: 'deterministic-mock',
    model: 'rules-only-v1',
    configVersion: 'mock-v1',
    ruleSetVersion: 'submission-validation-v1',
  })
}
