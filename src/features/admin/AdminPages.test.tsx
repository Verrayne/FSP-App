import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TenantContext, type TenantContextValue } from '../tenant/context/TenantContext'
import {
  AdminDashboardPage,
  AdminFspPortfolioPage,
  AdminSubmissionOverviewPage,
  AdminSubmissionQueuePage,
} from './AdminPages'

const service = vi.hoisted(() => ({
  dashboard: vi.fn(),
  fsps: vi.fn(),
  periods: vi.fn(),
  submissions: vi.fn(),
  overview: vi.fn(),
  download: vi.fn(),
}))
vi.mock('./services/adminService', () => ({
  adminQueryKeys: {
    dashboard: (id: string) => ['dashboard', id],
    recent: (id: string) => ['recent', id],
    periods: (id: string) => ['periods', id],
    fsps: (id: string, filters: unknown) => ['fsps', id, filters],
    submissions: (id: string, filters: unknown) => ['submissions', id, filters],
    submission: (id: string, submission: string) => ['submission', id, submission],
  },
  getTenantDashboard: service.dashboard,
  getTenantFsps: service.fsps,
  getTenantPeriods: service.periods,
  getTenantSubmissions: service.submissions,
  getTenantSubmissionOverview: service.overview,
  downloadTenantDocument: service.download,
}))

vi.mock('../submissions/components/SubmissionHistoryDetail', () => ({
  SubmissionHistoryDetail: () => (
    <div>
      <p>51.25%</p>
      <p>Category A, Category B</p>
      <p>certificate.pdf</p>
    </div>
  ),
}))

const tenant: TenantContextValue = {
  status: 'ready',
  memberships: [
    { membershipId: 'm1', tenantId: 'tenant-a', code: 'A', name: 'Cape Horizon', role: 'ADMIN' },
  ],
  currentTenant: {
    membershipId: 'm1',
    tenantId: 'tenant-a',
    code: 'A',
    name: 'Cape Horizon',
    role: 'ADMIN',
  },
  selectTenant: vi.fn(),
  refresh: vi.fn().mockResolvedValue(undefined),
}
const submission = {
  submissionId: 'submission-a',
  tenantFspId: 'tf-a',
  fspId: 'fsp-a',
  fspNumber: '51234',
  registeredName: 'Karoo Oak Financial Services',
  tradeName: 'Karoo Oak',
  brokerReference: 'CHA-KO-001',
  periodId: 'period-a',
  periodName: '2026 Annual',
  periodYear: 2026,
  status: 'SUBMITTED' as const,
  route: 'CERTIFICATE' as const,
  startDate: '2026-08-01',
  submitDate: '2026-09-01',
}

function renderPage(node: React.ReactNode, path = '/') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <TenantContext.Provider value={tenant}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/admin/submissions/:submissionId" element={node} />
            <Route path="*" element={node} />
          </Routes>
        </MemoryRouter>
      </TenantContext.Provider>
    </QueryClientProvider>,
  )
}

describe('insurer portal pages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    service.periods.mockResolvedValue([
      {
        id: 'period-a',
        name: '2026 Annual',
        year: 2026,
        status: 'OPEN',
        openDate: '2026-08-01',
        closeDate: '2026-10-31',
      },
    ])
    service.submissions.mockResolvedValue({ items: [submission], total: 1, page: 1, pageSize: 25 })
  })

  it('uses shaped skeletons during dashboard initial loading', () => {
    service.dashboard.mockReturnValue(new Promise(() => {}))
    service.submissions.mockReturnValue(new Promise(() => {}))
    renderPage(<AdminDashboardPage />)
    expect(screen.getByText('Loading insurer information…')).toBeInTheDocument()
  })

  it('renders current-period dashboard metrics and recent submissions', async () => {
    service.dashboard.mockResolvedValue({
      period: {
        id: 'period-a',
        name: '2026 Annual',
        year: 2026,
        openDate: '2026-08-01',
        closeDate: '2026-10-31',
      },
      totalFsps: 2,
      submittedFsps: 1,
      outstandingFsps: 1,
      underReviewSubmissions: 0,
      completedSubmissions: 0,
    })
    renderPage(<AdminDashboardPage />)
    expect(await screen.findByText('Current open period')).toBeInTheDocument()
    expect(screen.getByText('Total FSPs')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Karoo Oak' })).toHaveAttribute(
      'href',
      '/admin/submissions/submission-a',
    )
  })

  it('keeps successful metrics visible when recent submissions fail', async () => {
    service.dashboard.mockResolvedValue({
      period: null,
      totalFsps: 2,
      submittedFsps: 0,
      outstandingFsps: 0,
      underReviewSubmissions: 0,
      completedSubmissions: 0,
    })
    service.submissions.mockRejectedValue(new Error('offline'))
    renderPage(<AdminDashboardPage />)
    expect(await screen.findByText('Total FSPs')).toBeInTheDocument()
    expect(await screen.findByText('Recent submissions could not be loaded')).toBeInTheDocument()
  })

  it('renders the server-backed FSP portfolio and sends URL filter state', async () => {
    service.fsps.mockResolvedValue({
      items: [
        {
          tenantFspId: 'tf-a',
          fspId: 'fsp-a',
          fspNumber: '51234',
          registeredName: 'Karoo Oak Financial Services',
          tradeName: 'Karoo Oak',
          regulatoryStatus: 'AUTHORISED',
          brokerReference: 'CHA-KO-001',
          relationshipStatus: 'ACTIVE',
          submissionId: 'submission-a',
          submissionStatus: 'SUBMITTED',
          submissionRoute: 'CERTIFICATE',
          submitDate: '2026-09-01',
          periodId: 'period-a',
          periodName: '2026 Annual',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 25,
    })
    renderPage(<AdminFspPortfolioPage />, '/admin/fsps?submission=SUBMITTED&sort=fsp_number')
    expect(await screen.findByText('CHA-KO-001')).toBeInTheDocument()
    await waitFor(() =>
      expect(service.fsps).toHaveBeenCalledWith(
        'tenant-a',
        expect.objectContaining({ submissionStatus: 'SUBMITTED', sort: 'fsp_number' }),
      ),
    )
    fireEvent.change(screen.getByPlaceholderText('Search FSP name, number or reference'), {
      target: { value: '51234' },
    })
    fireEvent.submit(
      screen.getByPlaceholderText('Search FSP name, number or reference').closest('form')!,
    )
    await waitFor(() =>
      expect(service.fsps).toHaveBeenLastCalledWith(
        'tenant-a',
        expect.objectContaining({ search: '51234' }),
      ),
    )
  })

  it('renders and filters the period-aware submission queue', async () => {
    renderPage(
      <AdminSubmissionQueuePage />,
      '/admin/submissions?work=NEEDS_REVIEW&route=CERTIFICATE',
    )
    expect(await screen.findByRole('link', { name: 'Karoo Oak' })).toBeInTheDocument()
    await waitFor(() =>
      expect(service.submissions).toHaveBeenCalledWith(
        'tenant-a',
        expect.objectContaining({ work: 'NEEDS_REVIEW', route: 'CERTIFICATE' }),
      ),
    )
  })

  it('renders stored typed responses and document metadata read-only', async () => {
    service.overview.mockResolvedValue({
      id: 'submission-a',
      fspNumber: '51234',
      fspName: 'Karoo Oak',
      brokerReference: 'CHA-KO-001',
      period: {
        id: 'period-a',
        name: '2026 Annual',
        year: 2026,
        status: 'OPEN',
        openDate: '',
        closeDate: '',
      },
      questionnaire: { name: 'Annual declaration', version: 1 },
      status: 'SUBMITTED',
      reviewMode: 'HUMAN_REVIEW',
      route: 'CERTIFICATE',
      startDate: '2026-08-01',
      submitDate: '2026-09-01',
      sections: [
        {
          id: 'section',
          title: 'Ownership',
          responses: [
            { id: 'response', label: 'Black ownership', type: 'PERCENTAGE', value: '51.25%' },
            {
              id: 'multi',
              label: 'Applicable categories',
              type: 'MULTI_SELECT',
              value: 'Category A, Category B',
            },
          ],
        },
      ],
      documents: [
        {
          id: 'document-a',
          filename: 'certificate.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1024,
          uploadDate: '2026-09-01',
        },
      ],
      declaration: null,
      reviews: [],
      findings: [],
    })
    renderPage(<AdminSubmissionOverviewPage />, '/admin/submissions/submission-a')
    expect(await screen.findByText('51.25%')).toBeInTheDocument()
    expect(screen.getByText('Category A, Category B')).toBeInTheDocument()
    expect(screen.getByText('certificate.pdf')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /approve|reject|request changes/i }),
    ).not.toBeInTheDocument()
  })

  it('uses a non-disclosing error for an inaccessible submission', async () => {
    service.overview.mockRejectedValue(new Error('not found'))
    renderPage(<AdminSubmissionOverviewPage />, '/admin/submissions/tenant-b-submission')
    expect(await screen.findByText('Submission could not be found or accessed')).toBeInTheDocument()
    expect(screen.queryByText(/Tenant B/i)).not.toBeInTheDocument()
  })
})
