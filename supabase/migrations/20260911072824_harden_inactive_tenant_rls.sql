-- Tenant membership is only an authorization path while the insurer itself is active.
-- The separate FSP-user path is intentionally preserved for dual-sided submission access.

drop policy if exists tenants_select_authorized on public.tenants;
create policy tenants_select_authorized on public.tenants for select to authenticated using (
  (tenants.active and tenants.status = 'ACTIVE' and exists (
    select 1 from public.tenant_memberships tm
    where tm.tenant_id=tenants.id and tm.user_id=(select auth.uid()) and tm.status='ACTIVE'
  ))
  or exists (
    select 1 from public.tenant_fsps tf join public.fsp_users fu on fu.fsp_id=tf.fsp_id
    where tf.tenant_id=tenants.id and tf.status='ACTIVE' and fu.user_id=(select auth.uid()) and fu.status='ACTIVE'
  )
);

drop policy if exists tenant_fsps_select_authorized on public.tenant_fsps;
create policy tenant_fsps_select_authorized on public.tenant_fsps for select to authenticated using (
  exists (
    select 1 from public.tenant_memberships tm join public.tenants t on t.id=tm.tenant_id
    where tm.tenant_id=tenant_fsps.tenant_id and tm.user_id=(select auth.uid()) and tm.status='ACTIVE'
      and t.active and t.status='ACTIVE'
  )
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
    join public.tenant_memberships tm on tm.tenant_id=tf.tenant_id
    join public.tenants t on t.id=tm.tenant_id
    where tf.fsp_id=fsps.id and tf.status='ACTIVE' and tm.user_id=(select auth.uid())
      and tm.status='ACTIVE' and t.active and t.status='ACTIVE'
  )
);

drop policy if exists submission_periods_select_authorized on public.submission_periods;
create policy submission_periods_select_authorized on public.submission_periods for select to authenticated using (
  exists (
    select 1 from public.tenant_memberships tm join public.tenants t on t.id=tm.tenant_id
    where tm.tenant_id=submission_periods.tenant_id and tm.user_id=(select auth.uid())
      and tm.status='ACTIVE' and t.active and t.status='ACTIVE'
  )
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
    join public.tenant_memberships tm on tm.tenant_id=sp.tenant_id
    join public.tenants t on t.id=tm.tenant_id
    where sp.id=submissions.submission_period_id and tm.user_id=(select auth.uid())
      and tm.status='ACTIVE' and t.active and t.status='ACTIVE'
  )
);

drop policy if exists audit_events_select_authorized on public.audit_events;
create policy audit_events_select_authorized on public.audit_events for select to authenticated using (
  actor_user_id=(select auth.uid())
  or exists (
    select 1 from public.tenant_memberships tm join public.tenants t on t.id=tm.tenant_id
    where tm.tenant_id=audit_events.tenant_id and tm.user_id=(select auth.uid())
      and tm.status='ACTIVE' and t.active and t.status='ACTIVE'
  )
  or exists (
    select 1 from public.fsp_users fu
    where fu.fsp_id=audit_events.fsp_id and fu.user_id=(select auth.uid()) and fu.status='ACTIVE'
  )
  or exists (select 1 from public.submissions s where s.id=audit_events.submission_id)
);

-- Public gateway callers do not need direct access to implementation helpers.
revoke execute on function private.has_active_tenant_access(uuid,uuid) from authenticated;

comment on policy submissions_select_authorized on public.submissions is
  'Dual authorization: active FSP membership, or active membership of an active tenant that owns the submission period.';
