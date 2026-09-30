import { createHash } from 'node:crypto'

import type { RegistryPayload } from './types.js'

const statuses: Record<string, string> = {
  ACTIVE: 'AUTHORISED',
  APPROVED: 'AUTHORISED',
  AUTHORIZED: 'AUTHORISED',
  AUTHORISED: 'AUTHORISED',
  LAPSED: 'LAPSED',
  SUSPENDED: 'SUSPENDED',
  WITHDRAWN: 'WITHDRAWN',
}

export function cleanText(value: unknown) {
  const text = typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  return text.trim().replace(/\s+/g, ' ')
}

export function normalizeStatus(value: unknown) {
  return statuses[cleanText(value).toUpperCase()] ?? null
}

export function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
}

export function hashPayload(payload: RegistryPayload) {
  const sorted = Object.fromEntries(Object.entries(payload).sort(([a], [b]) => a.localeCompare(b)))
  return createHash('sha256').update(JSON.stringify(sorted)).digest('hex')
}

export function registryDiff(
  current: Record<string, string | null | undefined> | undefined,
  payload: RegistryPayload,
) {
  if (!current)
    return [{ field: '__record__', previousValue: null, newValue: 'New FSP', type: 'CREATE' }]
  return Object.entries(payload)
    .filter(([field]) => field !== 'fsp_number')
    .filter(([field, value]) => (current[field] ?? null) !== (value ?? null))
    .map(([field, value]) => ({
      field,
      previousValue: current[field] ?? null,
      newValue: value,
      type: field === 'status' ? 'STATUS' : 'UPDATE',
    }))
}
