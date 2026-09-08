import { Link, useRouteError } from 'react-router-dom'

import { buttonVariants } from '../../components/ui/buttonVariants'
import { cn } from '../../lib/utils/cn'

function ErrorPage({
  code,
  title,
  description,
}: {
  code: string
  title: string
  description: string
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <div className="max-w-md text-center">
        <p className="text-brand-700 text-sm font-bold">{code}</p>
        <h1 className="mt-2 text-2xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
        <Link to="/" className={cn(buttonVariants(), 'mt-6')}>
          Return home
        </Link>
      </div>
    </main>
  )
}

export function NotFoundPage() {
  return (
    <ErrorPage
      code="404"
      title="Page not found"
      description="The page may have moved or the address may be incorrect."
    />
  )
}
export function ForbiddenPage() {
  return (
    <ErrorPage
      code="403"
      title="Access denied"
      description="You do not have permission to access this area."
    />
  )
}
export function UnauthorizedPage() {
  return (
    <ErrorPage
      code="401"
      title="Sign in required"
      description="Please sign in with an authorised account to continue."
    />
  )
}
export function RouteErrorPage() {
  const error = useRouteError()
  if (import.meta.env.DEV) console.error('Router error', error)
  return (
    <ErrorPage
      code="Error"
      title="Unable to load this page"
      description="The request could not be completed. Please try again."
    />
  )
}
