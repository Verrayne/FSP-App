import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TenantProvider } from './providers/TenantProvider'
import { useTenant } from './hooks/useTenant'
import { hasTenantPermission } from './permissions'

const auth = vi.hoisted(() => ({ user: { id: 'user-1' }, status: 'authenticated' }))
const memberships = vi.hoisted(() => vi.fn())
vi.mock('../auth/hooks/useAuth', () => ({ useAuth: () => auth }))
vi.mock('./services/tenantService', () => ({
  tenantQueryKeys: { memberships: () => ['tenant-memberships'] },
  getMyTenantMemberships: memberships,
}))

function Harness() {
  const context = useTenant()
  return (
    <>
      <p>{context.currentTenant?.name ?? 'None'}</p>
      <p>{context.currentTenant?.role ?? 'No role'}</p>
      {context.memberships.map((item) => (
        <button key={item.tenantId} onClick={() => context.selectTenant(item.tenantId)}>
          {item.name}
        </button>
      ))}
    </>
  )
}
function renderProvider() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <TenantProvider>
        <Harness />
      </TenantProvider>
    </QueryClientProvider>,
  )
}

describe('TenantProvider', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.clearAllMocks()
    auth.user = { id: 'user-1' }
    auth.status = 'authenticated'
  })
  it('automatically selects a single active insurer', async () => {
    memberships.mockResolvedValue([
      { membershipId: 'm1', tenantId: 'a', code: 'A', name: 'Insurer A', role: 'ADMIN' },
    ])
    renderProvider()
    expect((await screen.findAllByText('Insurer A'))[0]).toBeInTheDocument()
  })
  it('restores only a still-authorised persisted tenant', async () => {
    window.localStorage.setItem('tenant.current.user-1', 'removed')
    memberships.mockResolvedValue([
      { membershipId: 'm1', tenantId: 'a', code: 'A', name: 'Insurer A', role: 'ADMIN' },
      { membershipId: 'm2', tenantId: 'b', code: 'B', name: 'Insurer B', role: 'REVIEWER' },
    ])
    renderProvider()
    expect((await screen.findAllByText('Insurer A'))[0]).toBeInTheDocument()
    expect(screen.queryByText('removed')).not.toBeInTheDocument()
  })
  it('switches insurer and role together and persists the validated choice', async () => {
    memberships.mockResolvedValue([
      { membershipId: 'm1', tenantId: 'a', code: 'A', name: 'Insurer A', role: 'ADMIN' },
      { membershipId: 'm2', tenantId: 'b', code: 'B', name: 'Insurer B', role: 'REVIEWER' },
    ])
    renderProvider()
    fireEvent.click(await screen.findByRole('button', { name: 'Insurer B' }))
    expect(screen.getByText('REVIEWER')).toBeInTheDocument()
    expect(window.localStorage.getItem('tenant.current.user-1')).toBe('b')
  })
  it('centralises role permissions without granting viewer review access', () => {
    expect(hasTenantPermission({ role: 'ADMIN' }, 'settings:access')).toBe(true)
    expect(hasTenantPermission({ role: 'REVIEWER' }, 'submissions:review')).toBe(true)
    expect(hasTenantPermission({ role: 'VIEWER' }, 'submissions:review')).toBe(false)
  })
  it('does not select a tenant when the membership query returns none', async () => {
    memberships.mockResolvedValue([])
    renderProvider()
    await waitFor(() => expect(screen.getByText('None')).toBeInTheDocument())
  })
})
