import { z } from 'zod'

export const apiErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'INTERNAL_ERROR',
])

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>

export interface ApiErrorPayload {
  error: { code: ApiErrorCode; message: string; details?: Record<string, string[]> }
}

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
    public readonly details?: Record<string, string[]>,
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

export async function normalizeApiError(response: Response): Promise<ApiClientError> {
  const fallback = new ApiClientError(
    response.status,
    'INTERNAL_ERROR',
    'The request could not be completed.',
  )

  try {
    const data: unknown = await response.json()
    const parsed = z
      .object({
        error: z.object({
          code: apiErrorCodeSchema,
          message: z.string(),
          details: z.record(z.string(), z.array(z.string())).optional(),
        }),
      })
      .safeParse(data)

    return parsed.success
      ? new ApiClientError(
          response.status,
          parsed.data.error.code,
          parsed.data.error.message,
          parsed.data.error.details,
        )
      : fallback
  } catch {
    return fallback
  }
}
