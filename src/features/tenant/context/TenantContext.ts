import { createContext } from 'react'
import type { TenantMembership } from '../types'

export interface TenantContextValue {
  status: 'loading' | 'ready' | 'error'
  memberships: TenantMembership[]
  currentTenant: TenantMembership | null
  selectTenant: (tenantId: string) => boolean
  refresh: () => Promise<void>
}

export const TenantContext = createContext<TenantContextValue | null>(null)
