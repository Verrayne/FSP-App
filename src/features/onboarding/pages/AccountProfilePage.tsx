import { Link } from 'react-router-dom'

import { Card, PageHeader } from '../../../components/ui'
import { buttonVariants } from '../../../components/ui/buttonVariants'
import { useAuth } from '../../auth/hooks/useAuth'
import { useFsp } from '../hooks/useFsp'

export function AccountProfilePage() {
  const { profile, user } = useAuth()
  const { onboarding } = useFsp()
  const backTo = onboarding?.state === 'ACTIVE' ? '/app/dashboard' : '/app'
  const rows = [
    ['First name', profile?.first_name],
    ['Last name', profile?.last_name],
    ['Email address', user?.email],
    ['Contact number', profile?.contact_number],
    ['Job title', profile?.job_title],
  ]

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Your profile"
        description="Your personal account details remain available while FSP access is being reviewed."
      />
      <Card>
        <dl className="divide-y">
          {rows.map(([label, value]) => (
            <div key={label} className="grid gap-1 px-5 py-4 sm:grid-cols-[10rem_1fr]">
              <dt className="text-sm text-slate-500">{label}</dt>
              <dd className="text-sm font-medium">{value || 'Not provided'}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <Link className={buttonVariants({ variant: 'secondary' })} to={backTo}>
        Back
      </Link>
    </div>
  )
}
