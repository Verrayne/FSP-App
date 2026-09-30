-- Keep elevated implementations outside the exposed Data API schema. The public
-- functions are security-invoker gateways; the private implementations still
-- validate auth.uid() and every operation-specific authorization rule.
alter function public.search_fsps_for_onboarding(text, integer, integer) set schema private;
alter function public.get_fsp_for_onboarding(uuid) set schema private;
alter function public.get_my_fsp_onboarding_state() set schema private;
alter function public.request_fsp_link(uuid) set schema private;
alter function public.approve_fsp_link_request(uuid) set schema private;
alter function public.reject_fsp_link_request(uuid, text) set schema private;

grant usage on schema private to authenticated;

revoke all on function private.search_fsps_for_onboarding(text, integer, integer) from public, anon;
revoke all on function private.get_fsp_for_onboarding(uuid) from public, anon;
revoke all on function private.get_my_fsp_onboarding_state() from public, anon;
revoke all on function private.request_fsp_link(uuid) from public, anon;
revoke all on function private.approve_fsp_link_request(uuid) from public, anon;
revoke all on function private.reject_fsp_link_request(uuid, text) from public, anon;

grant execute on function private.search_fsps_for_onboarding(text, integer, integer) to authenticated;
grant execute on function private.get_fsp_for_onboarding(uuid) to authenticated;
grant execute on function private.get_my_fsp_onboarding_state() to authenticated;
grant execute on function private.request_fsp_link(uuid) to authenticated;
grant execute on function private.approve_fsp_link_request(uuid) to authenticated;
grant execute on function private.reject_fsp_link_request(uuid, text) to authenticated;

create function public.search_fsps_for_onboarding(
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
language sql
security invoker
set search_path = ''
as $$
  select * from private.search_fsps_for_onboarding(search_query, result_limit, result_offset);
$$;

create function public.get_fsp_for_onboarding(target_fsp_id uuid)
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
language sql
security invoker
set search_path = ''
as $$
  select * from private.get_fsp_for_onboarding(target_fsp_id);
$$;

create function public.get_my_fsp_onboarding_state()
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
language sql
security invoker
set search_path = ''
as $$
  select * from private.get_my_fsp_onboarding_state();
$$;

create function public.request_fsp_link(target_fsp_id uuid)
returns table (
  outcome text,
  request_id uuid,
  request_status varchar,
  request_date timestamptz
)
language sql
security invoker
set search_path = ''
as $$
  select * from private.request_fsp_link(target_fsp_id);
$$;

create function public.approve_fsp_link_request(target_request_id uuid)
returns table (
  request_id uuid,
  membership_id uuid,
  assigned_role varchar,
  request_status varchar
)
language sql
security invoker
set search_path = ''
as $$
  select * from private.approve_fsp_link_request(target_request_id);
$$;

create function public.reject_fsp_link_request(
  target_request_id uuid,
  rejection_reason text
)
returns table (
  request_id uuid,
  request_status varchar
)
language sql
security invoker
set search_path = ''
as $$
  select * from private.reject_fsp_link_request(target_request_id, rejection_reason);
$$;

revoke all on function public.search_fsps_for_onboarding(text, integer, integer) from public, anon;
revoke all on function public.get_fsp_for_onboarding(uuid) from public, anon;
revoke all on function public.get_my_fsp_onboarding_state() from public, anon;
revoke all on function public.request_fsp_link(uuid) from public, anon;
revoke all on function public.approve_fsp_link_request(uuid) from public, anon;
revoke all on function public.reject_fsp_link_request(uuid, text) from public, anon;

grant execute on function public.search_fsps_for_onboarding(text, integer, integer) to authenticated;
grant execute on function public.get_fsp_for_onboarding(uuid) to authenticated;
grant execute on function public.get_my_fsp_onboarding_state() to authenticated;
grant execute on function public.request_fsp_link(uuid) to authenticated;
grant execute on function public.approve_fsp_link_request(uuid) to authenticated;
grant execute on function public.reject_fsp_link_request(uuid, text) to authenticated;

comment on function public.search_fsps_for_onboarding(text, integer, integer) is
  'Security-invoker Data API gateway to the constrained private registry search.';
comment on function public.get_fsp_for_onboarding(uuid) is
  'Security-invoker Data API gateway to the constrained private onboarding detail projection.';
comment on function public.get_my_fsp_onboarding_state() is
  'Security-invoker Data API gateway to the caller-bound private onboarding state resolver.';
comment on function public.request_fsp_link(uuid) is
  'Security-invoker Data API gateway to idempotent, caller-bound private request creation.';
comment on function public.approve_fsp_link_request(uuid) is
  'Security-invoker Data API gateway to the private, reviewer-authorized atomic approval operation.';
comment on function public.reject_fsp_link_request(uuid, text) is
  'Security-invoker Data API gateway to the private, reviewer-authorized rejection operation.';
