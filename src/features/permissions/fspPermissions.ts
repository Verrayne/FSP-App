import type { FspMembership } from '../onboarding/types/onboarding'

export type FspPermission =
  | 'users:view'
  | 'users:manage'
  | 'profile:view'
  | 'profile:edit'
  | 'addresses:manage'
  | 'contacts:manage'
  | 'submissions:view'
  | 'submissions:edit'
  | 'submissions:submit'

const grants: Record<FspMembership['role'], readonly FspPermission[]> = {
  ADMIN: [
    'users:view',
    'users:manage',
    'profile:view',
    'profile:edit',
    'addresses:manage',
    'contacts:manage',
    'submissions:view',
    'submissions:edit',
    'submissions:submit',
  ],
  SUBMITTER: [
    'users:view',
    'profile:view',
    'submissions:view',
    'submissions:edit',
    'submissions:submit',
  ],
  VIEWER: ['users:view', 'profile:view', 'submissions:view'],
}

export function hasFspPermission(
  membership: Pick<FspMembership, 'role'> | null | undefined,
  permission: FspPermission,
) {
  return membership ? grants[membership.role].includes(permission) : false
}
