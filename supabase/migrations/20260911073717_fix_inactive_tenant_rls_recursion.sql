-- Use the existing audited, security-definer predicate in RLS policies instead of
-- joining RLS-protected tenant tables from one another. This avoids policy recursion.
grant execute on function private.has_active_tenant_access(uuid,uuid) to authenticated;

drop policy if exists tenants_select_authorized on public.tenants;
create policy tenants_select_authorized on public.tenants for select to authenticated using (
  private.has_active_tenant_access(tenants.id,(select auth.uid()))
  or exists (
    select 1 from public.tenant_fsps tf join public.fsp_users fu on fu.fsp_id=tf.fsp_id
    where tf.tenant_id=tenants.id and tf.status='ACTIVE' and fu.user_id=(select auth.uid()) and fu.status='ACTIVE'
  )
);

drop policy if exists tenant_fsps_select_authorized on public.tenant_fsps;
create policy tenant_fsps_select_authorized on public.tenant_fsps for select to authenticated using (
  private.has_active_tenant_access(tenant_fsps.tenant_id,(select auth.uid()))
  or exists (
    select 1 from public.fsp_users fu
    where fu.fsp_id=tenant_fsps.fsp_id and fu.user_id=(select auth.uid()) and fu.status='ACTIVE'
  )
);

drop policy if exists fsps_select_authorized on public.fsps;
create policy fsps_select_authorized on public.fsps for select to authenticated using (
  exists (
    select 1 from public.fsp_users fu
    where fu.fsp_id=fsps.id and fu.user_id=(select auth.uid()) and fu.status='ACTIVE'
  )
  or exists (
    select 1 from public.tenant_fsps tf
    where tf.fsp_id=fsps.id and tf.status='ACTIVE'
      and private.has_active_tenant_access(tf.tenant_id,(select auth.uid()))
  )
);

drop policy if exists submission_periods_select_authorized on public.submission_periods;
create policy submission_periods_select_authorized on public.submission_periods for select to authenticated using (
  private.has_active_tenant_access(submission_periods.tenant_id,(select auth.uid()))
  or exists (
    select 1 from public.tenant_fsps tf join public.fsp_users fu on fu.fsp_id=tf.fsp_id
    where tf.tenant_id=submission_periods.tenant_id and tf.status='ACTIVE'
      and fu.user_id=(select auth.uid()) and fu.status='ACTIVE'
  )
);

drop policy if exists submissions_select_authorized on public.submissions;
create policy submissions_select_authorized on public.submissions for select to authenticated using (
  exists (
    select 1 from public.tenant_fsps tf join public.fsp_users fu on fu.fsp_id=tf.fsp_id
    where tf.id=submissions.tenant_fsp_id and fu.user_id=(select auth.uid()) and fu.status='ACTIVE'
  )
  or exists (
    select 1 from public.submission_periods sp
    where sp.id=submissions.submission_period_id
      and private.has_active_tenant_access(sp.tenant_id,(select auth.uid()))
  )
);

comment on function private.has_active_tenant_access(uuid,uuid) is
  'RLS-safe predicate for active membership of an active insurer. The private schema remains unavailable through the Data API.';
