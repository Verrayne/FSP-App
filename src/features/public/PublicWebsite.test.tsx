import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { PublicLayout } from '../../app/layouts/PublicLayout'
import {
  AboutPage,
  ContactPage,
  HomePage,
  HowItWorksPage,
  PrivacyPage,
  TermsPage,
} from './PublicPages'

const publicRoutes = [
  { path: '/', element: <HomePage /> },
  { path: '/about', element: <AboutPage /> },
  { path: '/how-it-works', element: <HowItWorksPage /> },
  { path: '/contact', element: <ContactPage /> },
  { path: '/privacy', element: <PrivacyPage /> },
  { path: '/terms', element: <TermsPage /> },
]

function renderPublicPage(path: string) {
  const testRouter = createMemoryRouter(
    [{ path: '/', element: <PublicLayout />, children: publicRoutes }],
    { initialEntries: [path] },
  )
  return {
    user: userEvent.setup(),
    router: testRouter,
    ...render(<RouterProvider router={testRouter} />),
  }
}

describe('public website', () => {
  it('renders the homepage and meaningful metadata', () => {
    renderPublicPage('/')
    expect(
      screen.getByRole('heading', { name: /Making B-BBEE compliance simpler/i }),
    ).toBeInTheDocument()
    expect(document.title).toBe('B-BBEE Compliance for Financial Services Providers')
  })

  it('links the primary CTA to registration', () => {
    renderPublicPage('/')
    expect(screen.getByRole('link', { name: /Get Started/i })).toHaveAttribute(
      'href',
      '/auth/register',
    )
  })

  it('links public login actions to the login route', () => {
    renderPublicPage('/')
    const loginLinks = screen.getAllByRole('link', { name: 'Log In' })
    expect(loginLinks.length).toBeGreaterThan(0)
    expect(loginLinks.every((link) => link.getAttribute('href') === '/auth/login')).toBe(true)
  })

  it('navigates using the public navigation', async () => {
    const { user } = renderPublicPage('/')
    await user.click(screen.getAllByRole('link', { name: 'How It Works' })[0]!)
    expect(
      await screen.findByRole('heading', { name: /controlled process from registration/i }),
    ).toBeInTheDocument()
  })

  it.each([
    ['/how-it-works', /controlled process from registration/i],
    ['/about', /clearer way to manage FSP compliance information/i],
    ['/privacy', 'Privacy Notice'],
    ['/terms', 'Terms of Use'],
  ])('renders the %s page', (path, heading) => {
    renderPublicPage(path)
    expect(screen.getByRole('heading', { name: heading, level: 1 })).toBeInTheDocument()
  })

  it('validates required contact fields without sending a message', async () => {
    const { user } = renderPublicPage('/contact')
    await user.click(screen.getByRole('button', { name: 'Validate Request' }))
    expect(await screen.findByText('Enter your name.')).toBeInTheDocument()
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
    expect(screen.getByText('Select a subject.')).toBeInTheDocument()
    expect(screen.getByText('Please provide at least 20 characters.')).toBeInTheDocument()
  })

  it('shows an explicit prototype state after valid contact details', async () => {
    const { user } = renderPublicPage('/contact')
    await user.type(screen.getByLabelText('Name'), 'Example User')
    await user.type(screen.getByLabelText('Email'), 'user@example.co.za')
    await user.selectOptions(screen.getByLabelText('Subject'), 'platform')
    await user.type(
      screen.getByLabelText('Message'),
      'I need help understanding how to use the platform.',
    )
    await user.click(screen.getByRole('button', { name: 'Validate Request' }))
    expect(await screen.findByText(/No email or support request was sent/i)).toBeInTheDocument()
  })

  it('opens and closes the accessible mobile navigation', async () => {
    const { user } = renderPublicPage('/')
    const toggle = screen.getByRole('button', { name: 'Open navigation menu' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)
    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeInTheDocument()
    const close = screen.getByRole('button', { name: 'Close navigation menu' })
    expect(close).toHaveAttribute('aria-expanded', 'true')
    await user.click(close)
    expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument()
  })
})
