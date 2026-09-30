import { Link } from 'react-router-dom'

import { Brand } from '../../../components/shared/Brand'

const groups = [
  {
    title: 'Product',
    links: [
      { label: 'Home', to: '/' },
      { label: 'How It Works', to: '/how-it-works' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', to: '/privacy' },
      { label: 'Terms', to: '/terms' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Log In', to: '/auth/login' },
      { label: 'Register', to: '/auth/register' },
    ],
  },
]

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.2fr_2fr]">
          <div>
            <Brand />
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-600">
              A secure B-BBEE compliance submission platform for South African Financial Services
              Providers and insurer networks.
            </p>
            <p className="mt-3 text-xs text-slate-500">
              Product operator details: [To be confirmed before launch]
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {groups.map((group) => (
              <nav key={group.title} aria-label={`${group.title} links`}>
                <h2 className="text-xs font-semibold tracking-wider text-slate-900 uppercase">
                  {group.title}
                </h2>
                <ul className="mt-4 space-y-3">
                  {group.links.map((link) => (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        className="hover:text-navy-900 text-sm text-slate-600 hover:underline"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>
        <div className="mt-10 flex flex-col justify-between gap-2 border-t pt-6 text-xs text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} FSP Compliance. All rights reserved.</p>
          <p>Designed for the South African financial-services environment.</p>
        </div>
      </div>
    </footer>
  )
}
