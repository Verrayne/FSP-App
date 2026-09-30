import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MoreHorizontal, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'

import {
  Alert,
  Badge,
  Button,
  Card,
  Dialog,
  Dropdown,
  EmptyState,
  FormError,
  Input,
  PageHeader,
  Select,
  Skeleton,
  Table,
} from '../../../components/ui'
import { useAuth } from '../../auth/hooks/useAuth'
import { useTenant } from '../../tenant/hooks/useTenant'
import { tenantInvitationSchema, type TenantInvitationValues } from '../schemas'
import {
  changeTenantMemberRole,
  getTenantInvitations,
  getTenantMembers,
  inviteTenantUser,
  resendTenantInvitation,
  revokeTenantInvitation,
  revokeTenantMember,
  settingsQueryKeys,
} from '../services/settingsService'
import {
  tenantRoleLabels,
  type ManageableTenantRole,
  type TenantInvitation,
  type TenantMember,
} from '../types'

function operationMessage(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  if (message.includes('final active tenant administrator'))
    return 'Every insurer must retain at least one active Tenant Administrator.'
  return 'The change could not be completed. Your access may have changed.'
}

export function TenantUsersSettingsPage() {
  const { currentTenant, refresh: refreshTenant } = useTenant()
  const { user } = useAuth()
  const tenantId = currentTenant?.tenantId ?? ''
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editing, setEditing] = useState<TenantMember | null>(null)
  const [removing, setRemoving] = useState<TenantMember | null>(null)
  const [revoking, setRevoking] = useState<TenantInvitation | null>(null)
  const [role, setRole] = useState<ManageableTenantRole>('REVIEWER')
  const [notice, setNotice] = useState<string>()
  const [previewUrl, setPreviewUrl] = useState<string>()
  const members = useQuery({
    queryKey: settingsQueryKeys.members(tenantId),
    queryFn: () => getTenantMembers(tenantId),
    enabled: Boolean(tenantId),
  })
  const invitations = useQuery({
    queryKey: settingsQueryKeys.invitations(tenantId),
    queryFn: () => getTenantInvitations(tenantId),
    enabled: Boolean(tenantId),
  })
  const form = useForm<TenantInvitationValues>({
    resolver: zodResolver(tenantInvitationSchema),
    defaultValues: { email: '', role: 'REVIEWER' },
  })
  const activeAdmins =
    members.data?.filter((item) => item.status === 'ACTIVE' && item.role === 'ADMIN').length ?? 0
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (members.data ?? []).filter(
      (item) =>
        !term ||
        `${item.firstName} ${item.lastName} ${item.email} ${tenantRoleLabels[item.role]}`
          .toLowerCase()
          .includes(term),
    )
  }, [members.data, search])
  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: settingsQueryKeys.root(tenantId) })
  }
  const invite = useMutation({
    mutationFn: (values: TenantInvitationValues) =>
      inviteTenantUser(tenantId, values.email, values.role),
    onSuccess: async (result) => {
      setInviteOpen(false)
      form.reset()
      setNotice(result.previewUrl ? 'Invitation captured locally.' : 'Invitation sent.')
      setPreviewUrl(result.previewUrl)
      await refresh()
    },
  })
  const action = useMutation({
    mutationFn: (task: () => Promise<unknown>) => task(),
    onSuccess: async () => {
      setEditing(null)
      setRemoving(null)
      setRevoking(null)
      setNotice('User access updated.')
      await Promise.all([refresh(), refreshTenant()])
    },
  })

  if (members.isPending || invitations.isPending)
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-72 w-full" />
        <span className="sr-only" role="status">
          Loading tenant users…
        </span>
      </div>
    )
  return (
    <section className="space-y-5">
      <PageHeader
        title="Users"
        action={
          <Button onClick={() => setInviteOpen(true)}>
            <Plus className="size-4" />
            Invite User
          </Button>
        }
      />
      {notice && (
        <Alert title={notice}>
          {previewUrl && (
            <a className="font-semibold underline" href={previewUrl}>
              Open captured invitation
            </a>
          )}
        </Alert>
      )}
      {(members.isError || invitations.isError || invite.isError || action.isError) && (
        <Alert title="Unable to update users" variant="danger">
          {operationMessage(action.error ?? invite.error)}
        </Alert>
      )}
      <Card className="p-4">
        <label htmlFor="tenant-user-search" className="sr-only">
          Search users
        </label>
        <div className="relative max-w-md">
          <Search className="absolute top-2.5 left-3 size-4 text-slate-400" />
          <Input
            id="tenant-user-search"
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
          description={search ? 'Try a different search.' : 'No active tenant users were found.'}
        />
      ) : (
        <Table>
          <thead>
            <tr className="border-b text-xs tracking-wide text-slate-500 uppercase">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="hidden px-4 py-3 sm:table-cell">Status</th>
              <th className="w-14 px-4 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((member) => {
              const finalAdmin = member.role === 'ADMIN' && activeAdmins <= 1
              return (
                <tr key={member.membershipId} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium">
                      {member.firstName} {member.lastName}
                      {member.userId === user?.id && <Badge className="ml-2">You</Badge>}
                    </p>
                    <p className="text-xs text-slate-500">{member.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={member.role === 'ADMIN' ? 'info' : 'neutral'}>
                      {tenantRoleLabels[member.role]}
                    </Badge>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <Badge variant="success">Active</Badge>
                  </td>
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
                        className="w-full justify-start"
                        variant="ghost"
                        disabled={finalAdmin}
                        onClick={() => {
                          setEditing(member)
                          setRole(member.role === 'ADMIN' ? 'ADMIN' : 'REVIEWER')
                        }}
                      >
                        Change role
                      </Button>
                      <Button
                        className="w-full justify-start text-red-700"
                        variant="ghost"
                        disabled={finalAdmin}
                        onClick={() => setRemoving(member)}
                      >
                        Remove User
                      </Button>
                    </Dropdown>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      )}
      <section className="space-y-3">
        <h2 className="font-semibold">Pending invitations</h2>
        {(invitations.data ?? []).filter((item) => item.status === 'PENDING').length === 0 ? (
          <EmptyState
            title="No pending invitations"
            description="Invitations remain available for seven days."
          />
        ) : (
          <Table>
            <thead>
              <tr className="border-b text-xs tracking-wide text-slate-500 uppercase">
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Delivery</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invitations.data
                ?.filter((item) => item.status === 'PENDING')
                .map((item) => (
                  <tr key={item.invitationId} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      {item.email}
                      <p className="text-xs text-slate-500">
                        Expires {new Date(item.expiryDate).toLocaleDateString('en-ZA')}
                      </p>
                    </td>
                    <td className="px-4 py-3">{tenantRoleLabels[item.role]}</td>
                    <td className="px-4 py-3">
                      <Badge>{item.deliveryStatus.toLowerCase()}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={action.isPending}
                          onClick={() =>
                            action.mutate(() =>
                              resendTenantInvitation(item.invitationId).then((result) => {
                                setPreviewUrl(result.previewUrl)
                              }),
                            )
                          }
                        >
                          Resend
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-700"
                          onClick={() => setRevoking(item)}
                        >
                          Revoke
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </Table>
        )}
      </section>
      <Dialog open={inviteOpen} title="Invite User" onClose={() => setInviteOpen(false)}>
        <form
          className="space-y-4"
          onSubmit={(event) => void form.handleSubmit((values) => invite.mutate(values))(event)}
        >
          <div>
            <label htmlFor="tenant-invite-email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="tenant-invite-email"
              type="email"
              {...form.register('email')}
              aria-describedby="tenant-invite-email-error"
            />
            <FormError id="tenant-invite-email-error">
              {form.formState.errors.email?.message}
            </FormError>
          </div>
          <div>
            <label htmlFor="tenant-invite-role" className="text-sm font-medium">
              Role
            </label>
            <Select id="tenant-invite-role" {...form.register('role')}>
              <option value="REVIEWER">Compliance Reviewer</option>
              <option value="ADMIN">Tenant Administrator</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={invite.isPending}>
              {invite.isPending ? 'Inviting…' : 'Invite User'}
            </Button>
          </div>
        </form>
      </Dialog>
      <Dialog open={Boolean(editing)} title="Change user role" onClose={() => setEditing(null)}>
        <div className="space-y-4">
          <label htmlFor="tenant-member-role" className="text-sm font-medium">
            Role
          </label>
          <Select
            id="tenant-member-role"
            value={role}
            onChange={(event) => setRole(event.target.value as ManageableTenantRole)}
          >
            <option value="REVIEWER">Compliance Reviewer</option>
            <option value="ADMIN">Tenant Administrator</option>
          </Select>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              disabled={action.isPending}
              onClick={() =>
                editing && action.mutate(() => changeTenantMemberRole(editing.membershipId, role))
              }
            >
              {action.isPending ? 'Saving…' : 'Save role'}
            </Button>
          </div>
        </div>
      </Dialog>
      <Dialog open={Boolean(removing)} title="Remove User" onClose={() => setRemoving(null)}>
        <p className="text-sm text-slate-600">
          This removes access to {currentTenant?.name}. The person’s account and other workspace
          access remain intact.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRemoving(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={action.isPending}
            onClick={() =>
              removing && action.mutate(() => revokeTenantMember(removing.membershipId))
            }
          >
            {action.isPending ? 'Removing…' : 'Remove User'}
          </Button>
        </div>
      </Dialog>
      <Dialog open={Boolean(revoking)} title="Revoke Invitation" onClose={() => setRevoking(null)}>
        <p className="text-sm text-slate-600">The invitation link will stop working immediately.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRevoking(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={action.isPending}
            onClick={() =>
              revoking && action.mutate(() => revokeTenantInvitation(revoking.invitationId))
            }
          >
            {action.isPending ? 'Revoking…' : 'Revoke Invitation'}
          </Button>
        </div>
      </Dialog>
    </section>
  )
}
