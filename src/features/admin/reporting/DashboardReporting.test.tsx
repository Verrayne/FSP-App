import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardReporting } from './DashboardReporting'
import { reportingFixture } from './testFixtures'
import { portfolioColumns } from './model'

const service = vi.hoisted(() => ({ get: vi.fn(), download: vi.fn(), email: vi.fn() }))
vi.mock('./service', () => ({
  getTenantReporting: service.get,
  downloadReport: service.download,
  emailReport: service.email,
}))
vi.mock('../../tenant/hooks/useTenant', () => ({
  useTenant: () => ({
    currentTenant: { tenantId: 'tenant-a', name: 'Cape Horizon', role: 'ADMIN' },
  }),
}))
function renderReports(portfolioOpen = false) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <DashboardReporting
        metrics={{
          period: null,
          totalFsps: 2,
          submittedFsps: 1,
          outstandingFsps: 1,
          underReviewSubmissions: 1,
          completedSubmissions: 0,
        }}
        portfolioOpen={portfolioOpen}
        closePortfolio={vi.fn()}
      />
    </QueryClientProvider>,
  )
}
describe('dashboard report interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    service.get.mockResolvedValue(reportingFixture())
    service.email.mockResolvedValue(undefined)
  })
  it('opens the graph history, exposes 12 rows, and downloads the selected report window', async () => {
    renderReports()
    await screen.findByRole('button', { name: 'Expand Complete vs incomplete' })
    fireEvent.change(screen.getByRole('combobox', { name: 'Reporting window' }), {
      target: { value: '30' },
    })
    await waitFor(() => expect(service.get).toHaveBeenCalledWith('tenant-a', 30))
    fireEvent.click(await screen.findByRole('button', { name: 'Expand Complete vs incomplete' }))
    const dialog = screen.getByRole('dialog', { name: 'Complete vs incomplete' })
    expect(within(dialog).getAllByRole('row')).toHaveLength(13)
    expect(within(dialog).getAllByText('Unavailable').length).toBeGreaterThan(0)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Download Excel' }))
    expect(service.download).toHaveBeenCalledWith(
      expect.anything(),
      'completion',
      'Cape Horizon',
      30,
    )
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close dialog' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
  it('shows the full FSP report columns and filters the visible table', async () => {
    renderReports(true)
    const dialog = await screen.findByRole('dialog', { name: 'FSP portfolio' })
    await within(dialog).findByRole('columnheader', { name: 'FSP Number' })
    expect(within(dialog).getAllByRole('columnheader')).toHaveLength(portfolioColumns.length)
    fireEvent.change(within(dialog).getByRole('searchbox'), { target: { value: '53456' } })
    expect(within(dialog).queryByRole('cell', { name: 'Karoo Oak' })).not.toBeInTheDocument()
    expect(within(dialog).getByRole('cell', { name: 'Ubuntu Meridian' })).toBeInTheDocument()
  })
  it('asks for a recipient and sends through the report endpoint without claiming success early', async () => {
    renderReports()
    fireEvent.click(await screen.findByRole('button', { name: 'Expand Valid vs expired' }))
    const dialog = screen.getByRole('dialog', { name: 'Valid vs expired' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Email Excel report' }))
    fireEvent.change(within(dialog).getByLabelText('Recipient email address'), {
      target: { value: 'recipient@example.test' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send report' }))
    await waitFor(() =>
      expect(service.email).toHaveBeenCalledWith(
        'tenant-a',
        'validity',
        7,
        'recipient@example.test',
        expect.any(String),
      ),
    )
    expect(await within(dialog).findByRole('status')).toHaveTextContent(
      'accepted the report for delivery',
    )
  })
})
