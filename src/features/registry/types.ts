export interface RegistryImportSummary {
  id: string
  status: string
  original_file_name: string | null
  started_date: string
  completed_date: string | null
  total_count: number
  valid_count: number
  invalid_count: number
  inserted_count: number
  updated_count: number
  unchanged_count: number
  conflicted_count: number
  failed_count: number
  error_summary: string | null
  fsp_registry_sources: { code: string; name: string } | null
}

export interface RegistryDashboardData {
  sources: Array<{
    id: string
    code: string
    name: string
    authority: string
    source_mode: string
    schema_version: string
    production_enabled: boolean
    freshness_threshold_days: number
  }>
  imports: RegistryImportSummary[]
  summary: { fspCount: number; lastCompletedAt: string | null }
}

export interface RegistryRecord {
  id: string
  row_number: number
  source_record_key: string | null
  validation_status: string
  match_status: string | null
  processing_status: string
  normalized_payload: Record<string, string> | null
  proposed_changes: Array<{
    field: string
    previousValue: string | null
    newValue: string
    type: string
  }>
  error_code: string | null
  error_message: string | null
}

export interface RegistryImportDetail {
  import: RegistryImportSummary & {
    confirmed_date: string | null
    processed_count: number
    source_mode: string
    schema_version: string
  }
  records: RegistryRecord[]
  recordCount: number
  changes: Array<{
    id: string
    field_name: string
    change_type: string
    previous_value: unknown
    new_value: unknown
    detected_date: string
  }>
}
