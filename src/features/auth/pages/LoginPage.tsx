import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { Alert, Button, Input } from '../../../components/ui'
import { isSupabaseConfigured } from '../../../config/env'
import { AuthHeading, FormField, PasswordInput } from '../components/AuthFields'
import { loginSchema, type LoginValues } from '../schemas/authSchemas'
import { AuthActionError, safeAuthDestination, signInWithPassword } from '../services/authService'

function safeDestination(state: unknown) {
  if (!state || typeof state !== 'object' || !('from' in state)) return '/app'
  const from = (state as { from?: unknown }).from
  return safeAuthDestination(from)
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [requestError, setRequestError] = useState<string>()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: LoginValues) {
    setRequestError(undefined)
    try {
      await signInWithPassword(values.email, values.password)
      void navigate(safeDestination(location.state), { replace: true })
    } catch (error) {
      setRequestError(
        error instanceof AuthActionError ? error.message : 'Unable to sign in. Please try again.',
      )
    }
  }

  return (
    <div>
      <AuthHeading title="Sign in" description="Access your compliance workspace." />
      {!isSupabaseConfigured && (
        <div className="mt-5">
          <Alert title="Authentication is not configured" variant="danger">
            Add the browser-safe Supabase environment variables to enable sign in.
          </Alert>
        </div>
      )}
      {requestError && (
        <div className="mt-5">
          <Alert title="Unable to sign in" variant="danger">
            {requestError}
          </Alert>
        </div>
      )}
      <form
        className="mt-6 space-y-4"
        onSubmit={(event) => void handleSubmit(onSubmit)(event)}
        noValidate
      >
        <FormField id="email" label="Email address" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            {...register('email')}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
        </FormField>
        <FormField
          id="password"
          label="Password"
          error={errors.password?.message}
          hint={
            <Link
              to="/auth/forgot-password"
              className="text-brand-700 text-xs font-medium hover:underline"
            >
              Forgot password?
            </Link>
          }
        >
          <PasswordInput
            id="password"
            autoComplete="current-password"
            {...register('password')}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'password-error' : undefined}
          />
        </FormField>
        <Button
          type="submit"
          className="w-full"
          disabled={!isSupabaseConfigured || isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        New to the platform?{' '}
        <Link
          to="/auth/register"
          state={location.state as unknown}
          className="text-brand-700 font-semibold hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  )
}
