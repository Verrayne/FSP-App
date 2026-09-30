import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useSearchParams } from 'react-router-dom'

import { Alert, Button, Input } from '../../../components/ui'
import { isSupabaseConfigured } from '../../../config/env'
import { AuthHeading, AuthLoading, FormField } from '../components/AuthFields'
import { useAuth } from '../hooks/useAuth'
import { emailSchema, type EmailValues } from '../schemas/authSchemas'
import { AuthActionError, resendVerification, safeAuthDestination } from '../services/authService'

function registrationEmail(state: unknown) {
  if (!state || typeof state !== 'object' || !('registrationEmail' in state)) return ''
  const value = (state as { registrationEmail?: unknown }).registrationEmail
  return typeof value === 'string' ? value : ''
}

export function VerifyPage() {
  const { status } = useAuth()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const returnTo = safeAuthDestination(
    searchParams.get('returnTo') ??
      (location.state && typeof location.state === 'object' && 'returnTo' in location.state
        ? (location.state as { returnTo?: unknown }).returnTo
        : undefined),
  )
  const email = registrationEmail(location.state)
  const [resent, setResent] = useState(false)
  const [requestError, setRequestError] = useState<string>()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmailValues>({ resolver: zodResolver(emailSchema), defaultValues: { email } })

  async function onResend(values: EmailValues) {
    setRequestError(undefined)
    try {
      await resendVerification(values.email, returnTo)
      setResent(true)
    } catch (error) {
      setRequestError(
        error instanceof AuthActionError ? error.message : 'Unable to resend the email.',
      )
    }
  }

  if (searchParams.has('confirmed') && status === 'loading') {
    return <AuthLoading label="Confirming your email…" />
  }

  if (searchParams.has('error') || (searchParams.has('confirmed') && status === 'anonymous')) {
    return (
      <div>
        <AuthHeading
          title="Verification link unavailable"
          description="This verification link is invalid, expired or has already been used."
        />
        <Link
          to="/auth/login"
          state={{ from: returnTo }}
          className="text-brand-700 mt-6 inline-block text-sm font-semibold hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  if (searchParams.has('confirmed') && status === 'authenticated') {
    return (
      <div>
        <AuthHeading
          title="Email verified"
          description="Your identity is confirmed and your account is ready."
        />
        <div className="mt-6">
          <Alert title="Verification complete">
            Continue to the authenticated workspace. FSP connection is handled in the next step.
          </Alert>
        </div>
        <Link
          to={returnTo}
          className="text-brand-700 mt-6 inline-block text-sm font-semibold hover:underline"
        >
          {returnTo.startsWith('/invite/') ? 'Continue to invitation' : 'Continue to workspace'}
        </Link>
      </div>
    )
  }

  return (
    <div>
      <AuthHeading
        title="Check your email"
        description="We sent a verification link to the email address used for registration."
      />
      <div className="mt-6">
        <Alert title={resent ? 'Verification email requested' : 'Verification required'}>
          Follow the link in the email before signing in. If it is not in your inbox, check your
          spam folder or request another email below.
        </Alert>
      </div>
      {requestError && (
        <div className="mt-4">
          <Alert title="Unable to resend email" variant="danger">
            {requestError}
          </Alert>
        </div>
      )}
      <form
        className="mt-6 space-y-4"
        onSubmit={(event) => void handleSubmit(onResend)(event)}
        noValidate
      >
        <FormField id="verificationEmail" label="Email address" error={errors.email?.message}>
          <Input
            id="verificationEmail"
            type="email"
            autoComplete="email"
            {...register('email')}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'verificationEmail-error' : undefined}
          />
        </FormField>
        <Button
          type="submit"
          variant="secondary"
          className="w-full"
          disabled={!isSupabaseConfigured || isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? 'Requesting email…' : 'Resend verification email'}
        </Button>
      </form>
      <Link
        to="/auth/login"
        state={{ from: returnTo }}
        className="text-brand-700 mt-6 inline-block text-sm font-semibold hover:underline"
      >
        Back to sign in
      </Link>
    </div>
  )
}
