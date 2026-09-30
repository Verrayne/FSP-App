import { Building2, FileClock, FileText, LayoutDashboard, Users } from 'lucide-react'
import { useLocation } from 'react-router-dom'

import { WorkspaceLayout } from './WorkspaceLayout'

const navigation = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/submissions/new', label: 'B-BBEE Submission', icon: FileText },
  { to: '/app/submissions', label: 'Submission History', icon: FileClock },
  { to: '/app/profile', label: 'FSP Profile', icon: Building2 },
  { to: '/app/users', label: 'Users', icon: Users },
]

export function AppLayout() {
  const { pathname } = useLocation()
  const headerTitle =
    pathname === '/app/dashboard'
      ? 'Dashboard'
      : pathname === '/app/submissions'
        ? 'Submission History'
        : pathname === '/app/submissions/new' || pathname.startsWith('/app/submissions/')
          ? 'B-BBEE Submission'
          : pathname === '/app/profile'
            ? 'FSP Profile'
            : pathname === '/app/users'
              ? 'Users'
              : undefined

  return (
    <WorkspaceLayout
      navigation={navigation}
      sectionLabel="FSP workspace"
      headerTitle={headerTitle}
      workspace="fsp"
    />
  )
}
