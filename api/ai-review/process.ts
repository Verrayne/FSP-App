import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomUUID, timingSafeEqual } from 'node:crypto'

import { createSupabaseServerClient } from '../../src/lib/supabase/server.js'
import { aiReviewResultSchema, reviewWithConfiguredAdapter } from '../_lib/aiReview.js'

function authorized(request: VercelRequest) {
  const secret = process.env.CRON_SECRET
  const supplied = request.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!secret || !supplied) return false
  const expected = Buffer.from(secret)
  const actual = Buffer.from(supplied)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST' && request.method !== 'GET')
    return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' })
  if (!authorized(request)) return response.status(401).json({ error: 'UNAUTHORIZED' })

  const client = createSupabaseServerClient()
  const claimed = await client.rpc('claim_ai_review_job', {
    target_worker_id: `vercel-${randomUUID()}`,
  })
  const job = claimed.data?.[0]
  if (claimed.error) return response.status(500).json({ error: 'JOB_CLAIM_FAILED' })
  if (!job) return response.status(200).json({ status: 'IDLE' })

  try {
    const contextResult = await client.rpc('get_ai_review_context', { target_job_id: job.job_id })
    const context = contextResult.data?.[0]
    if (contextResult.error || !context) throw new Error('CONTEXT_UNAVAILABLE')
    const result = aiReviewResultSchema.parse(await reviewWithConfiguredAdapter(context))
    const applied = await client.rpc('apply_ai_review_result', {
      target_job_id: job.job_id,
      target_summary: result.summary,
      target_recommendation: result.recommendation,
      target_confidence: result.confidence,
      target_findings: result.findings,
      target_provider: result.provider,
      target_model: result.model,
      target_config_version: result.configVersion,
      target_rule_set_version: result.ruleSetVersion,
    })
    if (applied.error) throw new Error('RESULT_APPLY_FAILED')
    return response.status(200).json({ status: applied.data?.[0]?.review_outcome ?? 'COMPLETED' })
  } catch (error) {
    const category =
      error instanceof Error
        ? error.message.replace(/[^A-Z0-9_]/gi, '_').slice(0, 100)
        : 'UNKNOWN_ERROR'
    const failed = await client.rpc('fail_ai_review_job', {
      target_job_id: job.job_id,
      target_error_category: category,
    })
    return response
      .status(failed.error ? 500 : 202)
      .json({ status: failed.data?.[0]?.job_status ?? 'FAILED' })
  }
}
