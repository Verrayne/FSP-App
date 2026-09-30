import { Building2, ClipboardCheck, FileArchive, History, MailMinus, Users } from 'lucide-react'

import { Card } from '../../../components/ui'
import {
  CallToAction,
  CheckList,
  FeatureCard,
  PageHero,
  SectionHeader,
} from '../components/Marketing'
import { PageMeta } from '../components/PageMeta'

export function AboutPage() {
  return (
    <>
      <PageMeta
        title="About the FSP Compliance Platform"
        description="Learn why the platform provides a central, secure process for B-BBEE compliance information shared by FSPs and insurers."
      />
      <PageHero
        eyebrow="About"
        title="A clearer way to manage FSP compliance information"
        description="The platform provides a central digital process for collecting and managing B-BBEE compliance information from Financial Services Providers."
      />
      <section className="py-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <SectionHeader title="Why the platform exists" />
            <p className="mt-5 text-sm leading-7 text-slate-600">
              Annual compliance collection can involve repeated emails, disconnected attachments and
              limited visibility into what remains outstanding. This creates unnecessary
              administration for FSP teams and the insurers they work with.
            </p>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              FSP Compliance creates one structured process for organisation information, applicable
              documents and annual submissions—while keeping user identity, FSP access and insurer
              relationships distinct.
            </p>
          </div>
          <Card className="bg-navy-950 p-6 text-white">
            <MailMinus className="text-brand-300 size-6" aria-hidden="true" />
            <h2 className="mt-5 text-xl font-semibold">
              From fragmented requests to one controlled process
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              The planned workflow gives authorised participants a shared view of progress without
              treating email inboxes as a document-management system.
            </p>
          </Card>
        </div>
      </section>
      <section className="border-y bg-slate-50 py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <SectionHeader
            eyebrow="For FSP teams"
            title="Less administration, clearer responsibilities"
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard icon={ClipboardCheck} title="Guided submission">
              Follow a structured annual process and understand what remains outstanding.
            </FeatureCard>
            <FeatureCard icon={FileArchive} title="Document management">
              Keep applicable compliance documents connected to the correct submission.
            </FeatureCard>
            <FeatureCard icon={Users} title="Authorised collaboration">
              Allow multiple approved colleagues to assist without sharing account credentials.
            </FeatureCard>
          </div>
          <div className="mt-6 max-w-2xl">
            <CheckList
              items={[
                'Maintain one FSP profile',
                'Reduce repetitive email administration',
                'Return to previous submissions subject to retention rules',
              ]}
            />
          </div>
        </div>
      </section>
      <section className="py-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[.8fr_1.2fr] lg:px-8">
          <SectionHeader
            eyebrow="For insurers"
            title="High-level network oversight"
            description="Insurer functionality remains part of the planned administration portal and is not implemented in this public website."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: Building2,
                title: 'Participating FSPs',
                text: 'Manage the insurer’s associated FSP network.',
              },
              {
                icon: ClipboardCheck,
                title: 'Progress monitoring',
                text: 'See submission progress across an annual period.',
              },
              {
                icon: FileArchive,
                title: 'Structured review',
                text: 'Review submitted information and applicable documents.',
              },
              {
                icon: History,
                title: 'Audit trail',
                text: 'Maintain a record of controlled submission activity.',
              },
            ].map(({ icon: Icon, title, text }) => (
              <Card key={title} className="p-5">
                <Icon className="text-brand-700 size-5" aria-hidden="true" />
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>
      <CallToAction
        title="Use one straightforward compliance workspace"
        description="Register to begin when your insurer opens a submission period, or log in to return to your workspace."
      />
    </>
  )
}
