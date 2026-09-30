import { QueryClientContext } from '@tanstack/react-query'
import { Building2, Menu, PanelLeftClose, PanelLeftOpen, UserRound, X } from 'lucide-react'
import { useContext, useState, type ComponentType, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'

import { Brand } from '../../components/shared/Brand'
import { Button, Dropdown, Select } from '../../components/ui'
import { buttonVariants } from '../../components/ui/buttonVariants'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { NotificationBell } from '../../features/notifications/NotificationBell'
import { useOptionalFsp } from '../../features/onboarding/hooks/useFsp'
import { useOptionalTenant } from '../../features/tenant/hooks/useTenant'
import { cn } from '../../lib/utils/cn'

export interface WorkspaceNavItem {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
}

function initialCollapsedState() {
  try {
    return window.localStorage.getItem('workspace-sidebar-collapsed') === 'true'
  } catch {
    return false
  }
}

export function WorkspaceLayout({
  navigation,
  sectionLabel,
  context,
  headerTitle,
  workspace = 'fsp',
}: {
  navigation: WorkspaceNavItem[]
  sectionLabel: string
  context?: ReactNode
  headerTitle?: string
  workspace?: 'fsp' | 'tenant'
}) {
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(initialCollapsedState)
  const [signOutError, setSignOutError] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const { profile, user, signOut } = useAuth()
  const fspContext = useOptionalFsp()
  const tenantContext = useOptionalTenant()
  const currentFsp = fspContext?.currentFsp ?? null
  const memberships = fspContext?.memberships ?? []
  const selectFsp = fspContext?.selectFsp ?? (() => false)
  const navigate = useNavigate()
  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
  const hasQueryClient = Boolean(useContext(QueryClientContext))

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current
      try {
        window.localStorage.setItem('workspace-sidebar-collapsed', String(next))
      } catch {
        // The layout remains usable when browser storage is unavailable.
      }
      return next
    })
  }

  async function handleSignOut() {
    setSignOutError(false)
    setSigningOut(true)
    try {
      await signOut()
      void navigate('/auth/login', { replace: true })
    } catch {
      setSignOutError(true)
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {open && (
        <button
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          'bg-navy-950 fixed inset-y-0 left-0 z-40 flex w-64 -translate-x-full flex-col text-slate-200 transition-[width,transform] duration-200 lg:translate-x-0',
          collapsed && 'lg:w-20',
          open && 'translate-x-0',
        )}
      >
        <div
          className={cn(
            'flex h-16 shrink-0 items-center gap-2 px-4',
            collapsed && 'lg:justify-center lg:gap-1 lg:px-1',
          )}
        >
          <button
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>
          <button
            className="hidden rounded-md p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white lg:inline-flex"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            aria-expanded={!collapsed}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-5" />
            ) : (
              <PanelLeftClose className="size-5" />
            )}
          </button>
          <Brand inverse compact={collapsed} />
        </div>

        <div
          className={cn(
            'px-5 pt-5 pb-2 text-xs font-semibold tracking-wider text-slate-500 uppercase',
            collapsed && 'lg:sr-only',
          )}
        >
          {sectionLabel}
        </div>

        {(context || memberships.length > 1) && (
          <div className={cn('px-3 pb-3', collapsed && 'lg:hidden')}>
            {context ?? (
              <div className="flex min-w-0 items-center gap-2">
                <Building2 className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
                <label htmlFor="fsp-context" className="sr-only">
                  Current FSP
                </label>
                <Select
                  id="fsp-context"
                  className="h-8 min-w-0 border-white/15 bg-white/10 text-slate-100 shadow-none"
                  value={currentFsp?.fspId ?? ''}
                  onChange={(event) => selectFsp(event.target.value)}
                >
                  {memberships.map((membership) => (
                    <option
                      key={membership.fspId}
                      value={membership.fspId}
                      className="text-slate-900"
                    >
                      FSP {membership.fspNumber} ·{' '}
                      {membership.tradeName ?? membership.registeredName}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>
        )}

        <nav
          className={cn('flex-1 space-y-1 px-3', collapsed && 'lg:px-2')}
          aria-label={`${sectionLabel} navigation`}
        >
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white',
                  collapsed && 'lg:justify-center lg:px-2',
                  isActive && 'bg-white/10 text-white',
                )
              }
            >
              <Icon className="size-4 shrink-0" />
              <span className={cn(collapsed && 'lg:sr-only')}>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={cn('p-3', collapsed && 'lg:px-2')}>
          <Dropdown
            placement="top"
            labelText="Account menu"
            label={
              <span
                className={cn(
                  'flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white',
                  collapsed && 'lg:justify-center lg:px-2',
                )}
              >
                <UserRound className="size-4 shrink-0" />
                <span className={cn(collapsed && 'lg:sr-only')}>Account</span>
              </span>
            }
          >
            <div className="px-3 py-2 text-sm">
              <p className="font-medium text-slate-900">{displayName || 'User account'}</p>
              <p className="max-w-56 truncate text-xs text-slate-500">{user?.email}</p>
            </div>
            {(
              workspace === 'tenant'
                ? fspContext?.memberships.length
                : tenantContext?.memberships.length
            ) ? (
              <div className="border-y px-1 py-1">
                <Link
                  className={buttonVariants({
                    variant: 'ghost',
                    className: 'w-full justify-start',
                  })}
                  to={workspace === 'tenant' ? '/app' : '/admin/dashboard'}
                >
                  <Building2 className="size-4" />
                  {workspace === 'tenant' ? 'FSP workspace' : 'Insurer workspace'}
                </Link>
              </div>
            ) : null}
            {signOutError && (
              <p role="alert" className="px-3 py-2 text-xs text-red-700">
                Unable to sign out. Please try again.
              </p>
            )}
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
      </aside>

      <div className={cn('transition-[padding] duration-200 lg:pl-64', collapsed && 'lg:pl-20')}>
        <header
          className={cn(
            'sticky top-0 z-20 bg-slate-50',
            headerTitle ? 'h-20 lg:h-24' : 'h-16',
          )}
        >
          <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-end px-4 sm:px-6 lg:px-8">
            <div className="mr-auto lg:hidden">
              <button
                className="rounded-md p-2"
                onClick={() => setOpen(true)}
                aria-label="Open navigation"
              >
                <Menu className="size-5" />
              </button>
            </div>
            {headerTitle && (
              <h1 className="mr-auto text-[1.5625rem] leading-none font-semibold tracking-tight text-slate-700">
                {headerTitle}
              </h1>
            )}
            {hasQueryClient && <NotificationBell workspace={workspace} />}
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
