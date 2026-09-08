import { ArrowRight, CheckCircle2, LockKeyhole, Network, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card, PageHeader } from '../../components/ui'
import { buttonVariants } from '../../components/ui/buttonVariants'
import { cn } from '../../lib/utils/cn'

export function HomePage() {
  return (
    <>
      <section className="bg-navy-950 border-b text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-[1.1fr_.9fr] lg:py-28">
          <div>
            <p className="text-brand-300 text-sm font-semibold">
              B-BBEE compliance, made manageable
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
              A trusted submission workspace for insurers and their FSP partners.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
              Collect, manage and review annual compliance information with a secure platform
              designed around clear responsibilities.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/auth/register"
                className={cn(buttonVariants({ size: 'lg' }), 'bg-brand-500 hover:bg-brand-600')}
              >
                Get started <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/how-it-works"
                className={buttonVariants({ size: 'lg', variant: 'secondary' })}
              >
                How it works
              </Link>
            </div>
          </div>
          <Card className="border-white/10 bg-white/5 p-6 shadow-none">
            <p className="text-brand-300 text-xs font-semibold tracking-wider uppercase">
              Submission overview
            </p>
            <div className="mt-5 space-y-3">
              {[
                'Confirm your FSP details',
                'Provide B-BBEE information',
                'Review and submit securely',
              ].map((item, index) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-md border border-white/10 bg-white/5 p-3"
                >
                  <span className="bg-brand-500/20 text-brand-200 grid size-7 place-items-center rounded-full text-xs font-bold">
                    {index + 1}
                  </span>
                  <span className="text-sm text-slate-200">{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-2 text-xs text-slate-400">
              <LockKeyhole className="size-4" />
              Private documents and controlled access
            </div>
          </Card>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: 'Secure by design',
              text: 'Clear client and server boundaries, private storage and least-privilege access.',
            },
            {
              icon: Network,
              title: 'SaaS-ready structure',
              text: 'Tenant, FSP and user identities remain distinct as the platform grows.',
            },
            {
              icon: CheckCircle2,
              title: 'Predictable workflows',
              text: 'Compact, professional interfaces support accurate annual submissions.',
            },
          ].map(({ icon: Icon, title, text }) => (
            <Card key={title} className="p-5">
              <Icon className="text-brand-600 size-5" />
              <h2 className="mt-4 font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
            </Card>
          ))}
        </div>
      </section>
    </>
  )
}

const copy: Record<string, { title: string; description: string }> = {
  about: {
    title: 'About the platform',
    description:
      'A modern foundation for collecting and managing B-BBEE compliance information across insurer and FSP relationships.',
  },
  'how-it-works': {
    title: 'How it works',
    description:
      'FSP teams maintain their information and complete annual submissions; insurer teams manage periods and review outcomes.',
  },
  contact: {
    title: 'Contact',
    description: 'Contact and support channels will be configured before the production launch.',
  },
  privacy: {
    title: 'Privacy',
    description:
      'The production privacy notice will be published before personal or business information is collected.',
  },
  terms: {
    title: 'Terms of use',
    description: 'The production terms of use will be published before customer onboarding begins.',
  },
}

export function PublicInfoPage({ page }: { page: keyof typeof copy }) {
  const content = copy[page]
  if (!content) return null
  return (
    <section className="mx-auto min-h-[60vh] max-w-4xl px-6 py-16">
      <PageHeader title={content.title} description={content.description} />
      <Card className="mt-8 p-6">
        <p className="text-sm leading-7 text-slate-600">
          This foundation reserves the route and accessible page structure. Final legal, support and
          product content is deferred to the relevant product prompt.
        </p>
      </Card>
    </section>
  )
}
