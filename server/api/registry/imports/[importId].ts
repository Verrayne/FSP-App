import type { VercelRequest, VercelResponse } from '@vercel/node'

import { requirePlatformAdmin } from '../../_lib/platformAdmin.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' })
  try {
    const { service } = await requirePlatformAdmin(request)
    const importId = String(request.query.importId ?? '')
    const page = Math.max(1, Number(request.query.page) || 1)
    const pageSize = 50
    let recordsQuery = service
      .from('fsp_source_records')
      .select(
        'id,row_number,source_record_key,validation_status,match_status,processing_status,normalized_payload,proposed_changes,error_code,error_message',
        { count: 'exact' },
      )
      .eq('import_id', importId)
      .order('row_number')
      .range((page - 1) * pageSize, page * pageSize - 1)
    const status = String(request.query.status ?? '')
    if (status) recordsQuery = recordsQuery.eq('validation_status', status)
    const search = String(request.query.search ?? '').trim()
    if (search)
      recordsQuery = recordsQuery.ilike('source_record_key', `%${search.replace(/[%_,()]/g, '')}%`)
    const [importResult, recordsResult, changesResult] = await Promise.all([
      service
        .from('fsp_registry_imports')
        .select('*,fsp_registry_sources(code,name,authority)')
        .eq('id', importId)
        .maybeSingle(),
      recordsQuery,
      service
        .from('fsp_registry_changes')
        .select('id,fsp_id,field_name,change_type,previous_value,new_value,detected_date')
        .eq('import_id', importId)
        .order('detected_date', { ascending: false })
        .limit(100),
    ])
    if (importResult.error || recordsResult.error || changesResult.error)
      throw new Error('IMPORT_DETAIL_FAILED')
    if (!importResult.data) return response.status(404).json({ error: 'NOT_FOUND' })
    return response.status(200).json({
      import: importResult.data,
      records: recordsResult.data,
      recordCount: recordsResult.count ?? 0,
      changes: changesResult.data,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    return response
      .status(message === 'FORBIDDEN' ? 403 : message === 'UNAUTHENTICATED' ? 401 : 500)
      .json({ error: message })
  }
}
