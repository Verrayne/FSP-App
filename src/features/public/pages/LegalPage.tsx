import type { ReactNode } from 'react'

import { PageHero } from '../components/Marketing'
import { PageMeta } from '../components/PageMeta'

export interface LegalSection {
  title: string
  content: ReactNode
}

export function LegalPage({
  title,
  description,
  metaDescription,
  sections,
}: {
  title: string
  description: string
  metaDescription: string
  sections: LegalSection[]
}) {
  return (
    <>
      <PageMeta title={title} description={metaDescription} />
      <PageHero eyebrow="Legal" title={title} description={description} />
      <section className="py-14">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[14rem_minmax(0,48rem)] lg:px-8">
          <nav aria-label={`${title} contents`} className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              On this page
            </p>
            <ul className="mt-3 space-y-2">
              {sections.map((section) => (
                <li key={section.title}>
                  <a
                    href={`#${section.title.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`}
                    className="hover:text-brand-800 text-sm text-slate-600 hover:underline"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <article className="divide-y divide-slate-200">
            {sections.map((section) => (
              <section
                key={section.title}
                id={section.title.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}
                className="scroll-mt-24 py-7 first:pt-0"
              >
                <h2 className="text-navy-950 text-lg font-semibold">{section.title}</h2>
                <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600">
                  {section.content}
                </div>
              </section>
            ))}
          </article>
        </div>
      </section>
    </>
  )
}
