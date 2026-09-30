import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'

import { Alert, Badge, Button, Card, Skeleton } from '../../../components/ui'
import { useAuth } from '../../auth/hooks/useAuth'
import { useOptionalFsp } from '../../onboarding/hooks/useFsp'
import { acceptFspInvitation, getInvitationContext } from '../services/usersService'

export function InvitationPage() {
  const { token = '' } = useParams()
  const auth = useAuth()
  const fsp = useOptionalFsp()
  const location = useLocation()
  const navigate = useNavigate()
  const invitation = useQuery({
    queryKey: ['fsp-invitation', token],
    queryFn: () => getInvitationContext(token),
    enabled: Boolean(token),
    retry: false,
  })
  const accept = useMutation({
    mutationFn: () => acceptFspInvitation(token),
    onSuccess: async () => {
      await fsp?.refresh()
      void navigate('/app', { replace: true })
    },
  })

  if (invitation.isPending) return <Skeleton className="h-72" />
  if (invitation.isError || !invitation.data)
    return (
      <>
        <h1 className="text-xl font-semibold">Invitation unavailable</h1>
        <p className="mt-2 text-sm text-slate-600">
          This invitation is invalid, expired, revoked, or has already been accepted.
        </p>
        <Link
          className="text-brand-700 mt-6 inline-block text-sm font-semibold hover:underline"
          to="/auth/login"
        >
          Sign in
        </Link>
      </>
    )
  const context = invitation.data
  return (
    <Card className="p-6">
      <p className="text-brand-700 text-xs font-semibold tracking-wide uppercase">FSP invitation</p>
      <h1 className="mt-2 text-2xl font-semibold">Join {context.fspName}</h1>
      <p className="mt-2 text-sm text-slate-600">
        FSP {context.fspNumber} has invited you to its compliance workspace.
      </p>
      <div className="mt-5 rounded-md bg-slate-50 p-4">
        <p className="text-xs text-slate-500">Assigned role</p>
        <Badge className="mt-1" variant="info">
          {context.role}
        </Badge>
        <p className="mt-3 text-xs text-slate-500">
          Expires {new Date(context.expiryDate).toLocaleString('en-ZA')}
        </p>
      </div>
      {accept.isError && (
        <div className="mt-4">
          <Alert title="Unable to accept invitation" variant="danger">
            Sign in with the verified email address that received this invitation, or ask an
            administrator to resend it.
          </Alert>
        </div>
      )}
      {auth.status === 'authenticated' ? (
        <Button className="mt-5 w-full" disabled={accept.isPending} onClick={() => accept.mutate()}>
          {accept.isPending ? 'Joining workspace…' : 'Accept invitation'}
        </Button>
      ) : (
        <div className="mt-5 grid gap-3">
          <Link to="/auth/login" state={{ from: location.pathname }}>
            <Button className="w-full">Sign in to accept</Button>
          </Link>
          <Link to="/auth/register" state={{ from: location.pathname }}>
            <Button className="w-full" variant="secondary">
              Create an account
            </Button>
          </Link>
        </div>
      )}
    </Card>
  )
}
