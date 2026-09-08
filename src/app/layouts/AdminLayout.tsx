import { Building2, FileCheck2, LayoutDashboard, Settings, Users } from 'lucide-react'

import { WorkspaceLayout } from './WorkspaceLayout'

const navigation = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/fsps', label: 'FSPs', icon: Building2 },
  { to: '/admin/submissions', label: 'Submissions', icon: FileCheck2 },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

export function AdminLayout() {
  return <WorkspaceLayout navigation={navigation} sectionLabel="Administration" />
}
