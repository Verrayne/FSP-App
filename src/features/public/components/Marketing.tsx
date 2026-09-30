import { CheckCircle2, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { Card } from '../../../components/ui'
import { buttonVariants } from '../../../components/ui/buttonVariants'
import { cn } from '../../../lib/utils/cn'

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = 'left',
}: {
  eyebrow?: string
  title: string
  description?: string
  align?: 'left' | 'center'
}) {
  return (
    <div className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center')}>
      {eyebrow && (
        <p className="text-brand-700 text-xs font-semibold tracking-[0.14em] uppercase">
          {eyebrow}
        </p>
      )}
      <h2 className="text-navy-950 mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
        {title}
      </h2>
      {description && <p className="mt-3 text-base leading-7 text-slate-600">{description}</p>}
    </div>
  )
}

export function PageHero({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string
  title: string
  description: string
}) {
  return (
    <section className="bg-navy-50 border-b">
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-16">
        <div className="max-w-3xl">
          {eyebrow && (
            <p className="text-brand-700 text-xs font-semibold tracking-[0.14em] uppercase">
              {eyebrow}
            </p>
          )}
          <h1 className="text-navy-950 mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">{description}</p>
        </div>
      </div>
    </section>
  )
}

export function FeatureCard({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon
  title: string
  children: ReactNode
}) {
  return (
    <Card className="h-full p-5">
      <div className="bg-brand-50 text-brand-700 grid size-9 place-items-center rounded-md">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <h3 className="text-navy-950 mt-4 font-semibold">{title}</h3>
      <div className="mt-2 text-sm leading-6 text-slate-600">{children}</div>
    </Card>
  )
}

export function ProcessStep({
  number,
  title,
  children,
}: {
  number: number
  title: string
  children: ReactNode
}) {
  return (
    <div className="relative border-l border-slate-200 pb-8 pl-10 last:border-transparent last:pb-0">
      <span className="border-brand-200 bg-brand-50 text-brand-800 absolute top-0 -left-4 grid size-8 place-items-center rounded-full border text-xs font-bold">
        {number}
      </span>
      <h3 className="text-navy-950 font-semibold">{title}</h3>
      <div className="mt-1 text-sm leading-6 text-slate-600">{children}</div>
    </div>
  )
}

export function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-6 text-slate-700">
          <CheckCircle2 className="text-brand-600 mt-1 size-4 shrink-0" aria-hidden="true" />
          {item}
        </li>
      ))}
    </ul>
  )
}

export function CallToAction({ title, description }: { title: string; description: string }) {
  return (
    <section className="bg-navy-950 text-white">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 py-12 lg:flex-row lg:items-center lg:px-8">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{description}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <Link
            to="/auth/register"
            className={cn(buttonVariants({ size: 'lg' }), 'bg-brand-500 hover:bg-brand-600')}
          >
            Create Account
          </Link>
          <Link
            to="/auth/login"
            className={cn(
              buttonVariants({ size: 'lg', variant: 'secondary' }),
              'border-white/20 bg-transparent text-white hover:bg-white/10',
            )}
          >
            Log In
          </Link>
        </div>
      </div>
    </section>
  )
}
