import { getSupabaseBrowserClient } from '../../../lib/supabase/client'
import type {
  FspMembership,
  FspOnboardingDetail,
  FspSearchResult,
  LinkRequestResult,
  OnboardingState,
  OnboardingStateName,
} from '../types/onboarding'

export const onboardingQueryKeys = {
  root: ['fsp-onboarding'] as const,
  state: () => [...onboardingQueryKeys.root, 'state'] as const,
  memberships: () => [...onboardingQueryKeys.root, 'memberships'] as const,
  search: (query: string, page: number) =>
    [...onboardingQueryKeys.root, 'search', query, page] as const,
  detail: (fspId: string) => [...onboardingQueryKeys.root, 'detail', fspId] as const,
}

function requireData<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message)
  if (data === null) throw new Error('The onboarding service returned no data.')
  return data
}

export function normalizeFspSearch(query: string) {
  return query.trim().replace(/\s+/g, ' ')
}

export function validateFspSearch(query: string) {
  const normalized = normalizeFspSearch(query)
  return normalized.length >= 2 ? null : 'Enter at least 2 characters.'
}

export function isFspClaimable(active: boolean, status: string | null) {
  return (
    active && ['AUTHORISED', 'AUTHORIZED', 'ACTIVE'].includes(status?.trim().toUpperCase() ?? '')
  )
}

export async function getOnboardingState(): Promise<OnboardingState> {
  const { data, error } = await getSupabaseBrowserClient().rpc('get_my_fsp_onboarding_state')
  const row = requireData(data, error)[0]
  if (!row) throw new Error('The onboarding state could not be resolved.')

  return {
    state: row.onboarding_state as OnboardingStateName,
    requestId: row.request_id || null,
    fspId: row.fsp_id || null,
    fspNumber: row.fsp_number || null,
    fspName: row.fsp_name || null,
    requestStatus: row.request_status || null,
    requestDate: row.request_date || null,
    rejectionReason: row.rejection_reason || null,
  }
}

export async function getMyFspMemberships(): Promise<FspMembership[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc('get_my_fsp_memberships')
  return requireData(data, error).map((row) => ({
    membershipId: row.membership_id,
    fspId: row.fsp_id,
    fspNumber: row.fsp_number,
    registeredName: row.registered_name,
    tradeName: row.trade_name || null,
    role: row.role as FspMembership['role'],
    isPrimary: row.is_primary,
  }))
}

export async function searchFsps(query: string, page = 0, pageSize = 10) {
  const normalized = normalizeFspSearch(query)
  const validationError = validateFspSearch(normalized)
  if (validationError) throw new Error(validationError)

  const { data, error } = await getSupabaseBrowserClient().rpc('search_fsps_for_onboarding', {
    search_query: normalized,
    result_limit: pageSize,
    result_offset: page * pageSize,
  })

  return requireData(data, error).map<FspSearchResult>((row) => ({
    id: row.id,
    fspNumber: row.fsp_number,
    registeredName: row.registered_name,
    tradeName: row.trade_name || null,
    status: row.status || null,
    statusEffectiveDate: row.status_effective_date || null,
    claimable: row.claimable,
    totalCount: row.total_count,
  }))
}

export async function getFspForOnboarding(fspId: string): Promise<FspOnboardingDetail> {
  const { data, error } = await getSupabaseBrowserClient().rpc('get_fsp_for_onboarding', {
    target_fsp_id: fspId,
  })
  const row = requireData(data, error)[0]
  if (!row) throw new Error('This FSP could not be found.')

  return {
    id: row.id,
    fspNumber: row.fsp_number,
    registeredName: row.registered_name,
    tradeName: row.trade_name || null,
    registrationNumber: row.registration_number || null,
    fspType: row.fsp_type || null,
    status: row.status || null,
    statusEffectiveDate: row.status_effective_date || null,
    claimable: row.claimable,
    address: row.address_line_1
      ? {
          line1: row.address_line_1,
          line2: row.address_line_2 || null,
          suburb: row.suburb || null,
          city: row.city,
          province: row.province || null,
          postalCode: row.postal_code || null,
          countryCode: row.country_code,
        }
      : null,
  }
}

export async function requestFspLink(fspId: string): Promise<LinkRequestResult> {
  const { data, error } = await getSupabaseBrowserClient().rpc('request_fsp_link', {
    target_fsp_id: fspId,
  })
  const row = requireData(data, error)[0]
  if (!row) throw new Error('The link request could not be created.')
  return {
    outcome: row.outcome as LinkRequestResult['outcome'],
    requestId: row.request_id || null,
    requestStatus: row.request_status || null,
    requestDate: row.request_date || null,
  }
}

export async function approveFspLinkRequest(requestId: string) {
  const { data, error } = await getSupabaseBrowserClient().rpc('approve_fsp_link_request', {
    target_request_id: requestId,
  })
  return requireData(data, error)[0]
}

export async function rejectFspLinkRequest(requestId: string, reason: string) {
  const { data, error } = await getSupabaseBrowserClient().rpc('reject_fsp_link_request', {
    target_request_id: requestId,
    rejection_reason: reason,
  })
  return requireData(data, error)[0]
}
