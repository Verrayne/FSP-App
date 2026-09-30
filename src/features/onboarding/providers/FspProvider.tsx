import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState, type ReactNode } from 'react'

import { useAuth } from '../../auth/hooks/useAuth'
import { FspContext } from '../context/FspContext'
import {
  getMyFspMemberships,
  getOnboardingState,
  onboardingQueryKeys,
} from '../services/onboardingService'

export function FspProvider({ children }: { children: ReactNode }) {
  const { status: authStatus, user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedFspId, setSelectedFspId] = useState<string | null>(null)
  const enabled = authStatus === 'authenticated'

  const onboardingQuery = useQuery({
    queryKey: onboardingQueryKeys.state(),
    queryFn: getOnboardingState,
    enabled,
  })
  const membershipsQuery = useQuery({
    queryKey: onboardingQueryKeys.memberships(),
    queryFn: getMyFspMemberships,
    enabled,
  })
  const memberships = useMemo(() => membershipsQuery.data ?? [], [membershipsQuery.data])
  const resolvedFspId = useMemo(() => {
    if (!user || membershipsQuery.isPending) return null
    const selected = memberships.find((membership) => membership.fspId === selectedFspId)
    if (selected) return selected.fspId
    let stored: string | null = null
    try {
      stored = window.localStorage.getItem(`fsp.current.${user.id}`)
    } catch {
      // The primary membership remains the safe fallback.
    }
    return (
      memberships.find((membership) => membership.fspId === stored)?.fspId ??
      memberships.find((membership) => membership.isPrimary)?.fspId ??
      memberships[0]?.fspId ??
      null
    )
  }, [memberships, membershipsQuery.isPending, selectedFspId, user])

  const selectFsp = useCallback(
    (fspId: string) => {
      const membership = memberships.find((item) => item.fspId === fspId)
      if (!membership || !user) return false
      setSelectedFspId(fspId)
      try {
        window.localStorage.setItem(`fsp.current.${user.id}`, fspId)
      } catch {
        // Selection remains valid in memory; database authorization is unchanged.
      }
      return true
    },
    [memberships, user],
  )

  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: onboardingQueryKeys.state() }),
      queryClient.invalidateQueries({ queryKey: onboardingQueryKeys.memberships() }),
    ])
  }, [queryClient])

  const value = useMemo(
    () => ({
      status:
        onboardingQuery.isError || membershipsQuery.isError
          ? ('error' as const)
          : onboardingQuery.isPending || membershipsQuery.isPending
            ? ('loading' as const)
            : ('ready' as const),
      onboarding: onboardingQuery.data ?? null,
      memberships,
      currentFsp: memberships.find((membership) => membership.fspId === resolvedFspId) ?? null,
      selectFsp,
      refresh,
    }),
    [
      memberships,
      membershipsQuery.isError,
      membershipsQuery.isPending,
      onboardingQuery.data,
      onboardingQuery.isError,
      onboardingQuery.isPending,
      refresh,
      selectFsp,
      resolvedFspId,
    ],
  )

  return <FspContext.Provider value={value}>{children}</FspContext.Provider>
}
