import { apiRequest } from '../../../lib/api/client'
import { getSupabaseBrowserClient } from '../../../lib/supabase/client'
import { hashInvitationToken } from '../../users/services/usersService'
import type { PeriodValues } from '../schemas'
import type {
  ManageableTenantRole,
  QuestionnaireVersionOption,
  TenantFspRelationship,
  TenantFspSearchResult,
  TenantInvitation,
  TenantInvitationContext,
  TenantMember,
  TenantOrganisation,
  TenantNotificationSettings,
  TenantSettingsPeriod,
} from '../types'

export const settingsQueryKeys = {
  root: (tenantId: string) => ['tenant-settings', tenantId] as const,
  organisation: (tenantId: string) =>
    [...settingsQueryKeys.root(tenantId), 'organisation'] as const,
  notifications: (tenantId: string) =>
    [...settingsQueryKeys.root(tenantId), 'notifications'] as const,
  members: (tenantId: string) => [...settingsQueryKeys.root(tenantId), 'members'] as const,
  invitations: (tenantId: string) => [...settingsQueryKeys.root(tenantId), 'invitations'] as const,
  periods: (tenantId: string) => [...settingsQueryKeys.root(tenantId), 'periods'] as const,
  questionnaires: (tenantId: string) =>
    [...settingsQueryKeys.root(tenantId), 'questionnaires'] as const,
  relationships: (tenantId: string, search: string, page: number) =>
    [...settingsQueryKeys.root(tenantId), 'relationships', search, page] as const,
  registry: (tenantId: string, search: string) =>
    [...settingsQueryKeys.root(tenantId), 'registry', search] as const,
}

async function accessToken() {
  const { data } = await getSupabaseBrowserClient().auth.getSession()
  if (!data.session?.access_token) throw new Error('Authentication is required.')
  return data.session.access_token
}

export async function getTenantOrganisation(tenantId: string): Promise<TenantOrganisation> {
  const { data, error } = await getSupabaseBrowserClient().rpc('get_tenant_settings', {
    target_tenant_id: tenantId,
  })
  const row = data?.[0]
  if (error || !row) throw new Error('Organisation settings could not be loaded.')
  return {
    tenantId: row.tenant_id,
    code: row.tenant_code,
    name: row.tenant_name,
    status: row.tenant_status,
    active: row.tenant_active,
    updateDate: row.update_date,
  }
}

export async function updateTenantOrganisation(tenantId: string, name: string) {
  const { error } = await getSupabaseBrowserClient().rpc('update_tenant_organisation', {
    target_tenant_id: tenantId,
    target_name: name,
  })
  if (error) throw error
}

export async function getTenantNotificationSettings(
  tenantId: string,
): Promise<TenantNotificationSettings> {
  const { data, error } = await getSupabaseBrowserClient().rpc('get_tenant_notification_settings', {
    target_tenant_id: tenantId,
  })
  const row = data?.[0]
  if (error || !row) throw new Error('Tenant notification settings could not be loaded.')
  return {
    notifyAdminReviewRequired: row.notify_admin_review_required,
    notifyAdminAiEvents: row.notify_admin_ai_events,
    reminderOffsets: row.reminder_offsets,
    reminderSendHour: row.reminder_send_hour,
    timezone: row.timezone,
  }
}

export async function updateTenantNotificationSettings(
  tenantId: string,
  settings: Pick<
    TenantNotificationSettings,
    'notifyAdminReviewRequired' | 'notifyAdminAiEvents' | 'reminderOffsets'
  >,
) {
  const { error } = await getSupabaseBrowserClient().rpc('update_tenant_notification_settings', {
    target_tenant_id: tenantId,
    target_notify_admin_review_required: settings.notifyAdminReviewRequired,
    target_notify_admin_ai_events: settings.notifyAdminAiEvents,
    target_reminder_offsets: settings.reminderOffsets,
  })
  if (error) throw new Error('Tenant notification settings could not be saved.')
}

export async function getTenantMembers(tenantId: string): Promise<TenantMember[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc('list_tenant_members', {
    target_tenant_id: tenantId,
  })
  if (error) throw error
  return data.map((row) => ({
    membershipId: row.membership_id,
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    role: row.role as TenantMember['role'],
    status: row.status,
    createDate: row.create_date,
    updateDate: row.update_date,
  }))
}

export async function getTenantInvitations(tenantId: string): Promise<TenantInvitation[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc('list_tenant_invitations', {
    target_tenant_id: tenantId,
  })
  if (error) throw error
  return data.map((row) => ({
    invitationId: row.invitation_id,
    email: row.email,
    role: row.role as ManageableTenantRole,
    status: row.status as TenantInvitation['status'],
    inviteDate: row.invite_date,
    expiryDate: row.expiry_date,
    deliveryStatus: row.delivery_status as TenantInvitation['deliveryStatus'],
    deliveryDate: row.delivery_date,
  }))
}

export async function inviteTenantUser(
  tenantId: string,
  email: string,
  role: ManageableTenantRole,
) {
  return apiRequest<{ invitation: unknown; previewUrl?: string }>('/api/tenant-users/invitations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${await accessToken()}` },
    body: JSON.stringify({ tenantId, email, role }),
  })
}

export async function resendTenantInvitation(invitationId: string) {
  return apiRequest<{ invitation: unknown; previewUrl?: string }>(
    `/api/tenant-users/invitations/${invitationId}/resend`,
    { method: 'POST', headers: { Authorization: `Bearer ${await accessToken()}` } },
  )
}

export async function revokeTenantInvitation(invitationId: string) {
  const { error } = await getSupabaseBrowserClient().rpc('revoke_tenant_invitation', {
    target_invitation_id: invitationId,
  })
  if (error) throw error
}

export async function changeTenantMemberRole(membershipId: string, role: ManageableTenantRole) {
  const { error } = await getSupabaseBrowserClient().rpc('change_tenant_member_role', {
    target_membership_id: membershipId,
    target_role: role,
  })
  if (error) throw error
}

export async function revokeTenantMember(membershipId: string) {
  const { error } = await getSupabaseBrowserClient().rpc('revoke_tenant_member', {
    target_membership_id: membershipId,
  })
  if (error) throw error
}

export async function getQuestionnaireVersions(
  tenantId: string,
): Promise<QuestionnaireVersionOption[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc(
    'list_manageable_questionnaire_versions',
    { target_tenant_id: tenantId },
  )
  if (error) throw error
  return data.map((row) => ({
    id: row.questionnaire_version_id,
    name: row.questionnaire_name,
    version: row.version_number,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
  }))
}

export async function getSettingsPeriods(tenantId: string): Promise<TenantSettingsPeriod[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc('list_tenant_settings_periods_v2', {
    target_tenant_id: tenantId,
  })
  if (error) throw error
  return data.map((row) => ({
    id: row.period_id,
    name: row.period_name,
    year: row.period_year,
    storedStatus: row.stored_status as TenantSettingsPeriod['storedStatus'],
    displayStatus: row.display_status as TenantSettingsPeriod['displayStatus'],
    openDate: row.open_date,
    closeDate: row.close_date,
    questionnaireVersionId: row.questionnaire_version_id,
    questionnaireName: row.questionnaire_name,
    questionnaireVersion: row.questionnaire_version,
    reviewMode: row.review_mode as TenantSettingsPeriod['reviewMode'],
    aiReviewAvailable: row.ai_review_available,
    submissionCount: Number(row.submission_count),
  }))
}

function periodArgs(values: PeriodValues) {
  return {
    target_name: values.name,
    target_year: values.year,
    target_open_date: values.openDate,
    target_close_date: values.closeDate,
    target_questionnaire_version_id: values.questionnaireVersionId,
    target_review_mode: values.reviewMode,
    target_status: values.status,
  }
}

export async function createPeriod(tenantId: string, values: PeriodValues) {
  const { error } = await getSupabaseBrowserClient().rpc('create_tenant_submission_period_v2', {
    target_tenant_id: tenantId,
    ...periodArgs(values),
  })
  if (error) throw error
}

export async function updatePeriod(periodId: string, values: PeriodValues) {
  const { error } = await getSupabaseBrowserClient().rpc('update_tenant_submission_period_v2', {
    target_period_id: periodId,
    ...periodArgs(values),
  })
  if (error) throw error
}

export async function deletePeriod(periodId: string) {
  const { error } = await getSupabaseBrowserClient().rpc('delete_tenant_submission_period', {
    target_period_id: periodId,
  })
  if (error) throw error
}

export async function getTenantFspRelationships(tenantId: string, search: string, page: number) {
  const { data, error } = await getSupabaseBrowserClient().rpc('list_tenant_fsp_relationships', {
    target_tenant_id: tenantId,
    search_query: search,
    page_number: page,
    page_size: 25,
  })
  if (error) throw error
  return {
    items: data.map((row): TenantFspRelationship => ({
      tenantFspId: row.tenant_fsp_id,
      fspId: row.fsp_id,
      fspNumber: row.fsp_number,
      registeredName: row.registered_name,
      tradeName: row.trade_name,
      regulatoryStatus: row.regulatory_status,
      brokerReference: row.broker_reference,
      relationshipStatus: row.relationship_status as TenantFspRelationship['relationshipStatus'],
      linkDate: row.link_date,
      delinkDate: row.delink_date,
      submissionCount: Number(row.submission_count),
    })),
    total: Number(data[0]?.total_count ?? 0),
  }
}

export async function searchFspRegistry(
  tenantId: string,
  search: string,
): Promise<TenantFspSearchResult[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc('search_fsps_for_tenant_link', {
    target_tenant_id: tenantId,
    search_query: search,
    result_limit: 10,
  })
  if (error) throw error
  return data.map((row) => ({
    fspId: row.fsp_id,
    fspNumber: row.fsp_number,
    registeredName: row.registered_name,
    tradeName: row.trade_name,
    regulatoryStatus: row.regulatory_status,
    relationshipId: row.relationship_id,
    relationshipStatus: row.relationship_status,
  }))
}

export async function linkTenantFsp(tenantId: string, fspId: string, brokerReference: string) {
  const { error } = await getSupabaseBrowserClient().rpc('link_tenant_fsp', {
    target_tenant_id: tenantId,
    target_fsp_id: fspId,
    target_broker_reference: brokerReference || undefined,
  })
  if (error) throw error
}

export async function updateTenantFspRelationship(tenantFspId: string, brokerReference: string) {
  const { error } = await getSupabaseBrowserClient().rpc('update_tenant_fsp_relationship', {
    target_tenant_fsp_id: tenantFspId,
    target_broker_reference: brokerReference || undefined,
  })
  if (error) throw error
}

export async function delinkTenantFsp(tenantFspId: string) {
  const { error } = await getSupabaseBrowserClient().rpc('delink_tenant_fsp', {
    target_tenant_fsp_id: tenantFspId,
  })
  if (error) throw error
}

export async function getTenantInvitationContext(
  token: string,
): Promise<TenantInvitationContext | null> {
  const { data, error } = await getSupabaseBrowserClient().rpc('get_tenant_invitation_context', {
    target_token_hash: await hashInvitationToken(token),
  })
  if (error) throw error
  const row = data?.[0]
  return row
    ? {
        tenantName: row.tenant_name,
        role: row.role as ManageableTenantRole,
        expiryDate: row.expiry_date,
      }
    : null
}

export async function acceptTenantInvitation(token: string) {
  const { data, error } = await getSupabaseBrowserClient().rpc('accept_tenant_invitation', {
    target_token_hash: await hashInvitationToken(token),
  })
  if (error || !data?.[0]) throw error ?? new Error('Invitation unavailable.')
  return data[0]
}
