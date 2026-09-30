import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'

import { Alert, Button } from '../../../components/ui'
import { AuthHeading, AuthLoading, FormField, PasswordInput } from '../components/AuthFields'
import { useAuth } from '../hooks/useAuth'
import { resetPasswordSchema, type ResetPasswordValues } from '../schemas/authSchemas'
import { AuthActionError, updatePassword } from '../services/authService'

export function ResetPasswordPage() {
  const { status, isPasswordRecovery, completePasswordRecovery } = useAuth()
  const [searchParams] = useSearchParams()
  const [complete, setComplete] = useState(false)
  const [requestError, setRequestError] = useState<string>()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  async function onSubmit(values: ResetPasswordValues) {
    setRequestError(undefined)
    try {
      await updatePassword(values.password)
      completePasswordRecovery()
      setComplete(true)
    } catch (error) {
      setRequestError(
        error instanceof AuthActionError
          ? error.message
          : 'Unable to update your password. Request a new recovery email.',
      )
    }
  }

  if (status === 'loading') return <AuthLoading label="Validating your recovery link…" />

  if (complete) {
    return (
      <div>
        <AuthHeading
          title="Password updated"
          description="Your new password is active and your secure session remains signed in."
        />
        <Link
          to="/app"
          className="text-brand-700 mt-6 inline-block text-sm font-semibold hover:underline"
        >
          Continue to your workspace
        </Link>
      </div>
    )
  }

  if (searchParams.has('error') || !isPasswordRecovery || status !== 'authenticated') {
    return (
      <div>
        <AuthHeading
          title="Recovery link unavailable"
          description="This password recovery link is invalid, expired or has already been used."
        />
        <div className="mt-6">
          <Alert title="Request a new link" variant="danger">
            For your security, password changes require a fresh recovery session.
          </Alert>
        </div>
        <Link
          to="/auth/forgot-password"
          className="text-brand-700 mt-6 inline-block text-sm font-semibold hover:underline"
        >
          Request another reset email
        </Link>
      </div>
    )
  }

  return (
    <div>
      <AuthHeading
        title="Choose a new password"
        description="Use at least 8 characters. Your new password takes effect immediately."
      />
      {requestError && (
        <div className="mt-5">
          <Alert title="Unable to update password" variant="danger">
            {requestError}
          </Alert>
        </div>
      )}
      <form
        className="mt-6 space-y-4"
        onSubmit={(event) => void handleSubmit(onSubmit)(event)}
        noValidate
      >
        <FormField id="newPassword" label="New password" error={errors.password?.message}>
          <PasswordInput
            id="newPassword"
            autoComplete="new-password"
            autoFocus
            {...register('password')}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'newPassword-error' : undefined}
          />
        </FormField>
        <FormField
          id="confirmNewPassword"
          label="Confirm new password"
          error={errors.confirmPassword?.message}
        >
          <PasswordInput
            id="confirmNewPassword"
            autoComplete="new-password"
            {...register('confirmPassword')}
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby={errors.confirmPassword ? 'confirmNewPassword-error' : undefined}
          />
        </FormField>
        <Button type="submit" className="w-full" disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? 'Updating password…' : 'Update password'}
        </Button>
      </form>
    </div>
  )
}
