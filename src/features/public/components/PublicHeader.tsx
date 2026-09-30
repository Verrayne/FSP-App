import { Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

import { Brand } from '../../../components/shared/Brand'
import { buttonVariants } from '../../../components/ui/buttonVariants'
import { cn } from '../../../lib/utils/cn'

const navigation = [
  { to: '/', label: 'Home', end: true },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

function PublicNavigation({
  mobile = false,
  onNavigate,
}: {
  mobile?: boolean
  onNavigate?: () => void
}) {
  return (
    <nav
      aria-label={mobile ? 'Mobile navigation' : 'Primary'}
      className={mobile ? 'space-y-1' : 'flex items-center gap-7'}
    >
      {navigation.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'text-sm font-medium transition-colors',
              mobile ? 'block rounded-md px-3 py-2.5' : 'hover:text-navy-900 text-slate-600',
              isActive && (mobile ? 'bg-navy-50 text-navy-900' : 'text-navy-900'),
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

export function PublicHeader() {
  const [openAtPath, setOpenAtPath] = useState<string | null>(null)
  const location = useLocation()
  const toggleRef = useRef<HTMLButtonElement>(null)
  const open = openAtPath === location.pathname

  useEffect(() => {
    if (!open) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenAtPath(null)
        toggleRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open])

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <a
        href="#main-content"
        className="sr-only z-50 bg-white px-3 py-2 focus:not-sr-only focus:absolute focus:top-3 focus:left-3"
      >
        Skip to main content
      </a>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Brand />
        <div className="hidden items-center gap-8 lg:flex">
          <PublicNavigation />
          <div className="flex items-center gap-2">
            <Link to="/auth/login" className={buttonVariants({ variant: 'ghost' })}>
              Log In
            </Link>
            <Link to="/auth/register" className={buttonVariants()}>
              Register
            </Link>
          </div>
        </div>
        <button
          ref={toggleRef}
          type="button"
          className="rounded-md p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-navigation"
          aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={() => setOpenAtPath(open ? null : location.pathname)}
        >
          {open ? (
            <X className="size-5" aria-hidden="true" />
          ) : (
            <Menu className="size-5" aria-hidden="true" />
          )}
        </button>
      </div>
      <div
        id="mobile-navigation"
        hidden={!open}
        className="border-t bg-white px-4 py-4 shadow-lg lg:hidden"
      >
        <PublicNavigation mobile onNavigate={() => setOpenAtPath(null)} />
        <div className="mt-4 grid grid-cols-2 gap-2 border-t pt-4">
          <Link
            to="/auth/login"
            onClick={() => setOpenAtPath(null)}
            className={buttonVariants({ variant: 'secondary' })}
          >
            Log In
          </Link>
          <Link
            to="/auth/register"
            onClick={() => setOpenAtPath(null)}
            className={buttonVariants()}
          >
            Register
          </Link>
        </div>
      </div>
    </header>
  )
}
