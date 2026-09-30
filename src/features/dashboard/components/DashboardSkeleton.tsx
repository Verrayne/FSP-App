import { Card, Skeleton } from '../../../components/ui'

export function DashboardSkeleton() {
  return (
    <div
      className="space-y-4"
      role="status"
      aria-label="Loading dashboard"
      aria-busy="true"
      data-testid="dashboard-skeleton"
    >
      <span className="sr-only">Loading dashboard data…</span>
      <Card className="p-5 sm:p-6">
        <div className="space-y-6">
          <div className="w-full max-w-xl space-y-4">
            <Skeleton className="h-8 w-full max-w-md" />
            <Skeleton className="h-6 w-32" />
            <div className="grid gap-3 pt-2 sm:grid-cols-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          </div>
          <div className="flex justify-end">
            <Skeleton className="h-10 w-full sm:w-40" />
          </div>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-3 p-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-4 w-40" />
        </Card>
        <Card className="space-y-3 p-5">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-48" />
        </Card>
      </div>
    </div>
  )
}
