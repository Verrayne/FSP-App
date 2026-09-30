import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'

import { Alert, Button, Input } from '../../../components/ui'
import { isSupabaseConfigured } from '../../../config/env'
import { AuthHeading, FormField } from '../components/AuthFields'
import { emailSchema, type EmailValues } from '../schemas/authSchemas'
import { AuthActionError, requestPasswordReset } from '../services/authService'

export function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)
  const [requestError, setRequestError] = useState<string>()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmailValues>({ resolver: zodResolver(emailSchema), defaultValues: { email: '' } })

  async function onSubmit(values: EmailValues) {
    setRequestError(undefined)
    try {
      await requestPasswordReset(values.email)
      setSubmitted(true)
    } catch (error) {
      setRequestError(
        error instanceof AuthActionError
          ? error.message
          : 'Unable to process the request. Please try again.',
      )
    }
  }

  if (submitted) {
    return (
      <div>
        <AuthHeading
          title="Check your email"
          description="If an account exists for this email address, password reset instructions have been sent."
        />
        <div className="mt-6">
          <Alert title="Request received">
            Follow the link in the email to choose a new password. The link expires and can only be
            used through a valid recovery session.
          </Alert>
        </div>
        <Link
          to="/auth/login"
          className="text-brand-700 mt-6 inline-block text-sm font-semibold hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div>
      <AuthHeading
        title="Reset your password"
        description="Enter your account email and we’ll send password reset instructions."
      />
      {requestError && (
        <div className="mt-5">
          <Alert title="Unable to send instructions" variant="danger">
            {requestError}
          </Alert>
        </div>
      )}
      <form
        className="mt-6 space-y-4"
        onSubmit={(event) => void handleSubmit(onSubmit)(event)}
        noValidate
      >
        <FormField id="recoveryEmail" label="Email address" error={errors.email?.message}>
          <Input
            id="recoveryEmail"
            type="email"
            autoComplete="email"
            autoFocus
            {...register('email')}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'recoveryEmail-error' : undefined}
          />
        </FormField>
        <Button
          type="submit"
          className="w-full"
          disabled={!isSupabaseConfigured || isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? 'Sending instructions…' : 'Send reset instructions'}
        </Button>
      </form>
      <Link
        to="/auth/login"
        className="text-brand-700 mt-6 inline-block text-sm font-semibold hover:underline"
      >
        Back to sign in
      </Link>
    </div>
  )
}
