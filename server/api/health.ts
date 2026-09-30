import type { VercelRequest, VercelResponse } from '@vercel/node'

import { createSupabaseServerClient } from '../../src/lib/supabase/server.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') return response.status(405).json({ status: 'unavailable' })
  try {
    const check = await createSupabaseServerClient()
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .abortSignal(AbortSignal.timeout(3_000))
    if (check.error) throw check.error
    return response.status(200).json({ status: 'ok' })
  } catch {
    return response.status(503).json({ status: 'degraded' })
  }
}
