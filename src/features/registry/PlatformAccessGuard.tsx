import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router-dom'

import { Skeleton } from '../../components/ui'
import { hasPlatformAccess } from './registryService'

function usePlatformAccess() {
  return useQuery({
    queryKey: ['platform-access'],
    queryFn: hasPlatformAccess,
    staleTime: 60_000,
  })
}

function PlatformAccessLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50">
      <Skeleton className="h-8 w-56" />
    </main>
  )
}

export function PlatformAppRedirectGuard({ children }: { children: ReactNode }) {
  const access = usePlatformAccess()
  if (access.isPending) return <PlatformAccessLoading />
  if (access.data) return <Navigate to="/platform/dashboard" replace />
  return children
}

export function PlatformAccessGuard() {
  const access = usePlatformAccess()
  if (access.isPending) return <PlatformAccessLoading />
  if (access.isError || !access.data) return <Navigate to="/forbidden" replace />
  return <Outlet />
}
