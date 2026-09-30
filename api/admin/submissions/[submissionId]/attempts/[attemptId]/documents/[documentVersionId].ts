import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'

import { handleApiError, sendApiError } from '../../../../../../_lib/responses'
import {
  createSupabaseServerClient,
  createSupabaseUserServerClient,
} from '../../../../../../../src/lib/supabase/server'

const headersSchema = z.object({
  authorization: z.string().regex(/^Bearer\s+\S+$/),
  'x-tenant-id': z.string().uuid(),
})

function safeFilename(value: string) {
  return value.replace(/[\r\n"\\/]/g, '_').slice(0, 255) || 'document'
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') return sendApiError(response, 'NOT_FOUND', 'Route not found.')
  try {
    const headers = headersSchema.parse(request.headers)
    const submissionId = z.string().uuid().parse(request.query.submissionId)
    const attemptId = z.string().uuid().parse(request.query.attemptId)
    const documentVersionId = z.string().uuid().parse(request.query.documentVersionId)
    const token = headers.authorization.replace(/^Bearer\s+/, '')
    const userClient = createSupabaseUserServerClient(token)
    const user = await userClient.auth.getUser(token)
    if (user.error || !user.data.user)
      return sendApiError(response, 'UNAUTHENTICATED', 'Authentication is required.')
    const authorized = await userClient.rpc('authorize_tenant_attempt_document', {
      target_tenant_id: headers['x-tenant-id'],
      target_submission_id: submissionId,
      target_attempt_id: attemptId,
      target_document_version_id: documentVersionId,
    })
    if (authorized.error || authorized.data !== true)
      return sendApiError(response, 'NOT_FOUND', 'Document not found.')
    const service = createSupabaseServerClient()
    const version = await service
      .from('document_versions')
      .select('storage_path,original_filename,mime_type,size_bytes')
      .eq('id', documentVersionId)
      .single()
    if (version.error || !version.data)
      return sendApiError(response, 'NOT_FOUND', 'Document not found.')
    const stored = await service.storage
      .from('compliance-documents')
      .download(version.data.storage_path)
    if (stored.error || !stored.data)
      return sendApiError(response, 'NOT_FOUND', 'Document not found.')
    const filename = safeFilename(version.data.original_filename)
    response.setHeader('Content-Type', version.data.mime_type)
    response.setHeader('Content-Length', String(version.data.size_bytes))
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    )
    response.setHeader('Cache-Control', 'private, no-store')
    return response.status(200).send(Buffer.from(await stored.data.arrayBuffer()))
  } catch (error) {
    return handleApiError(response, error)
  }
}
