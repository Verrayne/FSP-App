import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../../auth/hooks/useAuth'
import { TenantContext } from '../context/TenantContext'
import { getMyTenantMemberships, tenantQueryKeys } from '../services/tenantService'

export function TenantProvider({ children }: { children: ReactNode }) {
  const { status: authStatus, user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null)
  const query = useQuery({
    queryKey: tenantQueryKeys.memberships(),
    queryFn: getMyTenantMemberships,
    enabled: authStatus === 'authenticated',
  })
  const memberships = useMemo(() => query.data ?? [], [query.data])
  const resolvedId = useMemo(() => {
    if (!user || query.isPending) return null
    if (memberships.some((item) => item.tenantId === selectedTenantId)) return selectedTenantId
    let stored: string | null = null
    try {
      stored = window.localStorage.getItem(`tenant.current.${user.id}`)
    } catch {
      /* Safe fallback below. */
    }
    return (
      memberships.find((item) => item.tenantId === stored)?.tenantId ??
      memberships[0]?.tenantId ??
      null
    )
  }, [memberships, query.isPending, selectedTenantId, user])
  const selectTenant = useCallback(
    (tenantId: string) => {
      if (!user || !memberships.some((item) => item.tenantId === tenantId)) return false
      setSelectedTenantId(tenantId)
      try {
        window.localStorage.setItem(`tenant.current.${user.id}`, tenantId)
      } catch {
        /* In-memory selection still works. */
      }
      return true
    },
    [memberships, user],
  )
  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: tenantQueryKeys.memberships() })
  }, [queryClient])
  const value = useMemo(
    () => ({
      status: query.isError
        ? ('error' as const)
        : query.isPending
          ? ('loading' as const)
          : ('ready' as const),
      memberships,
      currentTenant: memberships.find((item) => item.tenantId === resolvedId) ?? null,
      selectTenant,
      refresh,
    }),
    [memberships, query.isError, query.isPending, refresh, resolvedId, selectTenant],
  )
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}
