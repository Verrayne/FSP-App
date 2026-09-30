import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router-dom'

import { Alert, Button, Card, Skeleton } from '../../../components/ui'
import { useFsp } from '../hooks/useFsp'
import { FspProvider } from '../providers/FspProvider'
import { useOptionalTenant } from '../../tenant/hooks/useTenant'

export function FspProviderRoute() {
  return (
    <FspProvider>
      <Outlet />
    </FspProvider>
  )
}

function StateLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6" aria-busy="true">
      <Card className="w-full max-w-md space-y-3 p-6">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-full" />
      </Card>
      <span className="sr-only" role="status">
        Checking your FSP access…
      </span>
    </main>
  )
}

function StateError() {
  const { refresh } = useFsp()
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <div className="w-full max-w-lg">
        <Alert title="We could not check your FSP access" variant="danger">
          <p>Please check your connection and try again.</p>
          <Button className="mt-3" size="sm" onClick={() => void refresh()}>
            Try again
          </Button>
        </Alert>
      </div>
    </main>
  )
}

export function AppEntryRedirect() {
  const { status, onboarding } = useFsp()
  const tenant = useOptionalTenant()
  if (status === 'loading') return <StateLoading />
  if (status === 'error' || !onboarding) return <StateError />
  if (onboarding.state === 'ACTIVE') return <Navigate to="/app/dashboard" replace />
  if (onboarding.state === 'LINK_PENDING') return <Navigate to="/app/onboarding/pending" replace />
  if (tenant?.status === 'loading') return <StateLoading />
  if (tenant?.currentTenant) return <Navigate to="/admin/dashboard" replace />
  return <Navigate to="/app/onboarding" replace />
}

export function ActiveFspGuard({ children }: { children?: ReactNode }) {
  const { status, onboarding, currentFsp, memberships } = useFsp()
  if (status === 'loading') return <StateLoading />
  if (status === 'error' || !onboarding) return <StateError />
  if (onboarding.state !== 'ACTIVE') return <AppEntryRedirect />
  if (!memberships.length) return <StateError />
  if (!currentFsp) return <StateLoading />
  return children ?? <Outlet />
}

export function OnboardingGuard() {
  const { status, onboarding } = useFsp()
  if (status === 'loading') return <StateLoading />
  if (status === 'error' || !onboarding) return <StateError />
  if (onboarding.state === 'ACTIVE') return <Navigate to="/app/dashboard" replace />
  return <Outlet />
}

export function SearchGuard({ children }: { children: ReactNode }) {
  const { onboarding } = useFsp()
  if (onboarding?.state === 'LINK_PENDING') {
    return <Navigate to="/app/onboarding/pending" replace />
  }
  return children
}
