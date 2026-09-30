import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { FspMembership } from '../../onboarding/types/onboarding'
import type * as DashboardService from '../services/dashboardService'
import type { DashboardSummary, SubmissionStatus } from '../types/dashboard'
import { DashboardPage } from './DashboardPage'

const service = vi.hoisted(() => ({
  getRelationships: vi.fn(),
  getSummary: vi.fn(),
}))
const fspState = vi.hoisted(() => ({
  current: null as FspMembership | null,
}))

vi.mock('../services/dashboardService', async (importOriginal) => {
  const original = await importOriginal<typeof DashboardService>()
  return {
    ...original,
    getDashboardRelationships: service.getRelationships,
    getDashboardSummary: service.getSummary,
    southAfricanDateKey: () => '2026-09-10',
  }
})

vi.mock('../../onboarding/hooks/useFsp', () => ({
  useFsp: () => ({ currentFsp: fspState.current }),
}))

const membership = (fspId: string, role: FspMembership['role'] = 'ADMIN'): FspMembership => ({
  membershipId: `membership-${fspId}`,
  fspId,
  fspNumber: fspId === 'fsp-a' ? '51234' : '52345',
  registeredName: fspId === 'fsp-a' ? 'Karoo Oak' : 'Highveld Compass',
  tradeName: null,
  role,
  isPrimary: true,
})

const period = {
  id: 'period-a',
  name: '2026 Annual B-BBEE Submission',
  year: 2026,
  openDate: '2026-08-01',
  closeDate: '2026-10-31',
  status: 'OPEN' as const,
}

function summary(status: SubmissionStatus = 'NOT_STARTED') {
  return {
    period,
    submission: {
      id: `submission-${status}`,
      periodId: period.id,
      status,
      route: null,
      startDate: status === 'NOT_STARTED' ? null : '2026-08-20T07:00:00Z',
      submitDate: ['SUBMITTED', 'COMPLETED'].includes(status) ? '2026-09-01T12:00:00Z' : null,
      updateDate: '2026-09-01T12:00:00Z',
    },
    previousSubmission: null,
  } as DashboardSummary
}

function renderDashboard(
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  const result = render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { ...result, client }
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fspState.current = membership('fsp-a')
    service.getRelationships.mockResolvedValue([
      {
        id: 'relationship-a',
        tenantId: 'tenant-a',
        tenantName: 'Cape Horizon',
        brokerReference: 'CHA-1',
      },
    ])
    service.getSummary.mockResolvedValue(summary())
  })

  it('shows the layout skeleton, then a concise current submission summary', async () => {
    renderDashboard()
    expect(screen.getByTestId('dashboard-skeleton')).toHaveAttribute('aria-busy', 'true')
    expect(
      await screen.findByRole('heading', { name: '2026 Annual B-BBEE Submission' }),
    ).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Not started' })).toBeInTheDocument()
    expect(screen.queryByTestId('dashboard-skeleton')).not.toBeInTheDocument()
    expect(screen.getByText('31 October 2026')).toBeInTheDocument()
    expect(screen.queryByText('Due 31 October 2026')).not.toBeInTheDocument()
    expect(screen.queryByText('Reference CHA-1')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Start submission' })).toBeInTheDocument()
  })

  it.each<[SubmissionStatus, string, string]>([
    ['IN_PROGRESS', 'In progress', 'Continue submission'],
    ['SUBMITTED', 'Submitted', 'View submission'],
    ['COMPLETED', 'Completed', 'View submission'],
  ])('renders %s with its mapped action', async (rawStatus, label, action) => {
    service.getSummary.mockResolvedValue(summary(rawStatus))
    renderDashboard()
    expect(await screen.findByRole('heading', { name: label })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: action })).toBeInTheDocument()
  })

  it('keeps the dashboard useful but read-only for viewers', async () => {
    fspState.current = membership('fsp-a', 'VIEWER')
    service.getSummary.mockResolvedValue(summary('IN_PROGRESS'))
    renderDashboard()
    expect(await screen.findByRole('link', { name: 'View submission' })).toBeInTheDocument()
    expect(screen.getByText('Your access is read-only.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Continue submission' })).not.toBeInTheDocument()
  })

  it('replaces loading with a retryable error rather than fabricated data', async () => {
    service.getRelationships.mockRejectedValue(new Error('raw database error'))
    renderDashboard()
    expect(await screen.findByRole('alert')).toHaveTextContent('Dashboard data could not be loaded')
    expect(screen.queryByTestId('dashboard-skeleton')).not.toBeInTheDocument()
    expect(screen.queryByText('raw database error')).not.toBeInTheDocument()
  })

  it('shows deliberate empty states for no relationship and no period', async () => {
    service.getRelationships.mockResolvedValueOnce([])
    const first = renderDashboard()
    expect(await screen.findByText('No reporting relationship')).toBeInTheDocument()
    first.unmount()

    service.getRelationships.mockResolvedValueOnce([
      {
        id: 'relationship-a',
        tenantId: 'tenant-a',
        tenantName: 'Cape Horizon',
        brokerReference: null,
      },
    ])
    service.getSummary.mockResolvedValueOnce({
      period: null,
      submission: null,
      previousSubmission: null,
    })
    renderDashboard()
    expect(await screen.findByText('No submission period available')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Start submission' })).not.toBeInTheDocument()
  })

  it('allows explicit tenant selection for a shared FSP', async () => {
    service.getRelationships.mockResolvedValue([
      {
        id: 'relationship-a',
        tenantId: 'tenant-a',
        tenantName: 'Cape Horizon',
        brokerReference: null,
      },
      {
        id: 'relationship-b',
        tenantId: 'tenant-b',
        tenantName: 'Umoya Mutual',
        brokerReference: null,
      },
    ])
    service.getSummary.mockImplementation((tenantId: string) =>
      Promise.resolve(summary(tenantId === 'tenant-a' ? 'IN_PROGRESS' : 'COMPLETED')),
    )
    renderDashboard()
    expect(await screen.findByRole('heading', { name: 'In progress' })).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('Reporting relationship'), 'relationship-b')
    expect(await screen.findByRole('heading', { name: 'Completed' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'In progress' })).not.toBeInTheDocument()
  })

  it('does not show cached FSP A content while FSP B is loading', async () => {
    const pendingB = new Promise<DashboardSummary>(() => {})
    service.getRelationships.mockImplementation((fspId: string) =>
      Promise.resolve([
        {
          id: `relationship-${fspId}`,
          tenantId: `tenant-${fspId}`,
          tenantName: fspId === 'fsp-a' ? 'Cape Horizon' : 'Umoya Mutual',
          brokerReference: null,
        },
      ]),
    )
    service.getSummary.mockImplementation((tenantId: string) =>
      tenantId === 'tenant-fsp-a' ? Promise.resolve(summary('IN_PROGRESS')) : pendingB,
    )
    const view = renderDashboard()
    expect(await screen.findByRole('heading', { name: 'In progress' })).toBeInTheDocument()
    fspState.current = membership('fsp-b')
    view.rerender(
      <QueryClientProvider client={view.client}>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument())
    expect(screen.queryByRole('heading', { name: 'In progress' })).not.toBeInTheDocument()
  })

  it('retains valid content during a background refetch', async () => {
    const view = renderDashboard()
    expect(await screen.findByRole('heading', { name: 'Not started' })).toBeInTheDocument()
    service.getSummary.mockImplementationOnce(() => new Promise(() => {}))
    act(() => {
      void view.client.invalidateQueries({ queryKey: ['fsp-dashboard', 'summary'] })
    })
    expect(screen.getByRole('heading', { name: 'Not started' })).toBeInTheDocument()
    expect(screen.queryByTestId('dashboard-skeleton')).not.toBeInTheDocument()
  })
})
