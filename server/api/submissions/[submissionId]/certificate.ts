import { createHash } from 'node:crypto'

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'

import { handleApiError, sendApiError } from '../../_lib/responses'
import {
  createSupabaseServerClient,
  createSupabaseUserServerClient,
} from '../../../../src/lib/supabase/server'

const headersSchema = z.object({
  authorization: z.string().regex(/^Bearer\s+\S+$/),
  'x-original-filename': z.string().min(1).max(900),
  'x-content-sha256': z.string().regex(/^[0-9a-f]{64}$/),
})

function requestBuffer(body: unknown) {
  if (Buffer.isBuffer(body)) return body
  if (body instanceof Uint8Array) return Buffer.from(body)
  if (typeof body === 'string') return Buffer.from(body, 'binary')
  return null
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') return sendApiError(response, 'NOT_FOUND', 'Route not found.')
  try {
    const headers = headersSchema.parse(request.headers)
    const submissionId = z.string().uuid().parse(request.query.submissionId)
    const fileName = z
      .string()
      .min(5)
      .max(255)
      .regex(/\.pdf$/i)
      .parse(decodeURIComponent(headers['x-original-filename']))
    const body = requestBuffer(request.body)
    if (!body || body.length < 5 || body.length > 4 * 1024 * 1024)
      return sendApiError(response, 'VALIDATION_ERROR', 'The PDF must be no larger than 4 MB.')
    if (body.subarray(0, 5).toString('ascii') !== '%PDF-')
      return sendApiError(response, 'VALIDATION_ERROR', 'The uploaded file is not a PDF.')
    const hash = createHash('sha256').update(body).digest('hex')
    if (hash !== headers['x-content-sha256'])
      return sendApiError(response, 'VALIDATION_ERROR', 'The uploaded file checksum is invalid.')

    const accessToken = headers.authorization.replace(/^Bearer\s+/, '')
    const userClient = createSupabaseUserServerClient(accessToken)
    const { data: userData, error: userError } = await userClient.auth.getUser(accessToken)
    if (userError || !userData.user)
      return sendApiError(response, 'UNAUTHENTICATED', 'Authentication is required.')

    const preparedResult = await userClient.rpc('prepare_certificate_upload', {
      target_filename: fileName,
      target_mime_type: 'application/pdf',
      target_sha256: hash,
      target_size_bytes: body.length,
      target_submission_id: submissionId,
    })
    const prepared = preparedResult.data?.[0]
    if (preparedResult.error || !prepared)
      return sendApiError(response, 'FORBIDDEN', 'The certificate cannot be uploaded.')

    const serviceClient = createSupabaseServerClient()
    const uploaded = await serviceClient.storage
      .from('compliance-documents')
      .upload(prepared.storage_path, body, { contentType: 'application/pdf', upsert: false })
    if (uploaded.error) {
      await userClient.rpc('cancel_certificate_upload', {
        target_document_version_id: prepared.document_version_id,
      })
      return sendApiError(response, 'INTERNAL_ERROR', 'The certificate could not be stored.')
    }

    const finalized = await userClient.rpc('finalize_certificate_upload', {
      target_document_version_id: prepared.document_version_id,
    })
    if (finalized.error) {
      await serviceClient.storage.from('compliance-documents').remove([prepared.storage_path])
      await userClient.rpc('cancel_certificate_upload', {
        target_document_version_id: prepared.document_version_id,
      })
      return sendApiError(response, 'INTERNAL_ERROR', 'The certificate could not be finalized.')
    }
    return response.status(201).json({
      documentId: prepared.document_id,
      documentVersionId: prepared.document_version_id,
    })
  } catch (error) {
    return handleApiError(response, error)
  }
}
