import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { FspMembership } from '../../onboarding/types/onboarding'
import type * as ProfileService from '../services/profileService'
import type { FspProfile } from '../types'
import { FspProfilePage } from './FspProfilePage'

const service = vi.hoisted(() => ({
  getProfile: vi.fn(),
  getAddresses: vi.fn(),
  getContacts: vi.fn(),
  updateProfile: vi.fn(),
  saveAddress: vi.fn(),
  saveContact: vi.fn(),
  removeAddress: vi.fn(),
  removeContact: vi.fn(),
}))
const fspState = vi.hoisted(() => ({ current: null as FspMembership | null }))

vi.mock('../services/profileService', async (importOriginal) => {
  const original = await importOriginal<typeof ProfileService>()
  return {
    ...original,
    getFspProfile: service.getProfile,
    getFspAddresses: service.getAddresses,
    getFspContacts: service.getContacts,
    updateFspProfile: service.updateProfile,
    saveFspAddress: service.saveAddress,
    saveFspContact: service.saveContact,
    removeFspAddress: service.removeAddress,
    removeFspContact: service.removeContact,
  }
})

vi.mock('../../onboarding/hooks/useFsp', () => ({
  useFsp: () => ({ currentFsp: fspState.current }),
}))

function membership(fspId: string, role: FspMembership['role']): FspMembership {
  return {
    membershipId: `membership-${fspId}`,
    fspId,
    fspNumber: fspId === 'fsp-a' ? '51234' : '52345',
    registeredName: fspId === 'fsp-a' ? 'Karoo Oak Financial Services' : 'Highveld Compass',
    tradeName: null,
    role,
    isPrimary: true,
  }
}

function profile(fspId: string): FspProfile {
  return {
    id: fspId,
    fspNumber: fspId === 'fsp-a' ? '51234' : '52345',
    registeredName: fspId === 'fsp-a' ? 'Karoo Oak Financial Services' : 'Highveld Compass',
    tradeName: fspId === 'fsp-a' ? 'Karoo Oak' : null,
    registrationNumber: '2020/123456/07',
    fspType: 'JURISTIC_REPRESENTATIVE',
    status: 'AUTHORISED',
    statusEffectiveDate: '2020-01-15',
    source: 'DEVELOPMENT_SEED',
    sourceLastCheckDate: null,
  }
}

function renderProfile(
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  const result = render(
    <QueryClientProvider client={client}>
      <FspProfilePage />
    </QueryClientProvider>,
  )
  return { ...result, client }
}

describe('FspProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fspState.current = membership('fsp-a', 'ADMIN')
    service.getProfile.mockImplementation((fspId: string) => Promise.resolve(profile(fspId)))
    service.getAddresses.mockResolvedValue([])
    service.getContacts.mockResolvedValue([])
    service.updateProfile.mockResolvedValue(undefined)
    service.saveAddress.mockResolvedValue(undefined)
    service.saveContact.mockResolvedValue(undefined)
  })

  it('shows a layout skeleton before rendering source-controlled data without a subtitle', () => {
    service.getProfile.mockImplementationOnce(() => new Promise(() => {}))
    renderProfile()
    expect(screen.getByTestId('profile-skeleton')).toBeInTheDocument()
    expect(screen.queryByText('Manage your FSP profile.')).not.toBeInTheDocument()
  })

  it('shows regulatory data and lets an administrator edit the allowlisted trading name', async () => {
    renderProfile()
    expect(await screen.findByText('Karoo Oak Financial Services')).toBeInTheDocument()
    expect(screen.getByText('Test data')).toBeInTheDocument()
    expect(
      screen.getByText(/Authorised registry imports preserve the source and last-check date/),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
    const input = screen.getByLabelText('Trading name')
    await userEvent.clear(input)
    await userEvent.type(input, 'Karoo Oak Advice')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() =>
      expect(service.updateProfile).toHaveBeenCalledWith('fsp-a', {
        tradeName: 'Karoo Oak Advice',
      }),
    )
  })

  it.each(['SUBMITTER', 'VIEWER'] as const)('keeps the %s profile read-only', async (role) => {
    fspState.current = membership('fsp-a', role)
    renderProfile()
    expect(await screen.findByText('Karoo Oak Financial Services')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add address' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add contact' })).not.toBeInTheDocument()
  })

  it('keeps the main profile useful when a secondary contact query fails', async () => {
    service.getContacts.mockRejectedValueOnce(new Error('private backend detail'))
    renderProfile()
    expect(await screen.findByText('Karoo Oak Financial Services')).toBeInTheDocument()
    expect(await screen.findByText('Unable to load contacts')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry contacts' })).toBeInTheDocument()
    expect(screen.queryByText('private backend detail')).not.toBeInTheDocument()
  })

  it('uses FSP-scoped caches and never renders FSP A data under FSP B', async () => {
    service.getProfile.mockImplementation((fspId: string) =>
      fspId === 'fsp-a' ? Promise.resolve(profile(fspId)) : new Promise(() => {}),
    )
    const view = renderProfile()
    expect(await screen.findByText('Karoo Oak Financial Services')).toBeInTheDocument()
    fspState.current = membership('fsp-b', 'VIEWER')
    view.rerender(
      <QueryClientProvider client={view.client}>
        <FspProfilePage />
      </QueryClientProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('profile-skeleton')).toBeInTheDocument())
    expect(screen.queryByText('Karoo Oak Financial Services')).not.toBeInTheDocument()
    expect(service.getProfile).toHaveBeenCalledWith('fsp-b')
  })
})
