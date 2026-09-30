import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FspContext, type FspContextValue } from './context/FspContext'
import { AppEntryRedirect } from './components/OnboardingGuards'
import {
  FindFspPage,
  OnboardingLandingPage,
  PendingOnboardingPage,
  ReviewFspPage,
} from './pages/OnboardingPages'

const serviceMock = vi.hoisted(() => ({
  searchFsps: vi.fn(),
  getFspForOnboarding: vi.fn(),
  requestFspLink: vi.fn(),
}))

vi.mock('./services/onboardingService', () => ({
  onboardingQueryKeys: {
    root: ['fsp-onboarding'],
    search: (query: string, page: number) => ['fsp-onboarding', 'search', query, page],
    detail: (fspId: string) => ['fsp-onboarding', 'detail', fspId],
  },
  validateFspSearch: (query: string) =>
    query.trim().length >= 2 ? null : 'Enter at least 2 characters.',
  searchFsps: serviceMock.searchFsps,
  getFspForOnboarding: serviceMock.getFspForOnboarding,
  requestFspLink: serviceMock.requestFspLink,
}))

const noFsp = {
  state: 'NO_FSP' as const,
  requestId: null,
  fspId: null,
  fspNumber: null,
  fspName: null,
  requestStatus: null,
  requestDate: null,
  rejectionReason: null,
}

function renderPage(node: React.ReactNode, context: Partial<FspContextValue> = {}, path = '/') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const value: FspContextValue = {
    status: 'ready',
    onboarding: noFsp,
    memberships: [],
    currentFsp: null,
    selectFsp: vi.fn(),
    refresh: vi.fn().mockResolvedValue(undefined),
    ...context,
  }
  return render(
    <QueryClientProvider client={queryClient}>
      <FspContext.Provider value={value}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/app/onboarding/fsp/:fspId" element={node} />
            <Route path="*" element={node} />
            <Route path="/app/onboarding/pending" element={<p>Pending route</p>} />
            <Route path="/app/dashboard" element={<p>Dashboard route</p>} />
          </Routes>
        </MemoryRouter>
      </FspContext.Provider>
    </QueryClientProvider>,
  )
}

describe('FSP onboarding pages', () => {
  beforeEach(() => vi.clearAllMocks())

  it('introduces onboarding with one clear primary action', () => {
    renderPage(<OnboardingLandingPage />)
    expect(screen.getByRole('heading', { name: 'Link your FSP' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Find my FSP' })).toHaveAttribute(
      'href',
      '/app/onboarding/find-fsp',
    )
  })

  it('shows a rejected request and allows a corrected search', () => {
    renderPage(<OnboardingLandingPage />, {
      onboarding: {
        ...noFsp,
        state: 'REJECTED',
        fspNumber: '51234',
        rejectionReason: 'Authority could not be confirmed.',
      },
    })
    expect(
      screen.getByRole('heading', { name: 'Your access request was not approved' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Authority could not be confirmed.')).toBeInTheDocument()
  })

  it('validates search input and renders database search results', async () => {
    serviceMock.searchFsps.mockResolvedValue([
      {
        id: 'f1',
        fspNumber: '51234',
        registeredName: 'Karoo Oak Financial Services',
        tradeName: 'Karoo Oak',
        status: 'AUTHORISED',
        statusEffectiveDate: '2020-01-01',
        claimable: true,
        totalCount: 1,
      },
    ])
    renderPage(<FindFspPage />)
    fireEvent.change(screen.getByLabelText('FSP number or name'), { target: { value: 'K' } })
    expect(screen.getByText('Enter at least 2 characters.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('FSP number or name'), { target: { value: 'Karoo' } })
    expect(
      await screen.findByText('Karoo Oak Financial Services', {}, { timeout: 1500 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Select FSP 51234/ })).toBeInTheDocument()
  })

  it('renders a focused no-results state without offering registry creation', async () => {
    serviceMock.searchFsps.mockResolvedValue([])
    renderPage(<FindFspPage />)
    fireEvent.change(screen.getByLabelText('FSP number or name'), { target: { value: 'Missing' } })
    expect(
      await screen.findByText('No matching FSP found', {}, { timeout: 1500 }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/create fsp/i)).not.toBeInTheDocument()
  })

  it('reviews an FSP before creating a request and routes to pending', async () => {
    serviceMock.getFspForOnboarding.mockResolvedValue({
      id: 'f1',
      fspNumber: '51234',
      registeredName: 'Karoo Oak Financial Services',
      tradeName: 'Karoo Oak',
      registrationNumber: '2018/123456/07',
      fspType: 'FINANCIAL_ADVISER',
      status: 'AUTHORISED',
      statusEffectiveDate: '2020-01-01',
      claimable: true,
      address: {
        line1: '18 Market Street',
        line2: null,
        suburb: 'City Bowl',
        city: 'Cape Town',
        province: 'Western Cape',
        postalCode: '8001',
        countryCode: 'ZA',
      },
    })
    serviceMock.requestFspLink.mockResolvedValue({
      outcome: 'CREATED',
      requestId: 'r1',
      requestStatus: 'PENDING',
      requestDate: '2026-09-09',
    })
    renderPage(<ReviewFspPage />, {}, '/app/onboarding/fsp/f1')
    expect(
      await screen.findByRole('heading', { name: 'Is this the correct FSP?' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/18 Market Street/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and request access' }))
    await waitFor(() => expect(serviceMock.requestFspLink).toHaveBeenCalledWith('f1'))
    expect(await screen.findByText('Pending route')).toBeInTheDocument()
  })

  it('prevents requesting an ineligible FSP', async () => {
    serviceMock.getFspForOnboarding.mockResolvedValue({
      id: 'f1',
      fspNumber: '51234',
      registeredName: 'Closed FSP',
      tradeName: null,
      registrationNumber: null,
      fspType: null,
      status: 'WITHDRAWN',
      statusEffectiveDate: null,
      claimable: false,
      address: null,
    })
    renderPage(<ReviewFspPage />, {}, '/app/onboarding/fsp/f1')
    expect(await screen.findByText('This FSP cannot be linked')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm and request access' })).toBeDisabled()
  })

  it('shows the pending request without exposing reviewer details', () => {
    renderPage(<PendingOnboardingPage />, {
      onboarding: {
        ...noFsp,
        state: 'LINK_PENDING',
        requestId: 'r1',
        fspId: 'f1',
        fspNumber: '51234',
        fspName: 'Karoo Oak Financial Services',
        requestStatus: 'PENDING',
        requestDate: '2026-09-09',
      },
    })
    expect(
      screen.getByRole('heading', { name: 'Your request is awaiting approval' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Pending verification')).toBeInTheDocument()
    expect(screen.queryByText(/reviewed by/i)).not.toBeInTheDocument()
  })

  it('routes active and pending users to the correct app entry without rendering the dashboard first', () => {
    const { rerender } = renderPage(<AppEntryRedirect />, {
      onboarding: { ...noFsp, state: 'LINK_PENDING' },
    })
    expect(screen.getByText('Pending route')).toBeInTheDocument()
    rerender(<p />)
  })
})
