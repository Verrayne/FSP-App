import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'

import { handleApiError, sendApiError } from '../../../../_lib/responses'
import {
  createSupabaseServerClient,
  createSupabaseUserServerClient,
} from '../../../../../src/lib/supabase/server'

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
    const documentId = z.string().uuid().parse(request.query.documentId)
    const accessToken = headers.authorization.replace(/^Bearer\s+/, '')
    const userClient = createSupabaseUserServerClient(accessToken)
    const { data: userData, error: userError } = await userClient.auth.getUser(accessToken)
    if (userError || !userData.user) {
      return sendApiError(response, 'UNAUTHENTICATED', 'Authentication is required.')
    }

    const access = await userClient.rpc('get_tenant_submission_header', {
      target_tenant_id: headers['x-tenant-id'],
      target_submission_id: submissionId,
    })
    if (access.error || !access.data?.length) {
      return sendApiError(response, 'NOT_FOUND', 'Document not found.')
    }

    const documentResult = await userClient
      .from('documents')
      .select('current_version_id')
      .eq('id', documentId)
      .eq('submission_id', submissionId)
      .eq('status', 'ACTIVE')
      .maybeSingle()
    if (documentResult.error || !documentResult.data?.current_version_id) {
      return sendApiError(response, 'NOT_FOUND', 'Document not found.')
    }
    const versionResult = await userClient
      .from('document_versions')
      .select('storage_path,original_filename,mime_type,size_bytes')
      .eq('id', documentResult.data.current_version_id)
      .eq('document_id', documentId)
      .maybeSingle()
    if (versionResult.error || !versionResult.data) {
      return sendApiError(response, 'NOT_FOUND', 'Document not found.')
    }

    const stored = await createSupabaseServerClient()
      .storage.from('compliance-documents')
      .download(versionResult.data.storage_path)
    if (stored.error || !stored.data) {
      return sendApiError(response, 'NOT_FOUND', 'Document not found.')
    }
    const filename = safeFilename(versionResult.data.original_filename)
    response.setHeader('Content-Type', versionResult.data.mime_type)
    response.setHeader('Content-Length', String(versionResult.data.size_bytes))
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
