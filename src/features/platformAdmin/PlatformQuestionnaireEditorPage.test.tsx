import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PlatformQuestionnaireEditorPage, PlatformReferenceDataPage } from './PlatformAdminPages'

const serviceMock = vi.hoisted(() => ({
  getQuestionnaireVersion: vi.fn(),
  listPlatformQuestions: vi.fn(),
  listPlatformValueSets: vi.fn(),
  listQuestionTypes: vi.fn(),
}))

vi.mock('./platformAdminService', () => ({
  platformQueryKeys: {
    references: () => ['platform-admin', 'references'],
    questionnaire: (id: string) => ['platform-admin', 'questionnaire', id],
    questionnaires: () => ['platform-admin', 'questionnaires'],
    dashboard: () => ['platform-admin', 'dashboard'],
  },
  getQuestionnaireVersion: serviceMock.getQuestionnaireVersion,
  listPlatformQuestions: serviceMock.listPlatformQuestions,
  addQuestionnaireQuestion: vi.fn(),
  addQuestionnaireSection: vi.fn(),
  createPlatformQuestion: vi.fn(),
  createPlatformQuestionnaire: vi.fn(),
  createPlatformTenant: vi.fn(),
  createPlatformValueSet: vi.fn(),
  createQuestionnaireVersion: vi.fn(),
  getPlatformDashboard: vi.fn(),
  listPlatformQuestionnaires: vi.fn(),
  listPlatformTenants: vi.fn(),
  listPlatformValueSets: serviceMock.listPlatformValueSets,
  listQuestionTypes: serviceMock.listQuestionTypes,
  publishQuestionnaire: vi.fn(),
  removeQuestionnaireItem: vi.fn(),
  updatePlatformTenant: vi.fn(),
}))

function renderEditor() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/platform/questionnaires/version-1']}>
        <Routes>
          <Route
            path="/platform/questionnaires/:versionId"
            element={<PlatformQuestionnaireEditorPage />}
          />
          <Route path="/platform/reference-data" element={<p>Questions page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function renderReferenceData() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PlatformReferenceDataPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PlatformQuestionnaireEditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    serviceMock.getQuestionnaireVersion.mockResolvedValue({
      questionnaireId: 'questionnaire-1',
      versionId: 'version-1',
      code: 'INTERNAL_QUESTIONNAIRE_CODE',
      name: 'Annual compliance questionnaire',
      description: null,
      tenantId: null,
      tenantName: null,
      versionNumber: 1,
      status: 'DRAFT',
      effectiveFrom: null,
      effectiveTo: null,
      sections: [
        {
          id: 'section-1',
          code: 'INTERNAL_SECTION_CODE',
          title: 'Ownership',
          description: null,
          sortOrder: 10,
          questions: [],
        },
      ],
    })
    serviceMock.listPlatformQuestions.mockResolvedValue([
      {
        id: 'question-1',
        code: 'ANNUAL_REVENUE',
        label: "What was the organisation's annual revenue?",
        helpText: null,
        typeId: 'type-1',
        typeCode: 'NUMBER',
        typeName: 'Number',
        valueSetId: null,
        valueSetName: null,
        active: true,
      },
    ])
    serviceMock.listPlatformValueSets.mockResolvedValue([])
    serviceMock.listQuestionTypes.mockResolvedValue([])
  })

  it('shows human-readable question labels and a direct path to create a missing question', async () => {
    const user = userEvent.setup()
    renderEditor()

    await user.click(await screen.findByRole('button', { name: 'Question' }))

    expect(
      screen.getByRole('option', { name: "What was the organisation's annual revenue?" }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/ANNUAL_REVENUE/)).not.toBeInTheDocument()
    expect(screen.queryByText(/INTERNAL_SECTION_CODE/)).not.toBeInTheDocument()
    expect(screen.queryByText(/INTERNAL_QUESTIONNAIRE_CODE/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create a new question' })).toHaveAttribute(
      'href',
      '/platform/reference-data',
    )
  })

  it('uses answer-set language and renders each option as a pill', async () => {
    serviceMock.listPlatformQuestions.mockResolvedValue([])
    serviceMock.listPlatformValueSets.mockResolvedValue([
      {
        id: 'answer-set-1',
        code: 'INTERNAL_ANSWER_SET',
        name: 'Annual revenue band',
        description: null,
        active: true,
        optionCount: 3,
        options: [
          { id: 'option-1', code: 'LESS_THAN_10M', label: 'Less than R10 million' },
          { id: 'option-2', code: 'BETWEEN_10M_25M', label: 'R10 million to R25 million' },
          { id: 'option-3', code: 'MORE_THAN_25M', label: 'More than R25 million' },
        ],
      },
    ])
    renderReferenceData()

    expect(await screen.findByRole('heading', { name: 'Answer sets' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add answer set' })).toBeInTheDocument()
    expect(await screen.findByText('Less than R10 million')).toHaveClass('rounded-full')
    expect(screen.getByText('R10 million to R25 million')).toHaveClass('rounded-full')
    expect(screen.getByText('More than R25 million')).toHaveClass('rounded-full')
  })
})
