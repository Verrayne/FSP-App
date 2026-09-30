import type { VercelRequest, VercelResponse } from '@vercel/node'

import { requirePlatformAdmin } from '../../../_lib/platformAdmin.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' })
  try {
    const { userClient } = await requirePlatformAdmin(request)
    const result = await userClient.rpc('confirm_fsp_registry_import', {
      target_import_id: String(request.query.importId ?? ''),
    })
    if (result.error)
      return response
        .status(result.error.code === '42501' ? 403 : 409)
        .json({ error: 'IMPORT_NOT_CONFIRMABLE' })
    return response.status(202).json({ import: result.data })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    return response.status(message === 'FORBIDDEN' ? 403 : 401).json({ error: message })
  }
}
