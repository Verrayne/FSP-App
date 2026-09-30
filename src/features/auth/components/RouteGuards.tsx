import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { AuthLoading } from './AuthFields'
import { useAuth } from '../hooks/useAuth'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
        <AuthLoading />
      </main>
    )
  }

  if (status === 'anonymous') {
    return (
      <Navigate
        to="/auth/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }

  return children
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const { status } = useAuth()

  if (status === 'loading') return <AuthLoading />
  if (status === 'authenticated') return <Navigate to="/app" replace />

  return children
}

export function AdminAccessGuard() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
        <AuthLoading />
      </main>
    )
  }

  if (status === 'anonymous') {
    return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />
  }

  return <Navigate to="/forbidden" replace />
}
