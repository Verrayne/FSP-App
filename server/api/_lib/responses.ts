import type { VercelResponse } from '@vercel/node'
import { ZodError } from 'zod'

import type { ApiErrorCode, ApiErrorPayload } from '../../../src/lib/api/errors'

const statusByCode: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
}

export function sendApiError(response: VercelResponse, code: ApiErrorCode, message: string) {
  const payload: ApiErrorPayload = { error: { code, message } }
  return response.status(statusByCode[code]).json(payload)
}

export function handleApiError(response: VercelResponse, error: unknown) {
  if (error instanceof ZodError) {
    const details = Object.fromEntries(
      Object.entries(error.flatten().fieldErrors).filter(
        (entry): entry is [string, string[]] => entry[1] !== undefined,
      ),
    )
    const payload: ApiErrorPayload = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The request is invalid.',
        details,
      },
    }
    return response.status(400).json(payload)
  }

  // Log structured, non-sensitive context in production; never return raw exceptions.
  if (process.env.NODE_ENV !== 'test') console.error('Unhandled API operation error')
  return sendApiError(response, 'INTERNAL_ERROR', 'The request could not be completed.')
}
