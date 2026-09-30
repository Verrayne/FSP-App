export type OnboardingStateName = 'NO_FSP' | 'LINK_PENDING' | 'ACTIVE' | 'REJECTED'

export interface OnboardingState {
  state: OnboardingStateName
  requestId: string | null
  fspId: string | null
  fspNumber: string | null
  fspName: string | null
  requestStatus: string | null
  requestDate: string | null
  rejectionReason: string | null
}

export interface FspSearchResult {
  id: string
  fspNumber: string
  registeredName: string
  tradeName: string | null
  status: string | null
  statusEffectiveDate: string | null
  claimable: boolean
  totalCount: number
}

export interface FspOnboardingDetail extends Omit<FspSearchResult, 'totalCount'> {
  registrationNumber: string | null
  fspType: string | null
  address: {
    line1: string
    line2: string | null
    suburb: string | null
    city: string
    province: string | null
    postalCode: string | null
    countryCode: string
  } | null
}

export interface FspMembership {
  membershipId: string
  fspId: string
  fspNumber: string
  registeredName: string
  tradeName: string | null
  role: 'ADMIN' | 'SUBMITTER' | 'VIEWER'
  isPrimary: boolean
}

export interface LinkRequestResult {
  outcome: 'CREATED' | 'EXISTING_PENDING' | 'ACTIVE_MEMBERSHIP'
  requestId: string | null
  requestStatus: string | null
  requestDate: string | null
}
