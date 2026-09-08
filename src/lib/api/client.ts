import { normalizeApiError } from './errors'

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })

  if (!response.ok) throw await normalizeApiError(response)
  return (await response.json()) as T
}
