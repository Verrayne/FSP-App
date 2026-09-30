import {
  ArrowRight,
  Building2,
  FileCheck2,
  Files,
  History,
  LockKeyhole,
  ShieldCheck,
  UserRoundCheck,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { Badge, Card } from '../../../components/ui'
import { buttonVariants } from '../../../components/ui/buttonVariants'
import { cn } from '../../../lib/utils/cn'
import { CallToAction, FeatureCard, ProcessStep, SectionHeader } from '../components/Marketing'
import { PageMeta } from '../components/PageMeta'

function ProductPreview() {
  return (
    <div
      className="relative mx-auto w-full max-w-lg"
      aria-label="Illustrative compliance dashboard preview"
    >
      <div className="absolute -inset-3 rounded-xl border border-white/10" aria-hidden="true" />
      <Card className="relative overflow-hidden border-slate-700 bg-white text-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="bg-navy-900 grid size-7 place-items-center rounded text-[10px] font-bold text-white">
              FC
            </span>
            <span className="text-xs font-semibold">Compliance workspace</span>
          </div>
          <Badge variant="neutral">Product preview</Badge>
        </div>
        <div className="p-5">
          <p className="text-brand-700 text-xs font-semibold tracking-wider uppercase">
            Annual reporting
          </p>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">2026 B-BBEE Submission</h2>
              <p className="mt-1 text-xs text-slate-500">Demo information only</p>
            </div>
            <Badge variant="warning">Action Required</Badge>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border p-3">
              <p className="text-xs text-slate-500">Deadline</p>
              <p className="mt-1 text-sm font-semibold">31 October 2026</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-slate-500">Progress</p>
              <p className="mt-1 text-sm font-semibold">1 of 4 steps</p>
            </div>
          </div>
          <div className="mt-4 rounded-md border">
            <div className="flex items-center justify-between gap-3 border-b px-3 py-3">
              <div className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded bg-slate-100">
                  <FileCheck2 className="size-4 text-slate-500" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-medium">B-BBEE Certificate</p>
                  <p className="text-xs text-slate-500">Required document</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-amber-800">Not submitted</span>
            </div>
            <div className="p-3">
              <span className={cn(buttonVariants({ size: 'sm' }), 'pointer-events-none')}>
                Start Submission
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

export function HomePage() {
  return (
    <>
      <PageMeta
        title="B-BBEE Compliance for Financial Services Providers"
        description="Submit B-BBEE information securely, manage compliance documents and maintain your FSP information through one straightforward platform."
      />
      <section className="bg-navy-950 overflow-hidden text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-24">
          <div>
            <p className="text-brand-300 text-sm font-semibold">
              For South African Financial Services Providers
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl leading-[1.12] font-semibold tracking-tight sm:text-5xl">
              Making B-BBEE compliance simpler for Financial Services Providers.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
              Submit your B-BBEE information securely, manage your compliance documents and keep
              your FSP information up to date through one straightforward platform.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/auth/register"
                className={cn(buttonVariants({ size: 'lg' }), 'bg-brand-500 hover:bg-brand-600')}
              >
                Get Started <ArrowRight className="size-4" aria-hidden="true" />
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
            <p className="mt-5 text-xs text-slate-400">
              Submission requirements depend on the applicable framework, period and insurer
              configuration.
            </p>
          </div>
          <ProductPreview />
        </div>
      </section>
      <section className="bg-white py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <SectionHeader
            eyebrow="A clearer annual process"
            title="Everything needed to manage the submission journey"
            description="Replace fragmented email exchanges with a consistent digital workflow designed for FSP teams."
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard icon={FileCheck2} title="Simple annual submissions">
              Complete the required B-BBEE process through a guided online workflow.
            </FeatureCard>
            <FeatureCard icon={Files} title="Secure document management">
              Upload and manage planned compliance documents without relying on email attachments.
            </FeatureCard>
            <FeatureCard icon={Building2} title="One FSP profile">
              Maintain organisation information and allow authorised colleagues to assist with
              submissions.
            </FeatureCard>
            <FeatureCard icon={History} title="Submission history">
              Keep a clear record of previous compliance submissions, subject to applicable
              retention rules.
            </FeatureCard>
          </div>
        </div>
      </section>
      <section className="border-y bg-slate-50 py-16 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[.8fr_1.2fr] lg:px-8">
          <SectionHeader
            eyebrow="How it works"
            title="From account creation to secure submission"
            description="A straightforward process keeps responsibilities clear while protecting access to FSP information."
          />
          <div>
            <ProcessStep number={1} title="Create your account">
              Register using your business email address.
            </ProcessStep>
            <ProcessStep number={2} title="Link your FSP">
              Find your registered Financial Services Provider and request authorised access.
            </ProcessStep>
            <ProcessStep number={3} title="Complete your B-BBEE submission">
              Upload the required certificate or complete an affidavit where applicable.
            </ProcessStep>
            <ProcessStep number={4} title="Review and submit">
              Confirm the information before submitting it securely.
            </ProcessStep>
            <Link
              to="/how-it-works"
              className={cn(buttonVariants({ variant: 'secondary' }), 'mt-8')}
            >
              See How It Works <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <SectionHeader
            eyebrow="Your submission route"
            title="Certificate or affidavit"
            description="The appropriate route depends on your organisation's circumstances and the requirements that apply to the submission period."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <Card className="p-6">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-md bg-blue-50 text-blue-800">
                  <FileCheck2 className="size-5" aria-hidden="true" />
                </span>
                <h3 className="text-lg font-semibold">B-BBEE Certificate</h3>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                For organisations required to provide an existing valid B-BBEE certificate or other
                applicable verification document.
              </p>
            </Card>
            <Card className="p-6">
              <div className="flex items-center gap-3">
                <span className="bg-brand-50 text-brand-800 grid size-10 place-items-center rounded-md">
                  <Files className="size-5" aria-hidden="true" />
                </span>
                <h3 className="text-lg font-semibold">Affidavit</h3>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Where permitted and applicable, qualifying organisations may be able to complete the
                required declaration through the platform.
              </p>
            </Card>
          </div>
          <p className="mt-5 max-w-3xl text-xs leading-5 text-slate-500">
            Eligibility depends on applicable B-BBEE legislation, sector codes, submission-period
            requirements and insurer configuration. This information is general guidance and is not
            legal advice.
          </p>
        </div>
      </section>
      <section className="bg-navy-50 border-y py-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[.8fr_1.2fr] lg:px-8">
          <div>
            <div className="text-brand-700 shadow-panel grid size-11 place-items-center rounded-md bg-white">
              <ShieldCheck className="size-6" aria-hidden="true" />
            </div>
            <h2 className="text-navy-950 mt-5 text-2xl font-semibold tracking-tight">
              Your compliance information matters.
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              The platform is designed to protect sensitive business information through controlled
              access, secure document storage and auditable submission processes.
            </p>
            <Link
              to="/privacy"
              className="text-brand-800 mt-5 inline-flex items-center gap-2 text-sm font-semibold hover:underline"
            >
              Learn more about how we handle information{' '}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: LockKeyhole,
                text: 'Secure authentication and encrypted network communication',
              },
              { icon: UserRoundCheck, text: 'Access based on authorised FSP membership' },
              { icon: Files, text: 'Private document storage with controlled access' },
              { icon: History, text: 'Auditable submission activity and clear records' },
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex gap-3 rounded-md border bg-white p-4 text-sm font-medium text-slate-700"
              >
                <Icon className="text-brand-700 mt-0.5 size-5 shrink-0" aria-hidden="true" />
                {text}
              </div>
            ))}
          </div>
        </div>
      </section>
      <CallToAction
        title="Ready to complete your B-BBEE submission?"
        description="Create your account to get started or sign in to continue an existing submission."
      />
    </>
  )
}
