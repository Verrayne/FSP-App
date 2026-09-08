import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'

import { Alert, Button, FormError, Input } from '../../components/ui'
import { buttonVariants } from '../../components/ui/buttonVariants'
import { cn } from '../../lib/utils/cn'
import { isSupabaseConfigured } from '../../config/env'
import { loginSchema, type LoginValues } from '../../lib/validation/auth'

export function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })
  const onSubmit = () => undefined
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 text-sm text-slate-600">Access your compliance workspace.</p>
      {!isSupabaseConfigured && (
        <div className="mt-5">
          <Alert title="Local foundation mode">
            Add the public Supabase environment variables to enable authentication in a later
            prompt.
          </Alert>
        </div>
      )}
      <form
        className="mt-6 space-y-4"
        onSubmit={(event) => void handleSubmit(onSubmit)(event)}
        noValidate
      >
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            Email address
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            {...register('email')}
            aria-invalid={Boolean(errors.email)}
          />
          <FormError>{errors.email?.message}</FormError>
        </div>
        <div>
          <div className="mb-1.5 flex justify-between">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Link
              to="/auth/forgot-password"
              className="text-brand-700 text-xs font-medium hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register('password')}
            aria-invalid={Boolean(errors.password)}
          />
          <FormError>{errors.password?.message}</FormError>
        </div>
        <Button type="submit" className="w-full" disabled={!isSupabaseConfigured}>
          Sign in
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        New to the platform?{' '}
        <Link to="/auth/register" className="text-brand-700 font-semibold hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  )
}

const authCopy = {
  register: [
    'Create your account',
    'Registration will be enabled with the full authentication workflow.',
  ],
  'forgot-password': [
    'Reset your password',
    'Password recovery will send a secure reset link to your registered email.',
  ],
  'reset-password': [
    'Choose a new password',
    'Your reset token will be validated before a new password is accepted.',
  ],
  verify: [
    'Verify your email',
    'Follow the secure link sent to your inbox to verify your account.',
  ],
} as const

export function AuthPlaceholderPage({ page }: { page: keyof typeof authCopy }) {
  const [title, description] = authCopy[page]
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      <Alert title="Workflow reserved" variant="info">
        <p>This route is ready; the business workflow is intentionally deferred.</p>
      </Alert>
      <Link to="/auth/login" className={cn(buttonVariants({ variant: 'secondary' }), 'mt-5')}>
        Back to sign in
      </Link>
    </div>
  )
}
