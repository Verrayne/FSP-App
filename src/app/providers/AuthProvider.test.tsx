import { act, render, screen } from '@testing-library/react'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'

import { useAuth } from '../../features/auth/hooks/useAuth'
import { AuthProvider } from './AuthProvider'

const clientMock = vi.hoisted(() => ({
  listener: undefined as ((event: AuthChangeEvent, session: Session | null) => void) | undefined,
  unsubscribe: vi.fn(),
  maybeSingle: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('../../config/env', () => ({ isSupabaseConfigured: true }))
vi.mock('../../lib/supabase/client', () => ({
  getSupabaseBrowserClient: () => ({
    auth: {
      onAuthStateChange: (listener: (event: AuthChangeEvent, session: Session | null) => void) => {
        clientMock.listener = listener
        return { data: { subscription: { unsubscribe: clientMock.unsubscribe } } }
      },
      signOut: clientMock.signOut,
    },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: clientMock.maybeSingle }),
      }),
    }),
  }),
}))

function Observer() {
  const { status, user, profile } = useAuth()
  return <p>{`${status}:${user?.email ?? 'none'}:${profile?.first_name ?? 'none'}`}</p>
}

describe('AuthProvider', () => {
  it('waits for INITIAL_SESSION and restores the authenticated user and profile', async () => {
    const onSignedOut = vi.fn()
    clientMock.maybeSingle.mockResolvedValue({
      data: {
        id: '11111111-1111-4111-8111-111111111111',
        first_name: 'Nomsa',
        last_name: 'Molefe',
      },
      error: null,
    })
    const session = {
      user: {
        id: '11111111-1111-4111-8111-111111111111',
        email: 'nomsa@example.test',
      },
    } as Session

    const { unmount } = render(
      <AuthProvider onSignedOut={onSignedOut}>
        <Observer />
      </AuthProvider>,
    )
    expect(screen.getByText('loading:none:none')).toBeInTheDocument()

    act(() => clientMock.listener?.('INITIAL_SESSION', session))
    expect(await screen.findByText('authenticated:nomsa@example.test:Nomsa')).toBeInTheDocument()

    act(() => clientMock.listener?.('SIGNED_OUT', null))
    expect(await screen.findByText('anonymous:none:none')).toBeInTheDocument()
    expect(onSignedOut).toHaveBeenCalledOnce()

    unmount()
    expect(clientMock.unsubscribe).toHaveBeenCalled()
  })
})
