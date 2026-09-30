import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, Building2, CheckCircle2, Clock3, Search, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Skeleton,
} from '../../../components/ui'
import { buttonVariants } from '../../../components/ui/buttonVariants'
import { cn } from '../../../lib/utils/cn'
import { useFsp } from '../hooks/useFsp'
import {
  getFspForOnboarding,
  onboardingQueryKeys,
  requestFspLink,
  searchFsps,
  validateFspSearch,
} from '../services/onboardingService'

function formatDate(value: string | null) {
  if (!value) return 'Not provided'
  return new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium' }).format(new Date(value))
}

function statusVariant(claimable: boolean) {
  return claimable ? ('success' as const) : ('danger' as const)
}

export function OnboardingLandingPage() {
  const { onboarding } = useFsp()
  const rejected = onboarding?.state === 'REJECTED'
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        eyebrow="FSP onboarding"
        title={rejected ? 'Your access request was not approved' : 'Link your FSP'}
        description="Connect your account to the Financial Services Provider you are authorised to represent. Selecting an FSP starts a verification request; it does not grant access immediately."
      />
      {rejected && (
        <Alert
          title={`Request for FSP ${onboarding.fspNumber ?? ''} was rejected`}
          variant="danger"
        >
          <p>{onboarding.rejectionReason || 'No user-facing reason was provided.'}</p>
          <p className="mt-2">You may correct the selection and submit a new request.</p>
        </Alert>
      )}
      <Card className="p-6 sm:p-8">
        <Building2 className="text-brand-700 size-9" aria-hidden="true" />
        <h2 className="mt-4 text-lg font-semibold">Find the organisation you represent</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Search the regulated FSP registry by FSP number or organisation name, then confirm the
          record before requesting access.
        </p>
        <Link className={cn(buttonVariants(), 'mt-6')} to="/app/onboarding/find-fsp">
          Find my FSP
        </Link>
      </Card>
    </div>
  )
}

export function FindFspPage() {
  const [input, setInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(0)
  const validationError = input ? validateFspSearch(input) : null

  useEffect(() => {
    const normalizedError = validateFspSearch(input)
    if (!input.trim() || normalizedError) return
    const timer = window.setTimeout(() => {
      setSearchTerm(input.trim().replace(/\s+/g, ' '))
    }, 350)
    return () => window.clearTimeout(timer)
  }, [input])

  const effectiveSearchTerm = validateFspSearch(input) ? '' : searchTerm

  const resultsQuery = useQuery({
    queryKey: onboardingQueryKeys.search(effectiveSearchTerm, page),
    queryFn: () => searchFsps(effectiveSearchTerm, page),
    enabled: Boolean(effectiveSearchTerm),
  })
  const results = resultsQuery.data ?? []
  const total = results[0]?.totalCount ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="FSP onboarding"
        title="Find your FSP"
        description="Search by FSP number, registered enterprise name or trade name."
      />
      <Card className="p-5 sm:p-6">
        <label htmlFor="fsp-search" className="text-sm font-medium text-slate-800">
          FSP number or name
        </label>
        <div className="relative mt-2">
          <Search className="absolute top-2.5 left-3 size-4 text-slate-400" aria-hidden="true" />
          <Input
            id="fsp-search"
            className="pl-9"
            placeholder="Enter FSP number or name"
            value={input}
            onChange={(event) => {
              setInput(event.target.value)
              setPage(0)
            }}
            aria-describedby="fsp-search-help"
          />
        </div>
        <p id="fsp-search-help" className="mt-2 text-xs text-slate-500">
          Enter at least 2 characters. Results update after a short pause.
        </p>
        {validationError && input.length > 0 && (
          <p role="status" className="mt-2 text-xs text-amber-800">
            {validationError}
          </p>
        )}
      </Card>

      {resultsQuery.isFetching && (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <span className="sr-only" role="status">
            Searching FSPs…
          </span>
        </div>
      )}
      {resultsQuery.isError && (
        <Alert title="Search is temporarily unavailable" variant="danger">
          Please try again. No access request has been created.
        </Alert>
      )}
      {!resultsQuery.isFetching &&
        effectiveSearchTerm &&
        !resultsQuery.isError &&
        results.length === 0 && (
          <EmptyState
            title="No matching FSP found"
            description="Check the FSP number or organisation name and try another search. Registry records cannot be created from onboarding."
          />
        )}
      {!resultsQuery.isFetching && results.length > 0 && (
        <section aria-label="FSP search results" className="space-y-3">
          <p className="text-sm text-slate-600" role="status">
            Showing {page * 10 + 1}–{Math.min(page * 10 + results.length, total)} of {total} matches
          </p>
          {results.map((fsp) => (
            <Card key={fsp.id} className="p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-950">{fsp.registeredName}</p>
                    <Badge variant={statusVariant(fsp.claimable)}>
                      {fsp.status || 'Status unavailable'}
                    </Badge>
                  </div>
                  {fsp.tradeName && (
                    <p className="mt-1 text-sm text-slate-600">Trading as {fsp.tradeName}</p>
                  )}
                  <p className="mt-2 text-sm font-medium text-slate-700">FSP {fsp.fspNumber}</p>
                  {fsp.statusEffectiveDate && (
                    <p className="mt-1 text-xs text-slate-500">
                      Status effective {formatDate(fsp.statusEffectiveDate)}
                    </p>
                  )}
                  {!fsp.claimable && (
                    <p className="mt-2 text-sm text-red-700">
                      This registry status is not eligible for onboarding.
                    </p>
                  )}
                </div>
                {fsp.claimable ? (
                  <Link
                    className={buttonVariants({ variant: 'secondary' })}
                    to={`/app/onboarding/fsp/${fsp.id}`}
                    aria-label={`Select FSP ${fsp.fspNumber}, ${fsp.registeredName}`}
                  >
                    Select
                  </Link>
                ) : (
                  <Button disabled aria-label={`FSP ${fsp.fspNumber} is not eligible`}>
                    Unavailable
                  </Button>
                )}
              </div>
            </Card>
          ))}
          {total > 10 && (
            <div className="flex justify-between pt-2">
              <Button
                variant="secondary"
                disabled={page === 0}
                onClick={() => setPage((value) => value - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                disabled={(page + 1) * 10 >= total}
                onClick={() => setPage((value) => value + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

export function ReviewFspPage() {
  const { fspId = '' } = useParams()
  const navigate = useNavigate()
  const { refresh } = useFsp()
  const detailQuery = useQuery({
    queryKey: onboardingQueryKeys.detail(fspId),
    queryFn: () => getFspForOnboarding(fspId),
    enabled: Boolean(fspId),
  })
  const requestMutation = useMutation({
    mutationFn: () => requestFspLink(fspId),
    onSuccess: async (result) => {
      await refresh()
      void navigate(result.outcome === 'ACTIVE_MEMBERSHIP' ? '/app' : '/app/onboarding/pending', {
        replace: true,
      })
    },
  })

  if (detailQuery.isPending) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }
  if (detailQuery.isError || !detailQuery.data) {
    return (
      <Alert title="FSP details are unavailable" variant="danger">
        Return to search and try again.
      </Alert>
    )
  }
  const fsp = detailQuery.data
  const rows = [
    ['FSP number', fsp.fspNumber],
    ['Registered name', fsp.registeredName],
    ['Trade name', fsp.tradeName],
    ['Registration number', fsp.registrationNumber],
    ['FSP type', fsp.fspType?.replaceAll('_', ' ')],
    ['Regulatory status', fsp.status],
    ['Status effective', formatDate(fsp.statusEffectiveDate)],
  ]

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"
        to="/app/onboarding/find-fsp"
      >
        <ArrowLeft className="size-4" /> Back to search
      </Link>
      <PageHeader
        eyebrow="Confirm your selection"
        title="Is this the correct FSP?"
        description="Review the registry information before requesting access. These details cannot be edited here."
      />
      <Card className="overflow-hidden">
        <div className="border-b bg-slate-50 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">{fsp.registeredName}</h2>
            <Badge variant={statusVariant(fsp.claimable)}>{fsp.status || 'Unknown'}</Badge>
          </div>
        </div>
        <dl className="divide-y">
          {rows.map(([label, value]) => (
            <div key={label} className="grid gap-1 px-5 py-3 sm:grid-cols-[12rem_1fr]">
              <dt className="text-sm text-slate-500">{label}</dt>
              <dd className="text-sm font-medium text-slate-900">{value || 'Not provided'}</dd>
            </div>
          ))}
          <div className="grid gap-1 px-5 py-3 sm:grid-cols-[12rem_1fr]">
            <dt className="text-sm text-slate-500">Primary address</dt>
            <dd className="text-sm font-medium text-slate-900">
              {fsp.address
                ? [
                    fsp.address.line1,
                    fsp.address.line2,
                    fsp.address.suburb,
                    fsp.address.city,
                    fsp.address.province,
                    fsp.address.postalCode,
                    fsp.address.countryCode,
                  ]
                    .filter(Boolean)
                    .join(', ')
                : 'Not provided'}
            </dd>
          </div>
        </dl>
      </Card>
      {!fsp.claimable && (
        <Alert title="This FSP cannot be linked" variant="danger">
          Its current registry status is not eligible for onboarding.
        </Alert>
      )}
      {requestMutation.isError && (
        <Alert title="Request could not be submitted" variant="danger">
          {requestMutation.error.message}
        </Alert>
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link className={buttonVariants({ variant: 'secondary' })} to="/app/onboarding/find-fsp">
          Back to search
        </Link>
        <Button
          disabled={!fsp.claimable || requestMutation.isPending}
          onClick={() => requestMutation.mutate()}
        >
          {requestMutation.isPending ? 'Submitting…' : 'Confirm and request access'}
        </Button>
      </div>
    </div>
  )
}

export function PendingOnboardingPage() {
  const { onboarding, refresh } = useFsp()
  const navigate = useNavigate()

  useEffect(() => {
    if (onboarding?.state === 'ACTIVE') void navigate('/app', { replace: true })
  }, [navigate, onboarding?.state])

  if (onboarding?.state !== 'LINK_PENDING') return <OnboardingLandingPage />
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <div className="bg-brand-100 mx-auto grid size-14 place-items-center rounded-full">
          <Clock3 className="text-brand-800 size-7" />
        </div>
        <p className="text-brand-700 mt-5 text-xs font-semibold tracking-wide uppercase">
          FSP onboarding
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Your request is awaiting approval
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
          Access remains restricted until an authorised reviewer verifies your relationship with
          this FSP.
        </p>
      </div>
      <Card className="p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="text-brand-700 mt-0.5 size-5" />
          <div>
            <h2 className="font-semibold">{onboarding.fspName}</h2>
            <p className="mt-1 text-sm text-slate-600">FSP {onboarding.fspNumber}</p>
          </div>
        </div>
        <dl className="mt-5 grid gap-4 border-t pt-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">Status</dt>
            <dd className="mt-1">
              <Badge variant="warning">Pending verification</Badge>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">
              Requested
            </dt>
            <dd className="mt-1 text-sm font-medium">{formatDate(onboarding.requestDate)}</dd>
          </div>
        </dl>
      </Card>
      <div className="flex justify-center">
        <Button variant="secondary" onClick={() => void refresh()}>
          <CheckCircle2 className="size-4" /> Check approval status
        </Button>
      </div>
    </div>
  )
}
