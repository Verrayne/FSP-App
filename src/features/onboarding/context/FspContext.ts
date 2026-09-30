import { createContext } from 'react'

import type { FspMembership, OnboardingState } from '../types/onboarding'

export interface FspContextValue {
  status: 'loading' | 'ready' | 'error'
  onboarding: OnboardingState | null
  memberships: FspMembership[]
  currentFsp: FspMembership | null
  selectFsp: (fspId: string) => boolean
  refresh: () => Promise<void>
}

export const FspContext = createContext<FspContextValue | null>(null)
