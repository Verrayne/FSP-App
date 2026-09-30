import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'

import { Alert, Badge, Button, Card, Skeleton } from '../../../components/ui'
import { useAuth } from '../../auth/hooks/useAuth'
import { useOptionalTenant } from '../../tenant/hooks/useTenant'
import { acceptTenantInvitation, getTenantInvitationContext } from '../services/settingsService'
import { tenantRoleLabels } from '../types'

export function TenantInvitationPage() {
  const { token = '' } = useParams()
  const auth = useAuth()
  const tenant = useOptionalTenant()
  const location = useLocation()
  const navigate = useNavigate()
  const invitation = useQuery({
    queryKey: ['tenant-invitation', token],
    queryFn: () => getTenantInvitationContext(token),
    enabled: Boolean(token),
    retry: false,
  })
  const accept = useMutation({
    mutationFn: () => acceptTenantInvitation(token),
    onSuccess: async () => {
      await tenant?.refresh()
      void navigate('/admin', { replace: true })
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
  return (
    <Card className="p-6">
      <p className="text-brand-700 text-xs font-semibold tracking-wide uppercase">
        Insurer invitation
      </p>
      <h1 className="mt-2 text-2xl font-semibold">Join {invitation.data.tenantName}</h1>
      <div className="mt-5 rounded-md bg-slate-50 p-4">
        <p className="text-xs text-slate-500">Assigned role</p>
        <Badge className="mt-1" variant="info">
          {tenantRoleLabels[invitation.data.role]}
        </Badge>
        <p className="mt-3 text-xs text-slate-500">
          Expires {new Date(invitation.data.expiryDate).toLocaleString('en-ZA')}
        </p>
      </div>
      {accept.isError && (
        <div className="mt-4">
          <Alert title="Unable to accept invitation" variant="danger">
            Sign in with the verified email address that received this invitation.
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
