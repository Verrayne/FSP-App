import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthContext } from '../../auth/context/AuthContext'
import { useFsp } from '../hooks/useFsp'
import { FspProvider } from './FspProvider'

const serviceMock = vi.hoisted(() => ({
  getOnboardingState: vi.fn(),
  getMyFspMemberships: vi.fn(),
}))

vi.mock('../services/onboardingService', () => ({
  onboardingQueryKeys: {
    state: () => ['fsp-onboarding', 'state'],
    memberships: () => ['fsp-onboarding', 'memberships'],
  },
  getOnboardingState: serviceMock.getOnboardingState,
  getMyFspMemberships: serviceMock.getMyFspMemberships,
}))

const memberships = [
  {
    membershipId: 'm1',
    fspId: 'f1',
    fspNumber: '51234',
    registeredName: 'Karoo Oak Financial Services',
    tradeName: 'Karoo Oak',
    role: 'ADMIN' as const,
    isPrimary: true,
  },
  {
    membershipId: 'm2',
    fspId: 'f2',
    fspNumber: '52345',
    registeredName: 'Highveld Compass Brokers',
    tradeName: null,
    role: 'VIEWER' as const,
    isPrimary: false,
  },
]

function Observer() {
  const { status, memberships: available, currentFsp, selectFsp } = useFsp()
  return (
    <div>
      <p>{`${status}:${available.length}:${currentFsp?.fspId ?? 'none'}`}</p>
      <button onClick={() => selectFsp('f2')}>Switch permitted</button>
      <button onClick={() => selectFsp('unrelated')}>Switch unrelated</button>
    </div>
  )
}

describe('FspProvider', () => {
  beforeEach(() => {
    window.localStorage.clear()
    serviceMock.getOnboardingState.mockResolvedValue({
      state: 'ACTIVE',
      requestId: null,
      fspId: null,
      fspNumber: null,
      fspName: null,
      requestStatus: null,
      requestDate: null,
      rejectionReason: null,
    })
    serviceMock.getMyFspMemberships.mockResolvedValue(memberships)
  })

  it('selects the primary membership and supports permitted multi-FSP switching', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider
          value={{
            status: 'authenticated',
            session: null,
            user: { id: 'user-1' } as never,
            profile: null,
            profileError: false,
            isPasswordRecovery: false,
            signOut: vi.fn(),
            completePasswordRecovery: vi.fn(),
          }}
        >
          <FspProvider>
            <Observer />
          </FspProvider>
        </AuthContext.Provider>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('ready:2:f1')).toBeInTheDocument()
    act(() => screen.getByRole('button', { name: 'Switch permitted' }).click())
    expect(await screen.findByText('ready:2:f2')).toBeInTheDocument()
    expect(window.localStorage.getItem('fsp.current.user-1')).toBe('f2')

    act(() => screen.getByRole('button', { name: 'Switch unrelated' }).click())
    expect(screen.getByText('ready:2:f2')).toBeInTheDocument()
  })

  it('restores only a persisted FSP that still exists in active memberships', async () => {
    window.localStorage.setItem('fsp.current.user-1', 'revoked-fsp')
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider
          value={{
            status: 'authenticated',
            session: null,
            user: { id: 'user-1' } as never,
            profile: null,
            profileError: false,
            isPasswordRecovery: false,
            signOut: vi.fn(),
            completePasswordRecovery: vi.fn(),
          }}
        >
          <FspProvider>
            <Observer />
          </FspProvider>
        </AuthContext.Provider>
      </QueryClientProvider>,
    )
    expect(await screen.findByText('ready:2:f1')).toBeInTheDocument()
  })
})
