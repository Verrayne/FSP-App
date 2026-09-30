import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PlatformAppRedirectGuard } from './PlatformAccessGuard'

const serviceMock = vi.hoisted(() => ({
  hasPlatformAccess: vi.fn(),
}))

vi.mock('./registryService', () => ({
  hasPlatformAccess: serviceMock.hasPlatformAccess,
}))

function renderGuard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/app']}>
        <Routes>
          <Route
            path="/app"
            element={
              <PlatformAppRedirectGuard>
                <p>FSP entry</p>
              </PlatformAppRedirectGuard>
            }
          />
          <Route path="/platform/dashboard" element={<p>Platform dashboard</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PlatformAppRedirectGuard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('routes a platform administrator directly to the platform dashboard', async () => {
    serviceMock.hasPlatformAccess.mockResolvedValue(true)
    renderGuard()
    expect(await screen.findByText('Platform dashboard')).toBeInTheDocument()
    expect(screen.queryByText('FSP entry')).not.toBeInTheDocument()
  })

  it('allows non-platform users to continue to the FSP entry flow', async () => {
    serviceMock.hasPlatformAccess.mockResolvedValue(false)
    renderGuard()
    expect(await screen.findByText('FSP entry')).toBeInTheDocument()
  })
})
