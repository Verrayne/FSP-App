import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { PublicLayout } from '../layouts/PublicLayout'
import { AboutPage } from '../../features/public/PublicPages'

describe('public routing', () => {
  it('renders the requested public route inside the public layout', async () => {
    const testRouter = createMemoryRouter(
      [
        {
          path: '/',
          element: <PublicLayout />,
          children: [{ path: 'about', element: <AboutPage /> }],
        },
      ],
      { initialEntries: ['/about'] },
    )

    render(<RouterProvider router={testRouter} />)
    expect(
      await screen.findByRole('heading', {
        name: 'A clearer way to manage FSP compliance information',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
  })
})
