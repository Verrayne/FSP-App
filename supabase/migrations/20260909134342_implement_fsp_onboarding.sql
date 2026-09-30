-- Prompt 04: constrained registry discovery and transactional FSP onboarding.
create extension if not exists pg_trgm with schema extensions;

create unique index fsp_link_requests_one_pending_per_user_fsp
  on public.fsp_link_requests (user_id, fsp_id)
  where status = 'PENDING';

create index fsp_link_requests_user_status_date_idx
  on public.fsp_link_requests (user_id, status, request_date desc);

create index fsps_fsp_number_trgm_idx
  on public.fsps using gin (
    (regexp_replace(lower(fsp_number), '\\s+', '', 'g')) extensions.gin_trgm_ops
  );

create index fsps_registered_name_trgm_idx
  on public.fsps using gin (
    (regexp_replace(lower(registered_name), '\\s+', ' ', 'g')) extensions.gin_trgm_ops
  );

create index fsps_trade_name_trgm_idx
  on public.fsps using gin (
    (regexp_replace(lower(coalesce(trade_name, '')), '\\s+', ' ', 'g')) extensions.gin_trgm_ops
  );

create or replace function private.fsp_is_claimable(
  p_active boolean,
  p_status text
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_active and upper(coalesce(btrim(p_status), '')) in ('AUTHORISED', 'AUTHORIZED', 'ACTIVE');
$$;

revoke all on function private.fsp_is_claimable(boolean, text)
from public, anon, authenticated;

create or replace function public.search_fsps_for_onboarding(
  search_query text,
  result_limit integer default 20,
  result_offset integer default 0
)
returns table (
  id uuid,
  fsp_number varchar,
  registered_name varchar,
  trade_name varchar,
  status varchar,
  status_effective_date date,
  claimable boolean,
  total_count bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_query text := lower(regexp_replace(btrim(coalesce(search_query, '')), '\\s+', ' ', 'g'));
  compact_query text;
  safe_limit integer := least(greatest(coalesce(result_limit, 20), 1), 50);
  safe_offset integer := greatest(coalesce(result_offset, 0), 0);
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if length(normalized_query) < 2 then
    raise exception 'Enter at least 2 characters' using errcode = '22023';
  end if;

  compact_query := regexp_replace(normalized_query, '\\s+', '', 'g');

  return query
  select
    f.id,
    f.fsp_number,
    f.registered_name,
    f.trade_name,
    f.status,
    f.status_effective_date,
    private.fsp_is_claimable(f.active, f.status),
    count(*) over () as total_count
  from public.fsps f
  where
    regexp_replace(lower(f.fsp_number), '\\s+', '', 'g') like '%' || compact_query || '%'
    or regexp_replace(lower(f.registered_name), '\\s+', ' ', 'g') like '%' || normalized_query || '%'
    or regexp_replace(lower(coalesce(f.trade_name, '')), '\\s+', ' ', 'g') like '%' || normalized_query || '%'
  order by
    (regexp_replace(lower(f.fsp_number), '\\s+', '', 'g') = compact_query) desc,
    (regexp_replace(lower(f.registered_name), '\\s+', ' ', 'g') = normalized_query) desc,
    f.registered_name,
    f.fsp_number
  limit safe_limit
  offset safe_offset;
end;
$$;

create or replace function public.get_fsp_for_onboarding(target_fsp_id uuid)
returns table (
  id uuid,
  fsp_number varchar,
  registered_name varchar,
  trade_name varchar,
  registration_number varchar,
  fsp_type varchar,
  status varchar,
  status_effective_date date,
  claimable boolean,
  address_line_1 varchar,
  address_line_2 varchar,
  suburb varchar,
  city varchar,
  province varchar,
  postal_code varchar,
  country_code varchar
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  return query
  select
    f.id,
    f.fsp_number,
    f.registered_name,
    f.trade_name,
    f.registration_number,
    f.fsp_type,
    f.status,
    f.status_effective_date,
    private.fsp_is_claimable(f.active, f.status),
    a.line_1,
    a.line_2,
    a.suburb,
    a.city,
    a.province,
    a.postal_code,
    a.country_code
  from public.fsps f
  left join lateral (
    select ad.line_1, ad.line_2, ad.suburb, ad.city, ad.province, ad.postal_code, ad.country_code
    from public.addresses ad
    where ad.fsp_id = f.id and ad.active
    order by ad."primary" desc, ad.create_date
    limit 1
  ) a on true
  where f.id = target_fsp_id;
end;
$$;

create or replace function public.get_my_fsp_memberships()
returns table (
  membership_id uuid,
  fsp_id uuid,
  fsp_number varchar,
  registered_name varchar,
  trade_name varchar,
  role varchar,
  is_primary boolean
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  return query
  select fu.id, f.id, f.fsp_number, f.registered_name, f.trade_name, fu.role, fu."primary"
  from public.fsp_users fu
  join public.fsps f on f.id = fu.fsp_id
  where fu.user_id = (select auth.uid())
    and fu.status = 'ACTIVE'
    and f.active
  order by fu."primary" desc, f.registered_name, f.fsp_number;
end;
$$;

create or replace function public.get_my_fsp_onboarding_state()
returns table (
  onboarding_state text,
  request_id uuid,
  fsp_id uuid,
  fsp_number varchar,
  fsp_name varchar,
  request_status varchar,
  request_date timestamptz,
  rejection_reason text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.fsp_users fu
    join public.fsps f on f.id = fu.fsp_id
    where fu.user_id = (select auth.uid()) and fu.status = 'ACTIVE' and f.active
  ) then
    return query select 'ACTIVE'::text, null::uuid, null::uuid, null::varchar,
      null::varchar, null::varchar, null::timestamptz, null::text;
    return;
  end if;

  return query
  with relevant_request as (
    select lr.*, f.fsp_number, f.registered_name
    from public.fsp_link_requests lr
    join public.fsps f on f.id = lr.fsp_id
    where lr.user_id = (select auth.uid())
      and lr.status in ('PENDING', 'REJECTED')
    order by (lr.status = 'PENDING') desc, lr.request_date desc
    limit 1
  )
  select
    case rr.status when 'PENDING' then 'LINK_PENDING' else 'REJECTED' end,
    rr.id,
    rr.fsp_id,
    rr.fsp_number,
    coalesce(rr.registered_name, ''),
    rr.status,
    rr.request_date,
    case when rr.status = 'REJECTED' then rr.rejection else null end
  from relevant_request rr;

  if not found then
    return query select 'NO_FSP'::text, null::uuid, null::uuid, null::varchar,
      null::varchar, null::varchar, null::timestamptz, null::text;
  end if;
end;
$$;

create or replace function public.request_fsp_link(target_fsp_id uuid)
returns table (
  outcome text,
  request_id uuid,
  request_status varchar,
  request_date timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  created_request public.fsp_link_requests%rowtype;
begin
  if actor_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.fsps f
    where f.id = target_fsp_id and private.fsp_is_claimable(f.active, f.status)
  ) then
    raise exception 'FSP is unavailable or ineligible' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.fsp_users fu
    where fu.fsp_id = target_fsp_id and fu.user_id = actor_id and fu.status = 'ACTIVE'
  ) then
    return query select 'ACTIVE_MEMBERSHIP'::text, null::uuid, null::varchar, null::timestamptz;
    return;
  end if;

  insert into public.fsp_link_requests (fsp_id, user_id)
  values (target_fsp_id, actor_id)
  on conflict (user_id, fsp_id) where status = 'PENDING' do nothing
  returning * into created_request;

  if created_request.id is null then
    return query
    select 'EXISTING_PENDING'::text, lr.id, lr.status, lr.request_date
    from public.fsp_link_requests lr
    where lr.user_id = actor_id and lr.fsp_id = target_fsp_id and lr.status = 'PENDING'
    order by lr.request_date desc
    limit 1;
    return;
  end if;

  insert into public.audit_events (
    fsp_id, actor_user_id, event_type, entity_type, entity_id, metadata
  ) values (
    target_fsp_id, actor_id, 'FSP_LINK_REQUESTED', 'FSP_LINK_REQUEST',
    created_request.id, jsonb_build_object('status', 'PENDING')
  );

  return query
  select 'CREATED'::text, created_request.id, created_request.status, created_request.request_date;
end;
$$;

create or replace function public.approve_fsp_link_request(target_request_id uuid)
returns table (
  request_id uuid,
  membership_id uuid,
  assigned_role varchar,
  request_status varchar
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  target_request public.fsp_link_requests%rowtype;
  initial_role varchar(20);
  primary_membership boolean;
  resulting_membership_id uuid;
begin
  if actor_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into target_request
  from public.fsp_link_requests lr
  where lr.id = target_request_id
  for update;

  if not found then
    raise exception 'Link request not found' using errcode = 'P0002';
  end if;

  if target_request.user_id = actor_id then
    raise exception 'Self-approval is not permitted' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.tenant_memberships tm
    join public.tenants t on t.id = tm.tenant_id
    join public.tenant_fsps tf on tf.tenant_id = tm.tenant_id
    where tm.user_id = actor_id
      and tm.status = 'ACTIVE'
      and tm.role in ('ADMIN', 'REVIEWER')
      and t.active and t.status = 'ACTIVE'
      and tf.fsp_id = target_request.fsp_id
      and tf.status = 'ACTIVE'
  ) then
    raise exception 'Reviewer is not authorised for this FSP' using errcode = '42501';
  end if;

  if target_request.status <> 'PENDING' then
    raise exception 'Link request is no longer pending' using errcode = '40001';
  end if;

  perform 1 from public.fsps f where f.id = target_request.fsp_id for update;

  primary_membership := not exists (
    select 1 from public.fsp_users fu
    where fu.fsp_id = target_request.fsp_id and fu.status = 'ACTIVE'
  );
  initial_role := case when primary_membership then 'ADMIN' else 'VIEWER' end;

  insert into public.fsp_users (
    fsp_id, user_id, role, status, "primary", verified_date, verified_by
  ) values (
    target_request.fsp_id, target_request.user_id, initial_role, 'ACTIVE',
    primary_membership, now(), actor_id
  )
  on conflict (fsp_id, user_id) do update
  set role = excluded.role,
      status = 'ACTIVE',
      "primary" = excluded."primary",
      verified_date = excluded.verified_date,
      verified_by = excluded.verified_by
  returning id into resulting_membership_id;

  update public.fsp_link_requests
  set status = 'APPROVED',
      verification_method = 'MANUAL_REVIEW',
      review_date = now(),
      reviewed_by = actor_id,
      rejection = null
  where id = target_request.id;

  insert into public.audit_events (
    fsp_id, actor_user_id, event_type, entity_type, entity_id, metadata
  ) values
  (
    target_request.fsp_id, actor_id, 'FSP_LINK_APPROVED', 'FSP_LINK_REQUEST',
    target_request.id, jsonb_build_object('verification_method', 'MANUAL_REVIEW')
  ),
  (
    target_request.fsp_id, actor_id, 'FSP_MEMBERSHIP_CREATED', 'FSP_USER',
    resulting_membership_id, jsonb_build_object('role', initial_role)
  );

  return query select target_request.id, resulting_membership_id, initial_role, 'APPROVED'::varchar;
end;
$$;

create or replace function public.reject_fsp_link_request(
  target_request_id uuid,
  rejection_reason text
)
returns table (
  request_id uuid,
  request_status varchar
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  target_request public.fsp_link_requests%rowtype;
  safe_reason text := btrim(coalesce(rejection_reason, ''));
begin
  if actor_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if length(safe_reason) < 3 or length(safe_reason) > 500 then
    raise exception 'A rejection reason between 3 and 500 characters is required' using errcode = '22023';
  end if;

  select * into target_request
  from public.fsp_link_requests lr
  where lr.id = target_request_id
  for update;

  if not found then
    raise exception 'Link request not found' using errcode = 'P0002';
  end if;

  if target_request.user_id = actor_id then
    raise exception 'Self-review is not permitted' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.tenant_memberships tm
    join public.tenants t on t.id = tm.tenant_id
    join public.tenant_fsps tf on tf.tenant_id = tm.tenant_id
    where tm.user_id = actor_id
      and tm.status = 'ACTIVE'
      and tm.role in ('ADMIN', 'REVIEWER')
      and t.active and t.status = 'ACTIVE'
      and tf.fsp_id = target_request.fsp_id
      and tf.status = 'ACTIVE'
  ) then
    raise exception 'Reviewer is not authorised for this FSP' using errcode = '42501';
  end if;

  if target_request.status <> 'PENDING' then
    raise exception 'Link request is no longer pending' using errcode = '40001';
  end if;

  update public.fsp_link_requests
  set status = 'REJECTED',
      verification_method = 'MANUAL_REVIEW',
      review_date = now(),
      reviewed_by = actor_id,
      rejection = safe_reason
  where id = target_request.id;

  insert into public.audit_events (
    fsp_id, actor_user_id, event_type, entity_type, entity_id, metadata
  ) values (
    target_request.fsp_id, actor_id, 'FSP_LINK_REJECTED', 'FSP_LINK_REQUEST',
    target_request.id, jsonb_build_object('verification_method', 'MANUAL_REVIEW')
  );

  return query select target_request.id, 'REJECTED'::varchar;
end;
$$;

revoke all on function public.search_fsps_for_onboarding(text, integer, integer) from public, anon;
revoke all on function public.get_fsp_for_onboarding(uuid) from public, anon;
revoke all on function public.get_my_fsp_memberships() from public, anon;
revoke all on function public.get_my_fsp_onboarding_state() from public, anon;
revoke all on function public.request_fsp_link(uuid) from public, anon;
revoke all on function public.approve_fsp_link_request(uuid) from public, anon;
revoke all on function public.reject_fsp_link_request(uuid, text) from public, anon;

grant execute on function public.search_fsps_for_onboarding(text, integer, integer) to authenticated;
grant execute on function public.get_fsp_for_onboarding(uuid) to authenticated;
grant execute on function public.get_my_fsp_memberships() to authenticated;
grant execute on function public.get_my_fsp_onboarding_state() to authenticated;
grant execute on function public.request_fsp_link(uuid) to authenticated;
grant execute on function public.approve_fsp_link_request(uuid) to authenticated;
grant execute on function public.reject_fsp_link_request(uuid, text) to authenticated;

comment on function public.search_fsps_for_onboarding(text, integer, integer) is
  'Authenticated, minimum-length, paginated FSP registry search exposing only onboarding identifiers.';
comment on function public.request_fsp_link(uuid) is
  'Creates the current user''s pending request idempotently. User, state, role and review fields are server-controlled.';
comment on function public.approve_fsp_link_request(uuid) is
  'Prototype reviewer operation. Atomically approves a pending request, creates/reactivates membership and writes audit events.';
comment on function public.reject_fsp_link_request(uuid, text) is
  'Prototype reviewer operation. Authorised mapped-tenant reviewers only; ordinary users and self-review are denied.';
