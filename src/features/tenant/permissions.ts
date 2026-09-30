import type { TenantMembership, TenantRole } from './types'

export type TenantPermission =
  | 'portal:access'
  | 'dashboard:view'
  | 'fsps:view'
  | 'submissions:view'
  | 'settings:access'
  | 'settings:organisation:edit'
  | 'settings:users:manage'
  | 'settings:periods:manage'
  | 'settings:fsps:manage'
  | 'submissions:review'
  | 'submissions:complete-review'
  | 'submissions:request-changes'
  | 'submissions:reject'

const grants: Record<TenantRole, readonly TenantPermission[]> = {
  ADMIN: [
    'portal:access',
    'dashboard:view',
    'fsps:view',
    'submissions:view',
    'settings:access',
    'settings:organisation:edit',
    'settings:users:manage',
    'settings:periods:manage',
    'settings:fsps:manage',
    'submissions:review',
    'submissions:complete-review',
    'submissions:request-changes',
    'submissions:reject',
  ],
  REVIEWER: [
    'portal:access',
    'dashboard:view',
    'fsps:view',
    'submissions:view',
    'submissions:review',
    'submissions:complete-review',
    'submissions:request-changes',
    'submissions:reject',
  ],
  VIEWER: ['portal:access', 'dashboard:view', 'fsps:view', 'submissions:view'],
}

export const canAccessTenantSettings = (role: TenantRole) =>
  grants[role].includes('settings:access')
export const canEditTenantProfile = (role: TenantRole) =>
  grants[role].includes('settings:organisation:edit')
export const canManageTenantUsers = (role: TenantRole) =>
  grants[role].includes('settings:users:manage')
export const canManageSubmissionPeriods = (role: TenantRole) =>
  grants[role].includes('settings:periods:manage')
export const canManageTenantFsps = (role: TenantRole) =>
  grants[role].includes('settings:fsps:manage')

export function hasTenantPermission(
  membership: Pick<TenantMembership, 'role'> | null | undefined,
  permission: TenantPermission,
) {
  return membership ? grants[membership.role].includes(permission) : false
}
