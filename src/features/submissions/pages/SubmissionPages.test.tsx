import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { FspMembership } from '../../onboarding/types/onboarding'
import type * as SubmissionService from '../services/submissionService'
import type { SubmissionWorkflow } from '../types/submission'
import { SubmissionWorkflowPage } from './SubmissionPages'

const service = vi.hoisted(() => ({
  load: vi.fn(),
  save: vi.fn(),
  acknowledge: vi.fn(),
  submit: vi.fn(),
  upload: vi.fn(),
}))
const state = vi.hoisted<{ role: FspMembership['role'] }>(() => ({ role: 'ADMIN' }))

vi.mock('../services/submissionService', async (importOriginal) => {
  const original = await importOriginal<typeof SubmissionService>()
  return {
    ...original,
    loadSubmissionWorkflow: service.load,
    saveSubmissionResponse: service.save,
    acknowledgeDeclaration: service.acknowledge,
    submitSubmission: service.submit,
    uploadCertificate: service.upload,
  }
})

vi.mock('../../onboarding/hooks/useFsp', () => ({
  useFsp: () => ({
    currentFsp: { fspId: 'fsp-a', role: state.role },
    refresh: vi.fn(),
  }),
}))

vi.mock('../components/SubmissionHistoryDetail', () => ({
  SubmissionHistoryDetail: () => <h2>Review submission</h2>,
}))

function workflow(overrides: Partial<SubmissionWorkflow> = {}): SubmissionWorkflow {
  return {
    id: 'submission-a',
    status: 'IN_PROGRESS',
    route: 'AFFIDAVIT',
    tenantFspId: 'relationship-a',
    tenantId: 'tenant-a',
    tenantName: 'Cape Horizon',
    fspId: 'fsp-a',
    period: {
      id: 'period-a',
      name: '2026 Annual B-BBEE Submission',
      openDate: '2026-08-01',
      closeDate: '2026-10-31',
      questionnaireVersionId: 'version-a',
    },
    questionnaire: { name: 'Annual questionnaire', versionNumber: 1 },
    sections: [
      {
        id: 'section-a',
        title: 'First section',
        description: null,
        sortOrder: 10,
        questions: [
          {
            id: 'boolean',
            sectionId: 'section-a',
            sortOrder: 10,
            required: true,
            readOnly: false,
            defaultValue: null,
            code: 'BOOLEAN',
            label: 'Show details?',
            helpText: null,
            placeholder: null,
            validationRules: {},
            type: 'BOOLEAN',
            options: [],
          },
          {
            id: 'details',
            sectionId: 'section-a',
            sortOrder: 20,
            required: true,
            readOnly: false,
            defaultValue: null,
            code: 'DETAILS',
            label: 'Conditional details',
            helpText: 'Only shown when needed.',
            placeholder: null,
            validationRules: {},
            type: 'TEXT',
            options: [],
          },
        ],
      },
      { id: 'section-b', title: 'Second section', description: null, sortOrder: 20, questions: [] },
    ],
    conditions: [
      {
        targetQuestionId: 'details',
        sourceQuestionId: 'boolean',
        operator: 'EQUALS',
        comparisonValue: true,
        action: 'SHOW',
        sortOrder: 10,
      },
    ],
    responses: { boolean: false },
    document: null,
    declaration: {
      id: 'declaration-a',
      title: 'Declaration',
      text: 'I confirm.',
      declarantName: 'Ayanda Dlamini',
      acceptedDate: '2026-09-10T08:00:00Z',
    },
    declarationTemplate: { id: 'template-a', title: 'Declaration', text: 'I confirm.' },
    submitDate: null,
    ...overrides,
  }
}

function renderPage() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/app/submissions/submission-a']}>
        <Routes>
          <Route path="/app/submissions/:id" element={<SubmissionWorkflowPage />} />
          <Route path="/app/dashboard" element={<p>Dashboard destination</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SubmissionWorkflowPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.role = 'ADMIN'
    service.load.mockResolvedValue(workflow())
    service.save.mockResolvedValue({ submission_route: 'AFFIDAVIT' })
    service.acknowledge.mockResolvedValue({})
    service.submit.mockResolvedValue({})
  })

  it('shows a layout skeleton then renders metadata-ordered sections and saved responses', async () => {
    let resolve!: (value: SubmissionWorkflow) => void
    service.load.mockReturnValue(new Promise((done) => (resolve = done)))
    renderPage()
    expect(screen.getByRole('status', { name: 'Loading submission' })).toBeInTheDocument()
    resolve(workflow())
    expect(await screen.findByRole('heading', { name: 'First section' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Submission sections' })).toHaveTextContent(
      'First sectionSecond section',
    )
    expect(screen.getByRole('radio', { name: 'No' })).toBeChecked()
  })

  it('autosaves discrete answers and applies conditional visibility', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: 'First section' })).toBeInTheDocument()
    expect(screen.queryByLabelText(/Conditional details/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: 'Yes' }))
    expect(screen.getByLabelText(/Conditional details/)).toBeInTheDocument()
    await waitFor(() => expect(service.save).toHaveBeenCalledWith('submission-a', 'boolean', true))
    expect(await screen.findByText('Saved')).toBeInTheDocument()
  })

  it('shows an unobtrusive autosave error', async () => {
    service.save.mockRejectedValue(new Error('raw'))
    renderPage()
    await userEvent.click(await screen.findByRole('radio', { name: 'Yes' }))
    expect(await screen.findByText('Save failed')).toBeInTheDocument()
    expect(screen.getByText('An answer could not be saved')).toBeInTheDocument()
  })

  it('renders a useful read-only view for viewers and submitted records', async () => {
    state.role = 'VIEWER'
    service.load.mockResolvedValue(
      workflow({ status: 'SUBMITTED', submitDate: '2026-09-10T08:00:00Z' }),
    )
    renderPage()
    expect(await screen.findByText(/This submission is read-only/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Review submission' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Submit B-BBEE information' }),
    ).not.toBeInTheDocument()
  })

  it('renders certificate metadata and final confirmation on review', async () => {
    service.load.mockResolvedValue(
      workflow({
        route: 'CERTIFICATE',
        declaration: null,
        document: {
          id: 'document-a',
          status: 'ACTIVE',
          currentVersion: {
            id: 'version-a',
            originalFilename: 'certificate.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 100,
            storagePath: 'tenant/a',
            uploadDate: '2026-09-10T08:00:00Z',
          },
        },
      }),
    )
    renderPage()
    await screen.findByRole('heading', { name: 'First section' })
    await userEvent.click(screen.getByRole('button', { name: /Review$/ }))
    expect(screen.getByText('certificate.pdf')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Submit B-BBEE information' }))
    expect(screen.getByRole('dialog', { name: 'Submit B-BBEE information' })).toBeInTheDocument()
    expect(screen.getByText(/become read-only/)).toBeInTheDocument()
  })
})
