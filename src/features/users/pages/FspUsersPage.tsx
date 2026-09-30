import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MoreHorizontal, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import {
  Alert,
  Badge,
  Button,
  Card,
  Dialog,
  Dropdown,
  EmptyState,
  Input,
  Select,
  Skeleton,
  Table,
} from '../../../components/ui'
import { useAuth } from '../../auth/hooks/useAuth'
import { useFsp } from '../../onboarding/hooks/useFsp'
import { hasFspPermission } from '../../permissions/fspPermissions'
import {
  changeFspMemberRole,
  getFspInvitations,
  getFspMembers,
  inviteFspUser,
  resendFspInvitation,
  revokeFspInvitation,
  revokeFspMember,
} from '../services/usersService'
import type { FspMember, FspUserRole } from '../types'

const roleLabels: Record<FspUserRole, string> = {
  ADMIN: 'Administrator',
  SUBMITTER: 'Submitter',
  VIEWER: 'Viewer',
}
const roleDescriptions: Record<FspUserRole, string> = {
  ADMIN: 'Manage users and all FSP submissions.',
  SUBMITTER: 'Prepare and submit B-BBEE information.',
  VIEWER: 'View workspace information without making changes.',
}

function friendlyOperationError(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  if (message.toLowerCase().includes('final active administrator'))
    return 'Every FSP must retain at least one active administrator.'
  return 'The change could not be completed. Refresh and try again.'
}

export function FspUsersPage() {
  const { currentFsp } = useFsp()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<FspUserRole | ''>('')
  const [editing, setEditing] = useState<FspMember | null>(null)
  const [revoking, setRevoking] = useState<FspMember | null>(null)
  const [notice, setNotice] = useState<string>()
  const [operationError, setOperationError] = useState<string>()
  const canManage = hasFspPermission(currentFsp, 'users:manage')
  const fspId = currentFsp?.fspId ?? ''
  const key = ['fsp-users', fspId]
  const members = useQuery({
    queryKey: [...key, 'members'],
    queryFn: () => getFspMembers(fspId),
    enabled: Boolean(fspId),
  })
  const invitations = useQuery({
    queryKey: [...key, 'invitations'],
    queryFn: () => getFspInvitations(fspId),
    enabled: Boolean(fspId && canManage),
  })
  const activeAdmins =
    members.data?.filter((member) => member.status === 'ACTIVE' && member.role === 'ADMIN')
      .length ?? 0
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (members.data ?? []).filter(
      (member) =>
        !term ||
        `${member.firstName} ${member.lastName} ${member.email} ${roleLabels[member.role]}`
          .toLowerCase()
          .includes(term),
    )
  }, [members.data, search])

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: key })
  }
  const invite = useMutation({
    mutationFn: () => inviteFspUser(fspId, email, role as FspUserRole),
    onSuccess: async (result) => {
      setInviteOpen(false)
      setEmail('')
      setRole('')
      setOperationError(undefined)
      setNotice(
        result.previewUrl
          ? 'Invitation captured locally. Use the preview link below to test acceptance.'
          : 'Invitation sent.',
      )
      if (result.previewUrl) setNotice(`Invitation captured locally: ${result.previewUrl}`)
      await refresh()
    },
    onError: (error) =>
      setOperationError(error instanceof Error ? error.message : friendlyOperationError(error)),
  })
  const action = useMutation({
    mutationFn: async (task: () => Promise<unknown>) => task(),
    onSuccess: async () => {
      setEditing(null)
      setRevoking(null)
      setOperationError(undefined)
      setNotice('User access updated.')
      await refresh()
    },
    onError: (error) => setOperationError(friendlyOperationError(error)),
  })

  if (members.isPending)
    return (
      <div className="space-y-4">
        <Skeleton className="h-16" />
        <Skeleton className="h-72" />
      </div>
    )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            FSP {currentFsp?.fspNumber}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            View everyone with access to this FSP workspace and the role assigned to them.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setInviteOpen(true)}>
            <Plus className="size-4" />
            Invite user
          </Button>
        )}
      </div>
      {notice && (
        <Alert title="Update complete">
          {notice.startsWith('Invitation captured locally: ') ? (
            <a
              className="font-semibold underline"
              href={notice.replace('Invitation captured locally: ', '')}
            >
              Open captured invitation
            </a>
          ) : (
            notice
          )}
        </Alert>
      )}
      {operationError && (
        <Alert title="Unable to update access" variant="danger">
          {operationError}
        </Alert>
      )}
      {members.isError && (
        <Alert title="Unable to load users" variant="danger">
          Refresh the page and try again.
        </Alert>
      )}
      <Card className="p-4">
        <label htmlFor="user-search" className="sr-only">
          Search users
        </label>
        <div className="relative max-w-md">
          <Search className="absolute top-2.5 left-3 size-4 text-slate-400" />
          <Input
            id="user-search"
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email or role"
          />
        </div>
      </Card>
      {filtered.length === 0 ? (
        <EmptyState
          title="No users found"
          description={
            search ? 'Try a different search.' : 'No active users are connected to this FSP.'
          }
        />
      ) : (
        <Table>
          <thead>
            <tr className="border-b text-xs tracking-wide text-slate-500 uppercase">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="hidden px-4 py-3 sm:table-cell">Status</th>
              {canManage && (
                <th className="w-14 px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((member) => {
              const isFinalAdmin = member.role === 'ADMIN' && activeAdmins <= 1
              return (
                <tr key={member.membershipId} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {member.firstName} {member.lastName}{' '}
                      {member.userId === user?.id && <Badge className="ml-1">You</Badge>}
                    </div>
                    <div className="text-xs text-slate-500">{member.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={member.role === 'ADMIN' ? 'info' : 'neutral'}>
                      {roleLabels[member.role]}
                    </Badge>
                    <p className="mt-1 hidden text-xs text-slate-500 lg:block">
                      {roleDescriptions[member.role]}
                    </p>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <Badge variant="success">Active</Badge>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <Dropdown
                        labelText={`Actions for ${member.firstName} ${member.lastName}`}
                        label={
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        }
                      >
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          disabled={isFinalAdmin}
                          title={isFinalAdmin ? 'Assign another administrator first.' : undefined}
                          onClick={() => {
                            setEditing(member)
                            setRole(member.role)
                          }}
                        >
                          Change role
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-red-700"
                          disabled={isFinalAdmin}
                          title={isFinalAdmin ? 'Assign another administrator first.' : undefined}
                          onClick={() => setRevoking(member)}
                        >
                          Revoke access
                        </Button>
                      </Dropdown>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </Table>
      )}
      {canManage && (
        <section className="space-y-3">
          <h2 className="font-semibold">Invitations</h2>
          {invitations.isPending ? (
            <Skeleton className="h-28" />
          ) : (invitations.data?.filter((item) => item.status === 'PENDING').length ?? 0) === 0 ? (
            <EmptyState
              title="No pending invitations"
              description="Pending invitations will appear here for seven days."
            />
          ) : (
            <div className="grid gap-3">
              {invitations.data
                ?.filter((item) => item.status === 'PENDING')
                .map((item) => (
                  <Card
                    key={item.invitationId}
                    className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
                  >
                    <div>
                      <p className="font-medium">{item.email}</p>
                      <p className="text-xs text-slate-500">
                        {roleLabels[item.role]} · expires{' '}
                        {new Date(item.expiryDate).toLocaleDateString('en-ZA')} ·{' '}
                        {item.deliveryStatus.toLowerCase()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          void resendFspInvitation(item.invitationId)
                            .then(refresh)
                            .catch((error) => setOperationError(friendlyOperationError(error)))
                        }
                      >
                        Resend
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-700"
                        onClick={() =>
                          void revokeFspInvitation(item.invitationId)
                            .then(refresh)
                            .catch((error) => setOperationError(friendlyOperationError(error)))
                        }
                      >
                        Revoke
                      </Button>
                    </div>
                  </Card>
                ))}
            </div>
          )}
        </section>
      )}

      <Dialog open={inviteOpen} title="Invite a user" onClose={() => setInviteOpen(false)}>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (email && role) invite.mutate()
          }}
        >
          <div>
            <label htmlFor="invite-email" className="text-sm font-medium">
              Email address
            </label>
            <Input
              id="invite-email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="invite-role" className="text-sm font-medium">
              Role
            </label>
            <Select
              id="invite-role"
              required
              value={role}
              onChange={(event) => setRole(event.target.value as FspUserRole)}
            >
              <option value="">Select a role</option>
              {Object.entries(roleLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            {role && <p className="mt-1 text-xs text-slate-500">{roleDescriptions[role]}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!email || !role || invite.isPending}>
              {invite.isPending ? 'Sending…' : 'Send invitation'}
            </Button>
          </div>
        </form>
      </Dialog>
      <Dialog open={Boolean(editing)} title="Change user role" onClose={() => setEditing(null)}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Choose the access level for {editing?.firstName} {editing?.lastName}.
          </p>
          <Select value={role} onChange={(event) => setRole(event.target.value as FspUserRole)}>
            {Object.entries(roleLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              disabled={!editing || !role || action.isPending}
              onClick={() =>
                editing &&
                role &&
                action.mutate(() => changeFspMemberRole(editing.membershipId, role))
              }
            >
              Save role
            </Button>
          </div>
        </div>
      </Dialog>
      <Dialog open={Boolean(revoking)} title="Revoke user access" onClose={() => setRevoking(null)}>
        <div className="space-y-4">
          <Alert title="This user will lose access" variant="danger">
            Their account is not deleted. An administrator can invite them again later.
          </Alert>
          <p className="text-sm">
            Revoke access for{' '}
            <strong>
              {revoking?.firstName} {revoking?.lastName}
            </strong>
            ?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRevoking(null)}>
              Cancel
            </Button>
            <Button
              disabled={!revoking || action.isPending}
              onClick={() =>
                revoking && action.mutate(() => revokeFspMember(revoking.membershipId))
              }
            >
              Revoke access
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
