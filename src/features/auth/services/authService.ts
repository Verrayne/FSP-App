import type { AuthError } from '@supabase/supabase-js'

import { publicEnv } from '../../../config/env'
import { getSupabaseBrowserClient } from '../../../lib/supabase/client'
import type { RegistrationValues } from '../schemas/authSchemas'

type AuthOperation = 'login' | 'register' | 'resend' | 'recovery' | 'password-update'

export class AuthActionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthActionError'
  }
}

function reportAuthError(operation: AuthOperation, error: AuthError) {
  if (import.meta.env.DEV) {
    console.error('Supabase Auth request failed', {
      operation,
      code: error.code,
      status: error.status,
    })
  }
}

function friendlyAuthMessage(error: AuthError, operation: AuthOperation) {
  const code = error.code ?? ''
  const message = error.message.toLowerCase()

  if (code.includes('rate_limit') || message.includes('rate limit')) {
    return 'Too many attempts. Please wait a moment and try again.'
  }

  if (message.includes('fetch') || message.includes('network')) {
    return 'We could not reach the authentication service. Check your connection and try again.'
  }

  if (operation === 'login') {
    if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
      return 'Please verify your email address before signing in.'
    }
    return 'Invalid email or password.'
  }

  if (operation === 'password-update') {
    if (code.includes('weak_password') || message.includes('password')) {
      return 'Your password could not be updated. Use at least 8 characters and try again.'
    }
    return 'This recovery link is invalid or has expired. Request a new password reset email.'
  }

  if (operation === 'register') {
    if (code.includes('weak_password') || message.includes('password')) {
      return 'Use a password containing at least 8 characters.'
    }
    return 'We could not create the account. Check your details or try again shortly.'
  }

  if (operation === 'resend') return 'We could not resend the email. Please wait and try again.'

  return 'We could not process the request. Please wait and try again.'
}

function throwFriendly(error: AuthError, operation: AuthOperation): never {
  reportAuthError(operation, error)
  throw new AuthActionError(friendlyAuthMessage(error, operation))
}

export function safeAuthDestination(value: unknown) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/app'
  return value.startsWith('/app') || value.startsWith('/invite/') ? value : '/app'
}

export function getAuthRedirectUrl(path: string) {
  const baseUrl = publicEnv.VITE_APP_URL ?? window.location.origin
  return new URL(path, baseUrl).toString()
}

export async function registerUser(values: RegistrationValues, returnTo = '/app') {
  const client = getSupabaseBrowserClient()
  const { data, error } = await client.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
      emailRedirectTo: getAuthRedirectUrl(
        `/auth/verify?confirmed=1&returnTo=${encodeURIComponent(safeAuthDestination(returnTo))}`,
      ),
      data: {
        first_name: values.firstName,
        last_name: values.lastName,
        contact_number: values.contactNumber || undefined,
        job_title: values.jobTitle || undefined,
      },
    },
  })

  if (error) throwFriendly(error, 'register')
  if (!data.user) throw new AuthActionError('We could not create the account. Please try again.')

  return { requiresVerification: !data.session }
}

export async function signInWithPassword(email: string, password: string) {
  const { error } = await getSupabaseBrowserClient().auth.signInWithPassword({ email, password })
  if (error) throwFriendly(error, 'login')
}

export async function resendVerification(email: string, returnTo = '/app') {
  const { error } = await getSupabaseBrowserClient().auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: getAuthRedirectUrl(
        `/auth/verify?confirmed=1&returnTo=${encodeURIComponent(safeAuthDestination(returnTo))}`,
      ),
    },
  })
  if (error) throwFriendly(error, 'resend')
}

export async function requestPasswordReset(email: string) {
  const { error } = await getSupabaseBrowserClient().auth.resetPasswordForEmail(email, {
    redirectTo: getAuthRedirectUrl('/auth/reset-password'),
  })
  if (error) {
    reportAuthError('recovery', error)
    if (error.code?.includes('rate_limit') || error.message.toLowerCase().includes('rate limit')) {
      throw new AuthActionError('Too many attempts. Please wait a moment and try again.')
    }
    if (
      (error.status ?? 0) >= 500 ||
      error.message.toLowerCase().includes('fetch') ||
      error.message.toLowerCase().includes('network')
    ) {
      throw new AuthActionError(
        'We could not reach the authentication service. Check your connection and try again.',
      )
    }
  }
}

export async function updatePassword(password: string) {
  const { error } = await getSupabaseBrowserClient().auth.updateUser({ password })
  if (error) throwFriendly(error, 'password-update')
}
