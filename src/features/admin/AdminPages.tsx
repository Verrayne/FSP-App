import { Building2, FileCheck2, Users } from 'lucide-react'

import { Card, EmptyState, PageHeader } from '../../components/ui'

export function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Dashboard"
        description="Tenant-level FSP and submission oversight."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { title: 'FSPs', icon: Building2 },
          { title: 'Submissions', icon: FileCheck2 },
          { title: 'Users', icon: Users },
        ].map(({ title, icon: Icon }) => (
          <Card key={title} className="p-5">
            <Icon className="text-brand-700 size-5" />
            <p className="mt-4 text-sm text-slate-500">{title}</p>
            <p className="mt-1 text-2xl font-semibold">—</p>
            <p className="mt-1 text-xs text-slate-400">Awaiting data model</p>
          </Card>
        ))}
      </div>
    </div>
  )
}

const adminPages = {
  fsps: ['FSPs', 'Manage financial services providers associated with this tenant.'],
  submissions: ['Submissions', 'Review annual submissions across associated FSPs.'],
  users: ['Users', 'Manage controlled administrative access.'],
  settings: ['Settings', 'Configure tenant and reporting preferences.'],
} as const

export function AdminPlaceholderPage({ page }: { page: keyof typeof adminPages }) {
  const [title, description] = adminPages[page]
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Administration" title={title} description={description} />
      <EmptyState
        title="No information yet"
        description="Authorization and data workflows are intentionally deferred. This page cannot grant or infer access."
      />
    </div>
  )
}
