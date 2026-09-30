export const registryFields = [
  'fsp_number',
  'registered_name',
  'registration_number',
  'fsp_type',
  'status',
  'status_effective_date',
] as const

export type RegistryField = (typeof registryFields)[number]
export type RegistryPayload = Partial<Record<RegistryField, string>> & {
  fsp_number: string
  registered_name: string
  status: string
}

export interface ParsedRegistryRow {
  rowNumber: number
  raw: Record<string, string>
  normalized?: RegistryPayload
  sourceHash?: string
  validationStatus: 'VALID' | 'INVALID' | 'CONFLICT'
  errorCode?: string
  errorMessage?: string
}

export interface RegistryProvider {
  code: string
  parse(input: Buffer): Promise<{ rows: ParsedRegistryRow[]; ignoredHeaders: string[] }>
}
