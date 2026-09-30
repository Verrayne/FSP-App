import { describe, expect, it } from 'vitest'

import { hasFspPermission } from './fspPermissions'

describe('FSP permissions', () => {
  it('allows every active role to view users and submissions', () => {
    for (const role of ['ADMIN', 'SUBMITTER', 'VIEWER'] as const) {
      expect(hasFspPermission({ role }, 'users:view')).toBe(true)
      expect(hasFspPermission({ role }, 'submissions:view')).toBe(true)
    }
  })

  it('reserves user administration for administrators', () => {
    expect(hasFspPermission({ role: 'ADMIN' }, 'users:manage')).toBe(true)
    expect(hasFspPermission({ role: 'SUBMITTER' }, 'users:manage')).toBe(false)
    expect(hasFspPermission({ role: 'VIEWER' }, 'users:manage')).toBe(false)
  })

  it('keeps viewers read-only', () => {
    expect(hasFspPermission({ role: 'VIEWER' }, 'submissions:edit')).toBe(false)
    expect(hasFspPermission({ role: 'VIEWER' }, 'submissions:submit')).toBe(false)
  })

  it('allows every role to view the profile but only administrators to maintain it', () => {
    for (const role of ['ADMIN', 'SUBMITTER', 'VIEWER'] as const) {
      expect(hasFspPermission({ role }, 'profile:view')).toBe(true)
    }
    expect(hasFspPermission({ role: 'ADMIN' }, 'profile:edit')).toBe(true)
    expect(hasFspPermission({ role: 'ADMIN' }, 'addresses:manage')).toBe(true)
    expect(hasFspPermission({ role: 'ADMIN' }, 'contacts:manage')).toBe(true)
    for (const role of ['SUBMITTER', 'VIEWER'] as const) {
      expect(hasFspPermission({ role }, 'profile:edit')).toBe(false)
      expect(hasFspPermission({ role }, 'addresses:manage')).toBe(false)
      expect(hasFspPermission({ role }, 'contacts:manage')).toBe(false)
    }
  })
})
