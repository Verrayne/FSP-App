import { FileCheck2, Files } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card } from '../../../components/ui'
import { buttonVariants } from '../../../components/ui/buttonVariants'
import { PageHero, ProcessStep, SectionHeader } from '../components/Marketing'
import { PageMeta } from '../components/PageMeta'

const steps = [
  [
    'Create your account',
    'Register using your business email address and complete email verification when authentication is enabled.',
  ],
  [
    'Find your FSP',
    'Identify the registered Financial Services Provider you represent. Selecting an FSP does not automatically grant access.',
  ],
  [
    'Request access',
    'Access must be authorised before you can manage information or submit on behalf of an FSP.',
  ],
  [
    'Review your FSP information',
    'Once authorised, review the organisation information held by the platform and identify anything requiring attention.',
  ],
  [
    'Complete the B-BBEE submission',
    'Follow the route applicable to the organisation and submission period.',
  ],
  [
    'Review and submit',
    'Check the information and documents carefully before final submission to the insurer.',
  ],
  [
    'Keep a record',
    'Previous submissions remain available according to applicable retention and access rules.',
  ],
] as const

export function HowItWorksPage() {
  return (
    <>
      <PageMeta
        title="How FSP B-BBEE Submissions Work"
        description="Understand the planned account, FSP access, B-BBEE document and annual submission process."
      />
      <PageHero
        eyebrow="How it works"
        title="A controlled process from registration to submission"
        description="The platform is designed to help authorised FSP users complete annual B-BBEE requests accurately while keeping access and submission responsibilities clear."
      />
      <section className="py-16">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[.7fr_1.3fr] lg:px-8">
          <div>
            <SectionHeader
              title="Seven clear steps"
              description="Actual requirements may differ by insurer, applicable B-BBEE framework and reporting period."
            />
            <p className="mt-4 text-xs leading-5 text-slate-500">
              This overview is not legal advice and does not determine affidavit eligibility.
            </p>
          </div>
          <div>
            {steps.map(([title, description], index) => (
              <ProcessStep key={title} number={index + 1} title={title}>
                {description}
                {index === 4 && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Card className="p-4">
                      <FileCheck2 className="size-5 text-blue-700" aria-hidden="true" />
                      <p className="mt-2 font-semibold text-slate-900">Certificate or document</p>
                      <p className="mt-1 text-xs leading-5">
                        Upload an existing valid verification document where required.
                      </p>
                    </Card>
                    <Card className="p-4">
                      <Files className="text-brand-700 size-5" aria-hidden="true" />
                      <p className="mt-2 font-semibold text-slate-900">Affidavit or declaration</p>
                      <p className="mt-1 text-xs leading-5">
                        Complete the declaration online where the organisation qualifies and this
                        route is permitted.
                      </p>
                    </Card>
                  </div>
                )}
              </ProcessStep>
            ))}
          </div>
        </div>
      </section>
      <section className="border-t bg-slate-50">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-5 px-6 py-12 sm:flex-row sm:items-center lg:px-8">
          <div>
            <h2 className="text-navy-950 text-xl font-semibold">Start when you are ready</h2>
            <p className="mt-2 text-sm text-slate-600">
              Create an account or return to your existing workspace.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/auth/register" className={buttonVariants()}>
              Get Started
            </Link>
            <Link to="/auth/login" className={buttonVariants({ variant: 'secondary' })}>
              Already registered? Log In
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
