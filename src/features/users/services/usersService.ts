import { apiRequest } from '../../../lib/api/client'
import { getSupabaseBrowserClient } from '../../../lib/supabase/client'
import type { FspInvitation, FspMember, FspUserRole, InvitationContext } from '../types'

async function requireAccessToken() {
  const { data } = await getSupabaseBrowserClient().auth.getSession()
  if (!data.session?.access_token) throw new Error('Authentication is required.')
  return data.session.access_token
}

export async function getFspMembers(fspId: string): Promise<FspMember[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc('list_fsp_members', {
    target_fsp_id: fspId,
  })
  if (error) throw error
  return (data ?? []).map((row) => ({
    membershipId: row.membership_id,
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    role: row.role as FspUserRole,
    status: row.status,
    isPrimary: row.is_primary,
    createDate: row.create_date,
    updateDate: row.update_date,
  }))
}

export async function getFspInvitations(fspId: string): Promise<FspInvitation[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc('list_fsp_invitations', {
    target_fsp_id: fspId,
  })
  if (error) throw error
  return (data ?? []).map((row) => ({
    invitationId: row.invitation_id,
    email: row.email,
    role: row.role as FspUserRole,
    status: row.status as FspInvitation['status'],
    inviteDate: row.invite_date,
    expiryDate: row.expiry_date,
    deliveryStatus: row.delivery_status as FspInvitation['deliveryStatus'],
    deliveryDate: row.delivery_date,
  }))
}

export async function inviteFspUser(fspId: string, email: string, role: FspUserRole) {
  return apiRequest<{ invitation: unknown; previewUrl?: string }>('/api/fsp-users/invitations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${await requireAccessToken()}` },
    body: JSON.stringify({ fspId, email, role }),
  })
}

export async function resendFspInvitation(invitationId: string) {
  return apiRequest<{ invitation: unknown; previewUrl?: string }>(
    `/api/fsp-users/invitations/${invitationId}/resend`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${await requireAccessToken()}` },
    },
  )
}

export async function revokeFspInvitation(invitationId: string) {
  const { error } = await getSupabaseBrowserClient().rpc('revoke_fsp_invitation', {
    target_invitation_id: invitationId,
  })
  if (error) throw error
}

export async function changeFspMemberRole(membershipId: string, role: FspUserRole) {
  const { error } = await getSupabaseBrowserClient().rpc('change_fsp_member_role', {
    target_membership_id: membershipId,
    target_role: role,
  })
  if (error) throw error
}

export async function revokeFspMember(membershipId: string) {
  const { error } = await getSupabaseBrowserClient().rpc('revoke_fsp_member', {
    target_membership_id: membershipId,
  })
  if (error) throw error
}

export async function hashInvitationToken(token: string) {
  const bytes = new TextEncoder().encode(token)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function getInvitationContext(token: string): Promise<InvitationContext | null> {
  const targetTokenHash = await hashInvitationToken(token)
  const { data, error } = await getSupabaseBrowserClient().rpc('get_fsp_invitation_context', {
    target_token_hash: targetTokenHash,
  })
  if (error) throw error
  const row = data?.[0]
  return row
    ? {
        fspName: row.fsp_name,
        fspNumber: row.fsp_number,
        role: row.role as FspUserRole,
        expiryDate: row.expiry_date,
      }
    : null
}

export async function acceptFspInvitation(token: string) {
  const targetTokenHash = await hashInvitationToken(token)
  const { data, error } = await getSupabaseBrowserClient().rpc('accept_fsp_invitation', {
    target_token_hash: targetTokenHash,
  })
  if (error) throw error
  if (!data?.[0]) throw new Error('Invitation unavailable.')
  return { fspId: data[0].fsp_id, membershipId: data[0].membership_id }
}
