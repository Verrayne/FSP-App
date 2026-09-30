import { NavLink, Outlet } from 'react-router-dom'

import { PageHeader } from '../../../components/ui'
import { cn } from '../../../lib/utils/cn'

const links = [
  ['/admin/settings/organisation', 'Organisation'],
  ['/admin/settings/users', 'Users'],
  ['/admin/settings/submission-periods', 'Submission Periods'],
  ['/admin/settings/fsps', 'FSP Relationships'],
] as const

export function SettingsLayout() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" />
      <nav aria-label="Settings" className="flex gap-1 overflow-x-auto border-b">
        {links.map(([to, label]) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'shrink-0 border-b-2 px-3 py-2 text-sm font-medium',
                isActive
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-slate-600 hover:text-slate-900',
              )
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
