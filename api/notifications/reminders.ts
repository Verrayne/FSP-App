import type { VercelRequest, VercelResponse } from '@vercel/node'

import { createSupabaseServerClient } from '../../src/lib/supabase/server.js'
import { isAuthorizedCron } from '../_lib/cronAuth.js'

function johannesburgDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST' && request.method !== 'GET')
    return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' })
  if (!isAuthorizedCron(request)) return response.status(401).json({ error: 'UNAUTHORIZED' })
  const result = await createSupabaseServerClient().rpc('enqueue_deadline_reminders', {
    target_today: johannesburgDate(),
  })
  if (result.error) return response.status(500).json({ error: 'REMINDER_ENQUEUE_FAILED' })
  return response.status(200).json({ status: 'COMPLETED', enqueued: Number(result.data) })
}
