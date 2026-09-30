import type { VercelRequest } from '@vercel/node'
import { timingSafeEqual } from 'node:crypto'

export function isAuthorizedCron(request: VercelRequest) {
  const secret = process.env.CRON_SECRET
  const supplied = request.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!secret || !supplied) return false
  const expected = Buffer.from(secret)
  const actual = Buffer.from(supplied)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
