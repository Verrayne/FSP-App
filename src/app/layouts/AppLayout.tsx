import { Building2, FileClock, FileText, LayoutDashboard, Users } from 'lucide-react'

import { WorkspaceLayout } from './WorkspaceLayout'

const navigation = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/submissions/new', label: 'B-BBEE Submission', icon: FileText },
  { to: '/app/submissions', label: 'Submission History', icon: FileClock },
  { to: '/app/profile', label: 'FSP Profile', icon: Building2 },
  { to: '/app/users', label: 'Users', icon: Users },
]

export function AppLayout() {
  return <WorkspaceLayout navigation={navigation} sectionLabel="FSP workspace" />
}
