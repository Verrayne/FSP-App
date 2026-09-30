import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { SettingsAccess } from './components/SettingsAccess'
import { organisationSchema, periodSchema, tenantInvitationSchema } from './schemas'
import { settingsQueryKeys } from './services/settingsService'

const tenant = vi.hoisted<{
  currentTenant: { tenantId: string; role: 'ADMIN' | 'REVIEWER' }
}>(() => ({ currentTenant: { tenantId: 'tenant-a', role: 'ADMIN' } }))

vi.mock('../tenant/hooks/useTenant', () => ({ useTenant: () => tenant }))

function renderAccess() {
  return render(
    <MemoryRouter initialEntries={['/admin/settings/organisation']}>
      <Routes>
        <Route path="/admin/settings" element={<SettingsAccess />}>
          <Route path="organisation" element={<p>Organisation settings</p>} />
        </Route>
        <Route path="/admin/dashboard" element={<p>Insurer dashboard</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('tenant settings', () => {
  it('allows tenant administrators into settings', () => {
    tenant.currentTenant = { tenantId: 'tenant-a', role: 'ADMIN' }
    renderAccess()
    expect(screen.getByText('Organisation settings')).toBeInTheDocument()
  })

  it('redirects reviewers away from settings', () => {
    tenant.currentTenant = { tenantId: 'tenant-a', role: 'REVIEWER' }
    renderAccess()
    expect(screen.getByText('Insurer dashboard')).toBeInTheDocument()
  })

  it('limits invitations to the tenant-managed roles', () => {
    expect(
      tenantInvitationSchema.safeParse({ email: 'reviewer@example.test', role: 'REVIEWER' })
        .success,
    ).toBe(true)
    expect(
      tenantInvitationSchema.safeParse({ email: 'admin@example.test', role: 'ADMIN' }).success,
    ).toBe(true)
    expect(
      tenantInvitationSchema.safeParse({ email: 'support@example.test', role: 'SUPPORT' }).success,
    ).toBe(false)
  })

  it('requires strict period dates and a published-version identifier', () => {
    const valid = {
      name: '2027 Annual',
      year: 2027,
      openDate: '2027-01-01',
      closeDate: '2027-03-31',
      questionnaireVersionId: '11222222-2222-4222-8222-222222222222',
      status: 'DRAFT',
      reviewMode: 'HUMAN_REVIEW',
    }
    expect(periodSchema.safeParse(valid).success).toBe(true)
    expect(periodSchema.safeParse({ ...valid, closeDate: valid.openDate }).success).toBe(false)
    expect(periodSchema.safeParse({ ...valid, questionnaireVersionId: 'draft' }).success).toBe(
      false,
    )
  })

  it('validates organisation names and scopes cache keys by tenant', () => {
    expect(organisationSchema.safeParse({ name: 'Cape Horizon Assurance' }).success).toBe(true)
    expect(organisationSchema.safeParse({ name: ' ' }).success).toBe(false)
    expect(settingsQueryKeys.members('tenant-a')).not.toEqual(settingsQueryKeys.members('tenant-b'))
  })
})
