import { UserRound } from 'lucide-react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'

import { Brand } from '../../../components/shared/Brand'
import { Button, Dropdown } from '../../../components/ui'
import { buttonVariants } from '../../../components/ui/buttonVariants'
import { useAuth } from '../../auth/hooks/useAuth'
import { NotificationBell } from '../../notifications/NotificationBell'

export function OnboardingLayout() {
  const { profile, user, signOut } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState(false)
  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')

  async function handleSignOut() {
    setSigningOut(true)
    setError(false)
    try {
      await signOut()
      void navigate('/auth/login', { replace: true })
    } catch {
      setError(true)
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Brand />
          <div className="flex items-center gap-1">
            <NotificationBell workspace="fsp" basePath="/app/account/notifications" />
            <Dropdown
              labelText="Account menu"
              label={
                <span className={buttonVariants({ variant: 'ghost' })}>
                  <UserRound className="size-4" />
                  Account
                </span>
              }
            >
              <div className="px-3 py-2 text-sm">
                <p className="font-medium">{displayName || 'User account'}</p>
                <p className="max-w-56 truncate text-xs text-slate-500">{user?.email}</p>
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => void navigate('/app/account/profile')}
              >
                Profile
              </Button>
              {error && <p className="px-3 py-2 text-xs text-red-700">Unable to sign out.</p>}
              <Button
                variant="ghost"
                className="w-full justify-start"
                disabled={signingOut}
                onClick={() => void handleSignOut()}
              >
                {signingOut ? 'Signing out…' : 'Sign out'}
              </Button>
            </Dropdown>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <Outlet />
      </main>
    </div>
  )
}
