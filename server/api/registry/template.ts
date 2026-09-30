import type { VercelRequest, VercelResponse } from '@vercel/node'

import { requirePlatformAdmin } from '../_lib/platformAdmin.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' })
  try {
    await requirePlatformAdmin(request)
    const csv =
      'fsp_number,registered_name,regulatory_status,status_effective_date,registration_number,fsp_type\n'
    response.setHeader('Content-Type', 'text/csv; charset=utf-8')
    response.setHeader('Content-Disposition', 'attachment; filename="fsp-registry-import-v1.csv"')
    return response.status(200).send(csv)
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    return response
      .status(message === 'FORBIDDEN' ? 403 : 401)
      .json({ error: message || 'UNAUTHENTICATED' })
  }
}
