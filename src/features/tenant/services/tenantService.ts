import { getSupabaseBrowserClient } from '../../../lib/supabase/client'
import type { TenantMembership } from '../types'

export const tenantQueryKeys = { memberships: () => ['tenant-memberships'] as const }

export async function getMyTenantMemberships(): Promise<TenantMembership[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc('list_my_tenant_memberships')
  if (error) throw new Error('Insurer access could not be loaded.')
  return data.map((row) => ({
    membershipId: row.membership_id,
    tenantId: row.tenant_id,
    code: row.tenant_code,
    name: row.tenant_name,
    role: row.tenant_role as TenantMembership['role'],
  }))
}
