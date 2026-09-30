import { parse } from 'csv-parse'

import { cleanText, hashPayload, isIsoDate, normalizeStatus } from './registryModel.js'
import type { ParsedRegistryRow, RegistryPayload, RegistryProvider } from './types.js'

const required = ['fsp_number', 'registered_name', 'regulatory_status'] as const
const accepted = new Set([...required, 'registration_number', 'fsp_type', 'status_effective_date'])

function invalid(rowNumber: number, raw: Record<string, string>, code: string, message: string) {
  return {
    rowNumber,
    raw,
    validationStatus: 'INVALID' as const,
    errorCode: code,
    errorMessage: message,
  }
}

export class ManualCsvProvider implements RegistryProvider {
  code = 'FSCA_MANUAL_CSV'

  async parse(input: Buffer) {
    const rows: ParsedRegistryRow[] = []
    let headers: string[] = []
    const parser = parse(input, {
      bom: true,
      columns: (incoming: string[]) => {
        headers = incoming.map((header) => cleanText(header).toLowerCase())
        return headers
      },
      relax_column_count: false,
      skip_empty_lines: true,
      trim: true,
      max_record_size: 64 * 1024,
    })
    let rowNumber = 1
    for await (const source of parser as AsyncIterable<Record<string, string>>) {
      rowNumber += 1
      const raw = Object.fromEntries(
        Object.entries(source)
          .filter(([key]) => accepted.has(key))
          .map(([key, value]) => [key, cleanText(value)]),
      )
      const fspNumber = cleanText(source.fsp_number).replace(/^FSP\s+/i, '')
      const registeredName = cleanText(source.registered_name)
      const status = normalizeStatus(source.regulatory_status)
      if (!/^\d{1,40}$/.test(fspNumber))
        rows.push(
          invalid(rowNumber, raw, 'INVALID_FSP_NUMBER', 'FSP number must contain digits only.'),
        )
      else if (!registeredName)
        rows.push(
          invalid(rowNumber, raw, 'MISSING_REGISTERED_NAME', 'Registered name is required.'),
        )
      else if (!status)
        rows.push(
          invalid(
            rowNumber,
            raw,
            'UNKNOWN_REGULATORY_STATUS',
            'Regulatory status is not recognised.',
          ),
        )
      else if (source.status_effective_date && !isIsoDate(cleanText(source.status_effective_date)))
        rows.push(
          invalid(rowNumber, raw, 'INVALID_EFFECTIVE_DATE', 'Effective date must use YYYY-MM-DD.'),
        )
      else {
        const normalized: RegistryPayload = {
          fsp_number: fspNumber,
          registered_name: registeredName,
          status,
        }
        for (const key of ['registration_number', 'fsp_type', 'status_effective_date'] as const) {
          const value = cleanText(source[key])
          // Empty optional cells never clear existing values in schema version 1.
          if (value)
            normalized[key] = key === 'fsp_type' ? value.toUpperCase().replace(/\s+/g, '_') : value
        }
        rows.push({
          rowNumber,
          raw,
          normalized,
          sourceHash: hashPayload(normalized),
          validationStatus: 'VALID',
        })
      }
      if (rows.length > 10_000) throw new Error('ROW_LIMIT_EXCEEDED')
    }
    const missing = required.filter((header) => !headers.includes(header))
    if (missing.length) throw new Error(`MISSING_HEADERS:${missing.join(',')}`)

    const grouped = new Map<string, ParsedRegistryRow[]>()
    for (const row of rows) {
      if (!row.normalized) continue
      const list = grouped.get(row.normalized.fsp_number) ?? []
      list.push(row)
      grouped.set(row.normalized.fsp_number, list)
    }
    for (const group of grouped.values()) {
      if (group.length < 2) continue
      const hashes = new Set(group.map((row) => row.sourceHash))
      for (const [index, row] of group.entries()) {
        if (hashes.size > 1) {
          row.validationStatus = 'CONFLICT'
          row.errorCode = 'CONFLICTING_SOURCE_ROWS'
          row.errorMessage = 'Rows for this FSP contain conflicting values.'
        } else if (index > 0) {
          row.validationStatus = 'INVALID'
          row.errorCode = 'DUPLICATE_SOURCE_ROW'
          row.errorMessage = 'This row duplicates an earlier source row.'
        }
      }
    }
    return { rows, ignoredHeaders: headers.filter((header) => !accepted.has(header)) }
  }
}
