import { CalendarDays, CheckCircle2, Clock3, FileText, ShieldCheck } from 'lucide-react'

import { Badge, Card, EmptyState, PageHeader, Table } from '../../components/ui'

export function FspDashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="FSP workspace"
        title="Dashboard"
        description="Your annual compliance activity at a glance."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Reporting period', value: 'Not configured', icon: CalendarDays },
          { label: 'Submission status', value: 'Not started', icon: FileText },
          { label: 'Profile status', value: 'Pending', icon: CheckCircle2 },
          { label: 'Access', value: 'Foundation mode', icon: ShieldCheck },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">{label}</p>
              <Icon className="size-4 text-slate-400" />
            </div>
            <p className="mt-3 text-base font-semibold">{value}</p>
          </Card>
        ))}
      </div>
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <Clock3 className="text-brand-700 size-4" />
          <h2 className="font-semibold">Next steps</h2>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Submission periods and business workflows will appear here once configured in later
          prompts.
        </p>
      </Card>
    </div>
  )
}

const fspPages = {
  profile: ['FSP Profile', 'Organisation details and regulatory identifiers will be managed here.'],
  users: ['Users', 'Authorised team members and membership access will be managed here.'],
  submissions: [
    'Submission History',
    'Completed and in-progress annual submissions will appear here.',
  ],
  submission: [
    'Submission Detail',
    'The selected annual submission and its supporting documents will appear here.',
  ],
  settings: ['Settings', 'Workspace preferences will be configured here.'],
  new: ['B-BBEE Submission', 'The guided annual submission workflow will begin here.'],
} as const

export function FspPlaceholderPage({ page }: { page: keyof typeof fspPages }) {
  const [title, description] = fspPages[page]
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="FSP workspace" title={title} description={description} />
      <EmptyState
        title="No information yet"
        description="This route and shell are ready. Its business workflow is intentionally deferred to a later prompt."
      />
    </div>
  )
}

export function SubmissionListPreview() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="FSP workspace"
        title="Submission History"
        description="Annual submissions associated with this FSP."
      />
      <Table>
        <thead>
          <tr className="border-b bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
            <th className="px-4 py-3">Period</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Updated</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={3} className="px-4 py-10 text-center text-sm text-slate-500">
              No submission records are available.
            </td>
          </tr>
        </tbody>
      </Table>
      <Badge variant="neutral">Schema deferred to Prompt 02</Badge>
    </div>
  )
}
