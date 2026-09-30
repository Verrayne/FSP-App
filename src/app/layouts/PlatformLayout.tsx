import { BookOpen, Building2, Database, LayoutDashboard, ListTree } from 'lucide-react'
import { useLocation } from 'react-router-dom'

import { WorkspaceLayout } from './WorkspaceLayout'

export function PlatformLayout() {
  const { pathname } = useLocation()
  const headerTitle = pathname.startsWith('/platform/questionnaires/')
    ? 'Questionnaire Editor'
    : pathname === '/platform/questionnaires'
      ? 'Questionnaires'
      : pathname === '/platform/reference-data'
        ? 'Question Builder'
        : pathname === '/platform/tenants'
          ? 'Tenants'
          : pathname.startsWith('/platform/registry')
            ? 'FSP Registry'
            : 'Platform Dashboard'

  return (
    <WorkspaceLayout
      navigation={[
        { to: '/platform/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/platform/tenants', label: 'Tenants', icon: Building2 },
        { to: '/platform/reference-data', label: 'Question Builder', icon: ListTree },
        { to: '/platform/questionnaires', label: 'Questionnaires', icon: BookOpen },
        { to: '/platform/registry', label: 'FSP Registry', icon: Database },
      ]}
      sectionLabel="Platform administration"
      headerTitle={headerTitle}
    />
  )
}
