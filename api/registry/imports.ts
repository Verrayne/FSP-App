import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createHash, randomUUID } from 'node:crypto'
import { z } from 'zod'

import { requirePlatformAdmin } from '../_lib/platformAdmin.js'
import { getRegistryProvider } from '../_lib/registry/providers.js'
import { registryDiff } from '../_lib/registry/registryModel.js'

const requestSchema = z.object({
  fileName: z
    .string()
    .min(1)
    .max(255)
    .regex(/\.csv$/i),
  mimeType: z.string().max(120).default('text/csv'),
  contentBase64: z.string().min(1),
  sourceCode: z.enum(['FSCA_MANUAL_CSV', 'DEVELOPMENT_FIXTURE']).default('FSCA_MANUAL_CSV'),
  allowReprocess: z.boolean().default(false),
})

function apiStatus(message: string) {
  if (message === 'UNAUTHENTICATED') return 401
  if (message === 'FORBIDDEN') return 403
  if (message === 'DUPLICATE_FILE') return 409
  if (
    message.startsWith('MISSING_HEADERS') ||
    message === 'ROW_LIMIT_EXCEEDED' ||
    message === 'INVALID_FILE'
  )
    return 400
  return 500
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  try {
    const { service, user } = await requirePlatformAdmin(request)
    if (request.method === 'GET') {
      const [sources, imports, total, latest] = await Promise.all([
        service
          .from('fsp_registry_sources')
          .select(
            'id,code,name,authority,source_mode,schema_version,active,production_enabled,freshness_threshold_days',
          )
          .eq('active', true)
          .order('name'),
        service
          .from('fsp_registry_imports')
          .select(
            'id,status,source_id,original_file_name,started_date,completed_date,total_count,valid_count,invalid_count,inserted_count,updated_count,unchanged_count,conflicted_count,failed_count,error_summary,fsp_registry_sources(code,name)',
          )
          .order('started_date', { ascending: false })
          .limit(40),
        service.from('fsps').select('id', { count: 'exact', head: true }),
        service
          .from('fsp_registry_imports')
          .select('completed_date')
          .in('status', ['COMPLETED', 'COMPLETED_WITH_ERRORS'])
          .order('completed_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])
      const error = sources.error ?? imports.error ?? total.error ?? latest.error
      if (error) throw new Error('REGISTRY_SUMMARY_FAILED')
      return response.status(200).json({
        sources: sources.data,
        imports: imports.data,
        summary: {
          fspCount: total.count ?? 0,
          lastCompletedAt: latest.data?.completed_date ?? null,
        },
      })
    }
    if (request.method !== 'POST') return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' })

    const body = requestSchema.parse(request.body)
    if (body.sourceCode === 'DEVELOPMENT_FIXTURE' && process.env.VERCEL_ENV === 'production')
      return response.status(403).json({ error: 'TEST_SOURCE_DISABLED' })
    const file = Buffer.from(body.contentBase64, 'base64')
    // Base64 adds ~33%; 3 MiB keeps the JSON request below Vercel's 4.5 MB limit.
    if (!file.length || file.length > 3 * 1024 * 1024) throw new Error('INVALID_FILE')
    const roundTrip = file.toString('base64').replace(/=+$/, '')
    if (roundTrip !== body.contentBase64.replace(/\s/g, '').replace(/=+$/, ''))
      throw new Error('INVALID_FILE')
    const fileHash = createHash('sha256').update(file).digest('hex')
    const sourceResult = await service
      .from('fsp_registry_sources')
      .select('*')
      .eq('code', body.sourceCode)
      .eq('active', true)
      .single()
    if (sourceResult.error) throw new Error('SOURCE_UNAVAILABLE')
    const duplicate = await service
      .from('fsp_registry_imports')
      .select('id,status,started_date')
      .eq('source_id', sourceResult.data.id)
      .eq('file_hash', fileHash)
      .order('started_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (duplicate.error) throw new Error('DUPLICATE_CHECK_FAILED')
    if (duplicate.data && !body.allowReprocess) {
      return response.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'This source file was already imported.',
          details: { duplicateImportId: [duplicate.data.id] },
        },
      })
    }
    const provider = getRegistryProvider(body.sourceCode)
    const parsed = await provider.parse(file)
    if (!parsed.rows.length) throw new Error('INVALID_FILE')

    const fspNumbers = parsed.rows.flatMap((row) =>
      row.normalized ? [row.normalized.fsp_number] : [],
    )
    const current = new Map<string, Record<string, string | null>>()
    for (let index = 0; index < fspNumbers.length; index += 250) {
      const result = await service
        .from('fsps')
        .select(
          'id,fsp_number,registered_name,registration_number,fsp_type,status,status_effective_date',
        )
        .in('fsp_number', fspNumbers.slice(index, index + 250))
      if (result.error) throw new Error('FSP_MATCH_FAILED')
      for (const fsp of result.data) current.set(fsp.fsp_number, fsp)
    }

    const validCount = parsed.rows.filter((row) => row.validationStatus === 'VALID').length
    const invalidCount = parsed.rows.filter((row) => row.validationStatus === 'INVALID').length
    const conflictedCount = parsed.rows.filter((row) => row.validationStatus === 'CONFLICT').length
    const importId = randomUUID()
    const storagePath = `${sourceResult.data.code}/${importId}/${fileHash}.csv`
    const upload = await service.storage.from('registry-imports').upload(storagePath, file, {
      contentType: 'text/csv',
      upsert: false,
    })
    if (upload.error) throw new Error('PRIVATE_UPLOAD_FAILED')
    const imported = await service
      .from('fsp_registry_imports')
      .insert({
        id: importId,
        source_id: sourceResult.data.id,
        status: 'READY_FOR_CONFIRMATION',
        source_mode: sourceResult.data.source_mode,
        schema_version: sourceResult.data.schema_version,
        original_file_name: body.fileName,
        file_hash: fileHash,
        storage_path: storagePath,
        mime_type: 'text/csv',
        file_size_bytes: file.length,
        started_by: user.id,
        validated_date: new Date().toISOString(),
        total_count: parsed.rows.length,
        valid_count: validCount,
        invalid_count: invalidCount,
        conflicted_count: conflictedCount,
        metadata: {
          ignored_headers: parsed.ignoredHeaders,
          test_mode: body.sourceCode === 'DEVELOPMENT_FIXTURE',
        },
        reprocess_of: duplicate.data?.id ?? null,
      })
      .select('id')
      .single()
    if (imported.error) {
      await service.storage.from('registry-imports').remove([storagePath])
      throw new Error('IMPORT_CREATE_FAILED')
    }
    for (let index = 0; index < parsed.rows.length; index += 250) {
      const records = parsed.rows.slice(index, index + 250).map((row) => {
        const existing = row.normalized ? current.get(row.normalized.fsp_number) : undefined
        return {
          import_id: importId,
          source_id: sourceResult.data.id,
          row_number: row.rowNumber,
          source_record_key: row.normalized?.fsp_number ?? null,
          fsp_id: existing?.id ?? null,
          source_payload: row.raw,
          normalized_payload: row.normalized ?? null,
          source_hash: row.sourceHash ?? null,
          validation_status: row.validationStatus,
          match_status: row.normalized ? (existing ? 'MATCHED' : 'NEW') : null,
          processing_status: 'STAGED',
          proposed_changes: row.normalized ? registryDiff(existing, row.normalized) : [],
          error_code: row.errorCode ?? null,
          error_message: row.errorMessage ?? null,
        }
      })
      const inserted = await service.from('fsp_source_records').insert(records)
      if (inserted.error) {
        await service
          .from('fsp_registry_imports')
          .update({
            status: 'FAILED',
            error_code: 'SOURCE_RECORD_CREATE_FAILED',
            error_summary: 'Validated rows could not be staged.',
            completed_date: new Date().toISOString(),
          })
          .eq('id', importId)
        throw new Error('SOURCE_RECORD_CREATE_FAILED')
      }
    }
    return response.status(201).json({
      id: importId,
      totalCount: parsed.rows.length,
      validCount,
      invalidCount,
      conflictedCount,
    })
  } catch (error) {
    if (error instanceof z.ZodError) return response.status(400).json({ error: 'VALIDATION_ERROR' })
    const message = error instanceof Error ? error.message : 'REGISTRY_OPERATION_FAILED'
    if (process.env.NODE_ENV !== 'test' && apiStatus(message) === 500)
      console.error('Registry API error', message)
    const status = apiStatus(message)
    const code =
      status === 401
        ? 'UNAUTHENTICATED'
        : status === 403
          ? 'FORBIDDEN'
          : status === 409
            ? 'CONFLICT'
            : status === 400
              ? 'VALIDATION_ERROR'
              : 'INTERNAL_ERROR'
    return response.status(status).json({
      error: {
        code,
        message: status === 500 ? 'The registry operation could not be completed.' : message,
      },
    })
  }
}
