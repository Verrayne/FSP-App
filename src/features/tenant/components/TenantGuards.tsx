import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { Alert, Button, Card, Skeleton } from '../../../components/ui'
import { FspProvider } from '../../onboarding/providers/FspProvider'
import { TenantProvider } from '../providers/TenantProvider'
import { useTenant } from '../hooks/useTenant'

export function WorkspaceProvidersRoute() {
  return (
    <FspProvider>
      <TenantProvider>
        <Outlet />
      </TenantProvider>
    </FspProvider>
  )
}

function TenantState({ error = false }: { error?: boolean }) {
  const { refresh } = useTenant()
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
      {error ? (
        <Alert title="We could not check your insurer access" variant="danger">
          Check your connection and{' '}
          <Button size="sm" className="mt-3" onClick={() => void refresh()}>
            try again
          </Button>
          .
        </Alert>
      ) : (
        <Card className="w-full max-w-md space-y-3 p-6" aria-busy="true">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full" />
          <span className="sr-only" role="status">
            Checking insurer access…
          </span>
        </Card>
      )}
    </main>
  )
}

export function TenantAccessGuard({ children }: { children?: ReactNode }) {
  const { status, currentTenant } = useTenant()
  if (status === 'loading') return <TenantState />
  if (status === 'error') return <TenantState error />
  if (!currentTenant) return <Navigate to="/forbidden" replace />
  return children ?? <Outlet />
}
