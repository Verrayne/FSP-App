import { Menu } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'

import { Brand } from '../../components/shared/Brand'
import { buttonVariants } from '../../components/ui/buttonVariants'
import { cn } from '../../lib/utils/cn'

const links = [
  { to: '/about', label: 'About' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/contact', label: 'Contact' },
]

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Brand />
          <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'hover:text-navy-900 text-sm font-medium text-slate-600',
                    isActive && 'text-navy-900',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-2 sm:flex">
            <Link to="/auth/login" className={buttonVariants({ variant: 'ghost' })}>
              Sign in
            </Link>
            <Link to="/auth/register" className={buttonVariants()}>
              Get started
            </Link>
          </div>
          <button className="rounded-md p-2 md:hidden" aria-label="Open navigation">
            <Menu className="size-5" />
          </button>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="border-t bg-slate-50">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-6 py-8 text-sm text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} FSP Compliance</p>
          <nav className="flex gap-5" aria-label="Legal">
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
