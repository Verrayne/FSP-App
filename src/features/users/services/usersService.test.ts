import { describe, expect, it } from 'vitest'

import { hashInvitationToken } from './usersService'

describe('invitation token handling', () => {
  it('produces a stable SHA-256 digest without preserving the raw token', async () => {
    const digest = await hashInvitationToken('local-invitation-token')
    expect(digest).toMatch(/^[0-9a-f]{64}$/)
    expect(digest).not.toContain('local-invitation-token')
    expect(await hashInvitationToken('local-invitation-token')).toBe(digest)
  })
})
