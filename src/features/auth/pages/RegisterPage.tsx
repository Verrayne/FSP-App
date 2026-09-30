import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { Alert, Button, Input } from '../../../components/ui'
import { isSupabaseConfigured } from '../../../config/env'
import { AuthHeading, FormField, PasswordInput } from '../components/AuthFields'
import { registrationSchema, type RegistrationValues } from '../schemas/authSchemas'
import { AuthActionError, registerUser, safeAuthDestination } from '../services/authService'

export function RegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = safeAuthDestination(
    location.state && typeof location.state === 'object' && 'from' in location.state
      ? (location.state as { from?: unknown }).from
      : undefined,
  )
  const [requestError, setRequestError] = useState<string>()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      contactNumber: '',
      jobTitle: '',
      password: '',
      confirmPassword: '',
    },
  })

  async function onSubmit(values: RegistrationValues) {
    setRequestError(undefined)
    try {
      const result = await registerUser(values, returnTo)
      if (result.requiresVerification) {
        void navigate('/auth/verify', {
          replace: true,
          state: { registrationEmail: values.email, returnTo },
        })
      } else {
        void navigate(returnTo, { replace: true })
      }
    } catch (error) {
      setRequestError(
        error instanceof AuthActionError
          ? error.message
          : 'Unable to create the account. Please try again.',
      )
    }
  }

  return (
    <div>
      <AuthHeading
        title="Create your account"
        description="Set up your identity first. You’ll connect to an FSP in the next step."
      />
      {!isSupabaseConfigured && (
        <div className="mt-5">
          <Alert title="Authentication is not configured" variant="danger">
            Add the browser-safe Supabase environment variables to enable registration.
          </Alert>
        </div>
      )}
      {requestError && (
        <div className="mt-5">
          <Alert title="Unable to create account" variant="danger">
            {requestError}
          </Alert>
        </div>
      )}
      <form
        className="mt-6 space-y-4"
        onSubmit={(event) => void handleSubmit(onSubmit)(event)}
        noValidate
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="firstName" label="First name" error={errors.firstName?.message}>
            <Input
              id="firstName"
              autoComplete="given-name"
              autoFocus
              {...register('firstName')}
              aria-invalid={Boolean(errors.firstName)}
              aria-describedby={errors.firstName ? 'firstName-error' : undefined}
            />
          </FormField>
          <FormField id="lastName" label="Last name" error={errors.lastName?.message}>
            <Input
              id="lastName"
              autoComplete="family-name"
              {...register('lastName')}
              aria-invalid={Boolean(errors.lastName)}
              aria-describedby={errors.lastName ? 'lastName-error' : undefined}
            />
          </FormField>
        </div>
        <FormField id="registerEmail" label="Email address" error={errors.email?.message}>
          <Input
            id="registerEmail"
            type="email"
            autoComplete="email"
            {...register('email')}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'registerEmail-error' : undefined}
          />
        </FormField>
        <FormField
          id="contactNumber"
          label="Contact number (optional)"
          error={errors.contactNumber?.message}
        >
          <Input
            id="contactNumber"
            type="tel"
            autoComplete="tel"
            {...register('contactNumber')}
            aria-invalid={Boolean(errors.contactNumber)}
            aria-describedby={errors.contactNumber ? 'contactNumber-error' : undefined}
          />
        </FormField>
        <FormField id="jobTitle" label="Job title (optional)" error={errors.jobTitle?.message}>
          <Input
            id="jobTitle"
            autoComplete="organization-title"
            {...register('jobTitle')}
            aria-invalid={Boolean(errors.jobTitle)}
            aria-describedby={errors.jobTitle ? 'jobTitle-error' : undefined}
          />
        </FormField>
        <FormField id="registerPassword" label="Password" error={errors.password?.message}>
          <PasswordInput
            id="registerPassword"
            autoComplete="new-password"
            {...register('password')}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={
              errors.password
                ? 'registerPassword-error register-password-help'
                : 'register-password-help'
            }
          />
          <p id="register-password-help" className="mt-1 text-xs text-slate-500">
            Use at least 8 characters.
          </p>
        </FormField>
        <FormField
          id="confirmPassword"
          label="Confirm password"
          error={errors.confirmPassword?.message}
        >
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            {...register('confirmPassword')}
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
          />
        </FormField>
        <p className="text-xs leading-5 text-slate-500">
          By creating an account, you acknowledge the{' '}
          <Link to="/terms" className="text-brand-700 font-medium hover:underline">
            Terms of Use
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="text-brand-700 font-medium hover:underline">
            Privacy Notice
          </Link>
          .
        </p>
        <Button
          type="submit"
          className="w-full"
          disabled={!isSupabaseConfigured || isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Already registered?{' '}
        <Link
          to="/auth/login"
          state={{ from: returnTo }}
          className="text-brand-700 font-semibold hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
