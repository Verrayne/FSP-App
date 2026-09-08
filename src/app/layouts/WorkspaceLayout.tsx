import { Menu, UserRound, X } from 'lucide-react'
import { useState, type ComponentType } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

import { Brand } from '../../components/shared/Brand'
import { Button, Dropdown } from '../../components/ui'
import { cn } from '../../lib/utils/cn'

export interface WorkspaceNavItem {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
}

export function WorkspaceLayout({
  navigation,
  sectionLabel,
}: {
  navigation: WorkspaceNavItem[]
  sectionLabel: string
}) {
  const [open, setOpen] = useState(false)
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
          'bg-navy-950 fixed inset-y-0 left-0 z-40 flex w-64 -translate-x-full flex-col text-slate-200 transition-transform lg:translate-x-0',
          open && 'translate-x-0',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <Brand inverse />
          <button
            className="rounded p-1 lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="px-5 pt-5 pb-2 text-xs font-semibold tracking-wider text-slate-500 uppercase">
          {sectionLabel}
        </div>
        <nav className="flex-1 space-y-1 px-3" aria-label={`${sectionLabel} navigation`}>
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white',
                  isActive && 'bg-white/10 text-white',
                )
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4 text-xs text-slate-400">
          Prototype foundation
          <br />
          Environment: {import.meta.env.VITE_APP_ENV ?? 'local'}
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              className="rounded-md p-2 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="size-5" />
            </button>
            <span className="text-sm font-medium text-slate-600">Annual B-BBEE reporting</span>
          </div>
          <Dropdown
            label={
              <Button variant="ghost">
                <UserRound className="size-4" />
                Account
              </Button>
            }
          >
            <div className="px-3 py-2 text-sm">
              <p className="font-medium">User account</p>
              <p className="text-xs text-slate-500">Authentication pending</p>
            </div>
          </Dropdown>
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
