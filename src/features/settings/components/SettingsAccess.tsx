import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router-dom'

import { hasTenantPermission } from '../../tenant/permissions'
import { useTenant } from '../../tenant/hooks/useTenant'

export function SettingsAccess({ children }: { children?: ReactNode }) {
  const { currentTenant } = useTenant()
  if (!hasTenantPermission(currentTenant, 'settings:access'))
    return <Navigate to="/admin/dashboard" replace />
  return children ?? <Outlet />
}
