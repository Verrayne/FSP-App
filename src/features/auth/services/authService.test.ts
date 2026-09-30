import { beforeEach, describe, expect, it, vi } from 'vitest'

import { registerUser, requestPasswordReset, signInWithPassword } from './authService'

const authMocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  resetPasswordForEmail: vi.fn(),
}))

vi.mock('../../../config/env', () => ({
  publicEnv: { VITE_APP_URL: 'https://app.example.test' },
}))
vi.mock('../../../lib/supabase/client', () => ({
  getSupabaseBrowserClient: () => ({ auth: authMocks }),
}))

beforeEach(() => vi.clearAllMocks())

describe('auth service', () => {
  it('registers with PKCE callback metadata limited to profile display fields', async () => {
    authMocks.signUp.mockResolvedValue({
      data: { user: { id: 'user-id' }, session: null },
      error: null,
    })

    await expect(
      registerUser({
        firstName: 'Nomsa',
        lastName: 'Molefe',
        email: 'nomsa@example.test',
        contactNumber: '',
        jobTitle: 'Compliance Officer',
        password: 'secure-pass',
        confirmPassword: 'secure-pass',
      }),
    ).resolves.toEqual({ requiresVerification: true })

    expect(authMocks.signUp).toHaveBeenCalledWith({
      email: 'nomsa@example.test',
      password: 'secure-pass',
      options: {
        emailRedirectTo: 'https://app.example.test/auth/verify?confirmed=1&returnTo=%2Fapp',
        data: {
          first_name: 'Nomsa',
          last_name: 'Molefe',
          contact_number: undefined,
          job_title: 'Compliance Officer',
        },
      },
    })
  })

  it('uses generic invalid-credential messaging', async () => {
    authMocks.signInWithPassword.mockResolvedValue({
      error: { code: 'invalid_credentials', message: 'Invalid login credentials', status: 400 },
    })

    await expect(signInWithPassword('unknown@example.test', 'incorrect')).rejects.toThrow(
      'Invalid email or password.',
    )
  })

  it('uses the fixed reset route and does not reveal ordinary recovery errors', async () => {
    authMocks.resetPasswordForEmail.mockResolvedValue({
      error: { code: 'user_not_found', message: 'User not found', status: 400 },
    })

    await expect(requestPasswordReset('unknown@example.test')).resolves.toBeUndefined()
    expect(authMocks.resetPasswordForEmail).toHaveBeenCalledWith('unknown@example.test', {
      redirectTo: 'https://app.example.test/auth/reset-password',
    })
  })
})
