import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { WorkspaceLayout } from '../../app/layouts/WorkspaceLayout'
import { AdminAccessGuard, RequireAuth } from './components/RouteGuards'
import {
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
  VerifyPage,
} from './AuthPages'
import { AuthActionError } from './services/authService'
import type { AuthContextValue } from './context/AuthContext'
import type * as AuthServiceModule from './services/authService'

const serviceMocks = vi.hoisted(() => ({
  registerUser: vi.fn(),
  signInWithPassword: vi.fn(),
  requestPasswordReset: vi.fn(),
  resendVerification: vi.fn(),
  updatePassword: vi.fn(),
}))

const authState = vi.hoisted<{ current: AuthContextValue }>(() => ({
  current: {
    status: 'anonymous',
    session: null,
    user: null,
    profile: null,
    profileError: false,
    isPasswordRecovery: false,
    signOut: vi.fn(),
    completePasswordRecovery: vi.fn(),
  },
}))

vi.mock('../../config/env', () => ({ isSupabaseConfigured: true, publicEnv: {} }))
vi.mock('./hooks/useAuth', () => ({ useAuth: () => authState.current }))
vi.mock('./services/authService', async (importOriginal) => {
  const original = await importOriginal<typeof AuthServiceModule>()
  return { ...original, ...serviceMocks }
})

function renderRoute(path: string, routes: Parameters<typeof createMemoryRouter>[0]) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

async function completeRegistrationForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('First name'), '  Nomsa  ')
  await user.type(screen.getByLabelText('Last name'), '  Molefe  ')
  await user.type(screen.getByLabelText('Email address'), '  nomsa@example.test  ')
  await user.type(screen.getByLabelText('Contact number (optional)'), '+27 82 555 0101')
  await user.type(screen.getByLabelText('Job title (optional)'), 'Compliance Officer')
  await user.type(
    screen.getByLabelText('Password', { selector: '#registerPassword' }),
    'secure-pass',
  )
  await user.type(screen.getByLabelText('Confirm password'), 'secure-pass')
}

beforeEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
  authState.current = {
    status: 'anonymous',
    session: null,
    user: null,
    profile: null,
    profileError: false,
    isPasswordRecovery: false,
    signOut: vi.fn(),
    completePasswordRecovery: vi.fn(),
  }
})

describe('registration', () => {
  it('renders the required identity fields without FSP onboarding fields', () => {
    renderRoute('/auth/register', [{ path: '/auth/register', element: <RegisterPage /> }])

    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument()
    expect(screen.getByLabelText('First name')).toBeInTheDocument()
    expect(screen.getByLabelText('Last name')).toBeInTheDocument()
    expect(screen.getByLabelText('Contact number (optional)')).toBeInTheDocument()
    expect(screen.queryByLabelText(/FSP number/i)).not.toBeInTheDocument()
  })

  it('validates required values and password confirmation', async () => {
    const user = userEvent.setup()
    renderRoute('/auth/register', [{ path: '/auth/register', element: <RegisterPage /> }])

    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('Enter your first name.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('First name'), 'Nomsa')
    await user.type(screen.getByLabelText('Last name'), 'Molefe')
    await user.type(screen.getByLabelText('Email address'), 'nomsa@example.test')
    await user.type(
      screen.getByLabelText('Password', { selector: '#registerPassword' }),
      'secure-pass',
    )
    await user.type(screen.getByLabelText('Confirm password'), 'different-pass')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument()
    expect(serviceMocks.registerUser).not.toHaveBeenCalled()
  })

  it('submits trimmed profile data and shows the verification-required state', async () => {
    serviceMocks.registerUser.mockResolvedValue({ requiresVerification: true })
    const user = userEvent.setup()
    renderRoute('/auth/register', [
      { path: '/auth/register', element: <RegisterPage /> },
      { path: '/auth/verify', element: <VerifyPage /> },
    ])

    await completeRegistrationForm(user)
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument()
    expect(serviceMocks.registerUser).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'Nomsa',
        lastName: 'Molefe',
        email: 'nomsa@example.test',
      }),
      '/app',
    )
  })
})

describe('login and recovery', () => {
  it('validates login and returns to the preserved app destination after success', async () => {
    const user = userEvent.setup()
    const router = createMemoryRouter(
      [
        { path: '/auth/login', element: <LoginPage /> },
        { path: '/app/reports', element: <h1>Reports destination</h1> },
      ],
      { initialEntries: [{ pathname: '/auth/login', state: { from: '/app/reports' } }] },
    )
    render(<RouterProvider router={router} />)

    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Email address'), 'user@example.test')
    await user.type(screen.getByLabelText('Password'), 'secret-pass')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('heading', { name: 'Reports destination' })).toBeInTheDocument()
    expect(serviceMocks.signInWithPassword).toHaveBeenCalledWith('user@example.test', 'secret-pass')
  })

  it('shows a safe invalid-login error', async () => {
    serviceMocks.signInWithPassword.mockRejectedValue(
      new AuthActionError('Invalid email or password.'),
    )
    const user = userEvent.setup()
    renderRoute('/auth/login', [{ path: '/auth/login', element: <LoginPage /> }])

    await user.type(screen.getByLabelText('Email address'), 'user@example.test')
    await user.type(screen.getByLabelText('Password'), 'incorrect')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument()
  })

  it('uses a neutral forgot-password confirmation', async () => {
    const user = userEvent.setup()
    renderRoute('/auth/forgot-password', [
      { path: '/auth/forgot-password', element: <ForgotPasswordPage /> },
    ])

    await user.type(screen.getByLabelText('Email address'), 'unknown@example.test')
    await user.click(screen.getByRole('button', { name: 'Send reset instructions' }))

    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument()
    expect(screen.getByText(/If an account exists/i)).toBeInTheDocument()
  })

  it('requires matching passwords during a valid recovery session', async () => {
    authState.current = {
      ...authState.current,
      status: 'authenticated',
      isPasswordRecovery: true,
    }
    const user = userEvent.setup()
    renderRoute('/auth/reset-password', [
      { path: '/auth/reset-password', element: <ResetPasswordPage /> },
    ])

    await user.type(screen.getByLabelText('New password'), 'new-password')
    await user.type(screen.getByLabelText('Confirm new password'), 'not-the-same')
    await user.click(screen.getByRole('button', { name: 'Update password' }))

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument()
    expect(serviceMocks.updatePassword).not.toHaveBeenCalled()
  })

  it('updates the password and clears recovery context after valid recovery', async () => {
    authState.current = {
      ...authState.current,
      status: 'authenticated',
      isPasswordRecovery: true,
    }
    serviceMocks.updatePassword.mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderRoute('/auth/reset-password', [
      { path: '/auth/reset-password', element: <ResetPasswordPage /> },
    ])

    await user.type(screen.getByLabelText('New password'), 'new-password')
    await user.type(screen.getByLabelText('Confirm new password'), 'new-password')
    await user.click(screen.getByRole('button', { name: 'Update password' }))

    expect(await screen.findByRole('heading', { name: 'Password updated' })).toBeInTheDocument()
    expect(serviceMocks.updatePassword).toHaveBeenCalledWith('new-password')
    expect(authState.current.completePasswordRecovery).toHaveBeenCalledOnce()
  })
})

describe('route and session boundaries', () => {
  function LocationView() {
    const location = useLocation()
    return (
      <p>{`${location.pathname}:${String((location.state as { from?: string } | null)?.from)}`}</p>
    )
  }

  it('redirects an anonymous app visitor and preserves the destination', async () => {
    renderRoute('/app/submissions?year=2026', [
      {
        path: '/app/*',
        element: (
          <RequireAuth>
            <p>Private</p>
          </RequireAuth>
        ),
      },
      { path: '/auth/login', element: <LocationView /> },
    ])

    expect(await screen.findByText('/auth/login:/app/submissions?year=2026')).toBeInTheDocument()
  })

  it('allows an authenticated user into the app but keeps admin unavailable', async () => {
    authState.current = { ...authState.current, status: 'authenticated' }
    renderRoute('/app/dashboard', [
      {
        path: '/app/*',
        element: (
          <RequireAuth>
            <p>Authenticated workspace</p>
          </RequireAuth>
        ),
      },
    ])
    expect(screen.getByText('Authenticated workspace')).toBeInTheDocument()

    renderRoute('/admin/dashboard', [
      { path: '/admin/*', element: <AdminAccessGuard /> },
      { path: '/forbidden', element: <p>Admin unavailable</p> },
    ])
    expect(await screen.findByText('Admin unavailable')).toBeInTheDocument()
  })

  it('signs out through the authenticated shell', async () => {
    const signOut = vi.fn().mockResolvedValue(undefined)
    authState.current = {
      ...authState.current,
      status: 'authenticated',
      user: { email: 'nomsa@example.test' } as AuthContextValue['user'],
      profile: {
        id: '11111111-1111-4111-8111-111111111111',
        first_name: 'Nomsa',
        last_name: 'Molefe',
      } as AuthContextValue['profile'],
      signOut,
    }
    const user = userEvent.setup()
    renderRoute('/app/dashboard', [
      {
        path: '/app',
        element: <WorkspaceLayout navigation={[]} sectionLabel="FSP workspace" />,
        children: [{ path: 'dashboard', element: <p>Dashboard</p> }],
      },
      { path: '/auth/login', element: <p>Login destination</p> },
    ])

    await user.click(screen.getByRole('button', { name: /Account/i }))
    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    await waitFor(() => expect(signOut).toHaveBeenCalledOnce())
    expect(await screen.findByText('Login destination')).toBeInTheDocument()
  })

  it('collapses the workspace navigation and remembers the preference', async () => {
    authState.current = {
      ...authState.current,
      status: 'authenticated',
      user: { email: 'nomsa@example.test' } as AuthContextValue['user'],
    }
    const user = userEvent.setup()
    renderRoute('/app/dashboard', [
      {
        path: '/app',
        element: <WorkspaceLayout navigation={[]} sectionLabel="FSP workspace" />,
        children: [{ path: 'dashboard', element: <p>Dashboard</p> }],
      },
    ])

    expect(screen.queryByText('Prototype foundation')).not.toBeInTheDocument()
    const collapse = screen.getByRole('button', { name: 'Collapse navigation' })
    expect(collapse).toHaveAttribute('aria-expanded', 'true')

    await user.click(collapse)

    expect(screen.getByRole('button', { name: 'Expand navigation' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(window.localStorage.getItem('workspace-sidebar-collapsed')).toBe('true')
  })
})
