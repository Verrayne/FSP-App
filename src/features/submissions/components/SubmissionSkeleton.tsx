import { Card, Skeleton } from '../../../components/ui'

export function SubmissionSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading submission" className="space-y-4">
      <span className="sr-only">Loading submission…</span>
      <Card className="flex flex-col gap-4 p-5 sm:flex-row">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-8 w-full sm:ml-auto sm:w-64" />
      </Card>
      <div className="grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <Card className="space-y-3 p-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </Card>
        <Card className="space-y-5 p-5">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-9 w-28" />
        </Card>
      </div>
    </div>
  )
}
