import { useQuery } from '@tanstack/react-query'
import { Building2, Database, FileCheck2, LayoutDashboard, Settings } from 'lucide-react'

import { Select } from '../../components/ui'
import { hasPlatformAccess } from '../../features/registry/registryService'
import { useTenant } from '../../features/tenant/hooks/useTenant'
import { hasTenantPermission } from '../../features/tenant/permissions'
import { WorkspaceLayout } from './WorkspaceLayout'

const baseNavigation = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/fsps', label: 'FSPs', icon: Building2 },
  { to: '/admin/submissions', label: 'Submissions', icon: FileCheck2 },
]

export function AdminLayout() {
  const platformAccess = useQuery({
    queryKey: ['platform-access'],
    queryFn: hasPlatformAccess,
    staleTime: 60_000,
  })
  const { currentTenant, memberships, selectTenant } = useTenant()
  const context =
    memberships.length > 1 ? (
      <div className="flex min-w-0 items-center gap-2">
        <Building2 className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
        <label htmlFor="tenant-context" className="sr-only">
          Current insurer
        </label>
        <Select
          id="tenant-context"
          className="h-8 max-w-72"
          value={currentTenant?.tenantId ?? ''}
          onChange={(event) => selectTenant(event.target.value)}
        >
          {memberships.map((membership) => (
            <option key={membership.membershipId} value={membership.tenantId}>
              {membership.name}
            </option>
          ))}
        </Select>
      </div>
    ) : undefined
  return (
    <WorkspaceLayout
      navigation={
        hasTenantPermission(currentTenant, 'settings:access')
          ? [
              ...baseNavigation,
              { to: '/admin/settings', label: 'Settings', icon: Settings },
              ...(platformAccess.data
                ? [{ to: '/platform/dashboard', label: 'Platform administration', icon: Database }]
                : []),
            ]
          : baseNavigation
      }
      sectionLabel="Insurer workspace"
      context={context}
      workspace="tenant"
    />
  )
}
