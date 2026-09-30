import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomUUID } from 'node:crypto'

import { createSupabaseServerClient } from '../../../src/lib/supabase/server.js'
import { isAuthorizedCron } from '../_lib/cronAuth.js'

function safeCode(value: unknown) {
  const text =
    value instanceof Error ? value.message : typeof value === 'string' ? value : 'UNKNOWN'
  return text
    .replace(/[^A-Z0-9_]/gi, '_')
    .toUpperCase()
    .slice(0, 80)
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST' && request.method !== 'GET')
    return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' })
  if (!isAuthorizedCron(request)) return response.status(401).json({ error: 'UNAUTHORIZED' })
  const service = createSupabaseServerClient()
  const worker = `registry-${randomUUID()}`
  const claimed = await service.rpc('claim_fsp_registry_records', {
    claim_worker_id: worker,
    claim_limit: 50,
  })
  if (claimed.error) return response.status(500).json({ error: 'CLAIM_FAILED' })
  const counts = { claimed: claimed.data.length, inserted: 0, updated: 0, unchanged: 0, failed: 0 }
  for (const record of claimed.data) {
    const applied = await service.rpc('apply_fsp_registry_record', {
      target_record_id: record.id,
      claim_worker_id: worker,
    })
    if (applied.error) {
      counts.failed += 1
      await service.rpc('fail_fsp_registry_record', {
        target_record_id: record.id,
        claim_worker_id: worker,
        failure_code: safeCode(applied.error.code),
        failure_message: 'The source record could not be applied.',
      })
    } else if (applied.data === 'INSERTED') counts.inserted += 1
    else if (applied.data === 'UPDATED') counts.updated += 1
    else counts.unchanged += 1
  }
  return response.status(200).json({ status: counts.failed ? 'PARTIAL' : 'COMPLETED', ...counts })
}
