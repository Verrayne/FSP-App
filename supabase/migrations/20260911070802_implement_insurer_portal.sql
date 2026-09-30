-- Prompt 09: tenant-scoped insurer portal read models.

create index submissions_period_status_submit_date_idx
  on public.submissions (submission_period_id, status, submit_date desc);

create index tenant_fsps_tenant_active_idx
  on public.tenant_fsps (tenant_id, id) include (fsp_id, broker_reference)
  where status = 'ACTIVE';

create index tenant_fsps_broker_reference_trgm_idx
  on public.tenant_fsps using gin (broker_reference extensions.gin_trgm_ops)
  where broker_reference is not null;

create or replace function private.has_active_tenant_access(target_tenant_id uuid, actor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tenant_memberships tm
    join public.tenants t on t.id = tm.tenant_id
    where tm.tenant_id = target_tenant_id
      and tm.user_id = actor_id
      and tm.status = 'ACTIVE'
      and tm.role in ('ADMIN','REVIEWER','VIEWER')
      and t.active
      and t.status = 'ACTIVE'
  );
$$;

revoke all on function private.has_active_tenant_access(uuid,uuid) from public, anon, authenticated;

create or replace function private.list_my_tenant_memberships_impl()
returns table(
  membership_id uuid,
  tenant_id uuid,
  tenant_code text,
  tenant_name text,
  tenant_role text
)
language sql
stable
security definer
set search_path = ''
as $$
  select tm.id, t.id, t.code::text, t.name::text, tm.role::text
  from public.tenant_memberships tm
  join public.tenants t on t.id = tm.tenant_id
  where tm.user_id = auth.uid()
    and tm.status = 'ACTIVE'
    and tm.role in ('ADMIN','REVIEWER','VIEWER')
    and t.active
    and t.status = 'ACTIVE'
  order by t.name, t.id;
$$;

create or replace function private.get_tenant_dashboard_impl(
  target_tenant_id uuid,
  target_today date
)
returns table(
  period_id uuid,
  period_name text,
  period_year integer,
  period_open_date date,
  period_close_date date,
  total_fsps bigint,
  submitted_fsps bigint,
  outstanding_fsps bigint,
  under_review_submissions bigint,
  completed_submissions bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.has_active_tenant_access(target_tenant_id, auth.uid()) then
    raise exception 'Insurer access denied' using errcode = '42501';
  end if;

  return query
  with current_period as (
    select sp.id, sp.name, sp.year, sp.open_date, sp.close_date
    from public.submission_periods sp
    where sp.tenant_id = target_tenant_id
      and sp.status = 'OPEN'
      and sp.open_date <= target_today
      and sp.close_date >= target_today
    order by sp.close_date, sp.id
    limit 1
  ), portfolio as (
    select tf.id, s.status
    from public.tenant_fsps tf
    left join current_period cp on true
    left join public.submissions s
      on s.tenant_fsp_id = tf.id and s.submission_period_id = cp.id
    where tf.tenant_id = target_tenant_id and tf.status = 'ACTIVE'
  )
  select cp.id, cp.name::text, cp.year, cp.open_date, cp.close_date,
    count(p.id)::bigint,
    count(p.id) filter (where p.status in ('SUBMITTED','UNDER_REVIEW','COMPLETED','REJECTED'))::bigint,
    count(p.id) filter (where p.status is null or p.status in ('NOT_STARTED','IN_PROGRESS'))::bigint,
    count(p.id) filter (where p.status = 'UNDER_REVIEW')::bigint,
    count(p.id) filter (where p.status = 'COMPLETED')::bigint
  from portfolio p
  left join current_period cp on true
  group by cp.id, cp.name, cp.year, cp.open_date, cp.close_date;
end;
$$;

create or replace function private.list_tenant_periods_impl(target_tenant_id uuid)
returns table(period_id uuid, period_name text, period_year integer, period_status text, open_date date, close_date date)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not private.has_active_tenant_access(target_tenant_id, auth.uid()) then
    raise exception 'Insurer access denied' using errcode='42501';
  end if;
  return query select sp.id,sp.name::text,sp.year,sp.status::text,sp.open_date,sp.close_date
    from public.submission_periods sp where sp.tenant_id=target_tenant_id
    order by sp.open_date desc,sp.id;
end; $$;

create or replace function private.list_tenant_fsps_impl(
  target_tenant_id uuid,
  target_today date,
  search_query text,
  submission_filter text,
  regulatory_filter text,
  relationship_filter text,
  sort_field text,
  sort_direction text,
  page_number integer,
  page_size integer
)
returns table(
  tenant_fsp_id uuid,
  fsp_id uuid,
  fsp_number text,
  registered_name text,
  trade_name text,
  regulatory_status text,
  broker_reference text,
  relationship_status text,
  submission_id uuid,
  submission_status text,
  submission_route text,
  submit_date timestamptz,
  period_id uuid,
  period_name text,
  total_count bigint
)
language plpgsql stable security definer set search_path = '' as $$
declare escaped_search text;
begin
  if auth.uid() is null or not private.has_active_tenant_access(target_tenant_id, auth.uid()) then
    raise exception 'Insurer access denied' using errcode='42501';
  end if;
  if submission_filter not in ('ALL','OUTSTANDING','NOT_STARTED','IN_PROGRESS','SUBMITTED','UNDER_REVIEW','COMPLETED','REJECTED')
    or relationship_filter not in ('ALL','ACTIVE','SUSPENDED','DELINKED')
    or sort_field not in ('name','fsp_number','submission_status','submit_date')
    or sort_direction not in ('asc','desc')
    or page_number < 1 or page_size not in (10,25,50)
  then raise exception 'Invalid portfolio filters' using errcode='22023'; end if;
  if regulatory_filter not in ('ALL','AUTHORISED','SUSPENDED','WITHDRAWN','LAPSED') then
    raise exception 'Invalid regulatory filter' using errcode='22023'; end if;
  escaped_search := replace(replace(replace(btrim(search_query),'\','\\'),'%','\%'),'_','\_');

  return query
  with current_period as (
    select sp.id,sp.name from public.submission_periods sp
    where sp.tenant_id=target_tenant_id and sp.status='OPEN'
      and sp.open_date<=target_today and sp.close_date>=target_today
    order by sp.close_date,sp.id limit 1
  ), rows as (
    select tf.id as relationship_id,f.id as global_fsp_id,f.fsp_number::text,
      f.registered_name::text,f.trade_name::text,f.status::text as fsca_status,
      tf.broker_reference::text,tf.status::text as relationship_state,
      s.id as current_submission_id,coalesce(s.status,'OUTSTANDING')::text as current_submission_status,
      s.submission_route::text,s.submit_date,cp.id as current_period_id,cp.name::text as current_period_name
    from public.tenant_fsps tf
    join public.fsps f on f.id=tf.fsp_id
    left join current_period cp on true
    left join public.submissions s on s.tenant_fsp_id=tf.id and s.submission_period_id=cp.id
    where tf.tenant_id=target_tenant_id
      and (relationship_filter='ALL' or tf.status=relationship_filter)
      and (regulatory_filter='ALL' or f.status=regulatory_filter)
      and (submission_filter='ALL' or coalesce(s.status,'OUTSTANDING')=submission_filter)
      and (escaped_search='' or f.registered_name ilike '%'||escaped_search||'%' escape '\'
        or coalesce(f.trade_name,'') ilike '%'||escaped_search||'%' escape '\'
        or f.fsp_number ilike '%'||escaped_search||'%' escape '\'
        or coalesce(tf.broker_reference,'') ilike '%'||escaped_search||'%' escape '\')
  )
  select r.relationship_id,r.global_fsp_id,r.fsp_number,r.registered_name,r.trade_name,
    r.fsca_status,r.broker_reference,r.relationship_state,r.current_submission_id,
    r.current_submission_status,r.submission_route,r.submit_date,r.current_period_id,
    r.current_period_name,count(*) over()::bigint
  from rows r
  order by
    case when sort_field='name' and sort_direction='asc' then lower(coalesce(r.trade_name,r.registered_name)) end asc,
    case when sort_field='name' and sort_direction='desc' then lower(coalesce(r.trade_name,r.registered_name)) end desc,
    case when sort_field='fsp_number' and sort_direction='asc' then r.fsp_number end asc,
    case when sort_field='fsp_number' and sort_direction='desc' then r.fsp_number end desc,
    case when sort_field='submission_status' and sort_direction='asc' then r.current_submission_status end asc,
    case when sort_field='submission_status' and sort_direction='desc' then r.current_submission_status end desc,
    case when sort_field='submit_date' and sort_direction='asc' then r.submit_date end asc nulls last,
    case when sort_field='submit_date' and sort_direction='desc' then r.submit_date end desc nulls last,
    r.relationship_id
  limit page_size offset ((page_number-1)*page_size);
end; $$;

create or replace function private.list_tenant_submissions_impl(
  target_tenant_id uuid,
  target_today date,
  target_period_id uuid,
  search_query text,
  status_filter text,
  route_filter text,
  sort_field text,
  sort_direction text,
  page_number integer,
  page_size integer
)
returns table(
  submission_id uuid,
  tenant_fsp_id uuid,
  fsp_id uuid,
  fsp_number text,
  registered_name text,
  trade_name text,
  broker_reference text,
  period_id uuid,
  period_name text,
  period_year integer,
  submission_status text,
  submission_route text,
  start_date timestamptz,
  submit_date timestamptz,
  total_count bigint
)
language plpgsql stable security definer set search_path = '' as $$
declare selected_period uuid:=target_period_id; escaped_search text;
begin
  if auth.uid() is null or not private.has_active_tenant_access(target_tenant_id, auth.uid()) then
    raise exception 'Insurer access denied' using errcode='42501';
  end if;
  if status_filter not in ('ALL','NOT_STARTED','IN_PROGRESS','SUBMITTED','UNDER_REVIEW','COMPLETED','REJECTED')
    or route_filter not in ('ALL','CERTIFICATE','AFFIDAVIT','UNASSIGNED')
    or sort_field not in ('submit_date','fsp','status') or sort_direction not in ('asc','desc')
    or page_number<1 or page_size not in (10,25,50)
  then raise exception 'Invalid submission filters' using errcode='22023'; end if;
  if selected_period is null then
    select sp.id into selected_period from public.submission_periods sp
    where sp.tenant_id=target_tenant_id and sp.status='OPEN'
      and sp.open_date<=target_today and sp.close_date>=target_today
    order by sp.close_date,sp.id limit 1;
  elsif not exists(select 1 from public.submission_periods sp where sp.id=selected_period and sp.tenant_id=target_tenant_id) then
    raise exception 'Submission period unavailable' using errcode='P0002';
  end if;
  if selected_period is null then return; end if;
  escaped_search:=replace(replace(replace(btrim(search_query),'\','\\'),'%','\%'),'_','\_');
  return query
  with rows as (
    select s.id,tf.id as relationship_id,f.id as global_fsp_id,f.fsp_number::text,
      f.registered_name::text,f.trade_name::text,tf.broker_reference::text,
      sp.id as selected_period_id,sp.name::text,sp.year,s.status::text,
      s.submission_route::text,s.start_date,s.submit_date
    from public.submissions s
    join public.submission_periods sp on sp.id=s.submission_period_id
    join public.tenant_fsps tf on tf.id=s.tenant_fsp_id
    join public.fsps f on f.id=tf.fsp_id
    where sp.tenant_id=target_tenant_id and sp.id=selected_period
      and (status_filter='ALL' or s.status=status_filter)
      and (route_filter='ALL' or s.submission_route=route_filter or (route_filter='UNASSIGNED' and s.submission_route is null))
      and (escaped_search='' or f.registered_name ilike '%'||escaped_search||'%' escape '\'
        or coalesce(f.trade_name,'') ilike '%'||escaped_search||'%' escape '\'
        or f.fsp_number ilike '%'||escaped_search||'%' escape '\'
        or coalesce(tf.broker_reference,'') ilike '%'||escaped_search||'%' escape '\')
  )
  select r.id,r.relationship_id,r.global_fsp_id,r.fsp_number,r.registered_name,r.trade_name,
    r.broker_reference,r.selected_period_id,r.name,r.year,r.status,r.submission_route,
    r.start_date,r.submit_date,count(*) over()::bigint
  from rows r
  order by
    case when sort_field='submit_date' and sort_direction='asc' then coalesce(r.submit_date,r.start_date) end asc nulls last,
    case when sort_field='submit_date' and sort_direction='desc' then coalesce(r.submit_date,r.start_date) end desc nulls last,
    case when sort_field='fsp' and sort_direction='asc' then lower(coalesce(r.trade_name,r.registered_name)) end asc,
    case when sort_field='fsp' and sort_direction='desc' then lower(coalesce(r.trade_name,r.registered_name)) end desc,
    case when sort_field='status' and sort_direction='asc' then r.status end asc,
    case when sort_field='status' and sort_direction='desc' then r.status end desc,
    r.id
  limit page_size offset ((page_number-1)*page_size);
end; $$;

create or replace function private.get_tenant_submission_header_impl(target_tenant_id uuid,target_submission_id uuid)
returns table(
  submission_id uuid,tenant_fsp_id uuid,fsp_id uuid,fsp_number text,registered_name text,trade_name text,
  broker_reference text,period_id uuid,period_name text,period_year integer,questionnaire_version_id uuid,
  questionnaire_name text,questionnaire_version integer,submission_status text,submission_route text,
  start_date timestamptz,submit_date timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not private.has_active_tenant_access(target_tenant_id,auth.uid()) then
    raise exception 'Insurer access denied' using errcode='42501'; end if;
  return query
  select s.id,tf.id,f.id,f.fsp_number::text,f.registered_name::text,f.trade_name::text,
    tf.broker_reference::text,sp.id,sp.name::text,sp.year,sp.questionnaire_version_id,
    q.name::text,qv.version_number,s.status::text,s.submission_route::text,s.start_date,s.submit_date
  from public.submissions s
  join public.submission_periods sp on sp.id=s.submission_period_id
  join public.tenant_fsps tf on tf.id=s.tenant_fsp_id and tf.tenant_id=sp.tenant_id
  join public.fsps f on f.id=tf.fsp_id
  join public.questionnaire_versions qv on qv.id=sp.questionnaire_version_id
  join public.questionnaires q on q.id=qv.questionnaire_id
  where s.id=target_submission_id and sp.tenant_id=target_tenant_id;
end; $$;

-- Public functions are security-invoker Data API gateways; elevated implementations stay private.
create or replace function public.list_my_tenant_memberships()
returns table(membership_id uuid,tenant_id uuid,tenant_code text,tenant_name text,tenant_role text)
language sql stable security invoker set search_path='' as $$ select * from private.list_my_tenant_memberships_impl(); $$;
create or replace function public.get_tenant_dashboard(target_tenant_id uuid,target_today date)
returns table(period_id uuid,period_name text,period_year integer,period_open_date date,period_close_date date,total_fsps bigint,submitted_fsps bigint,outstanding_fsps bigint,under_review_submissions bigint,completed_submissions bigint)
language sql stable security invoker set search_path='' as $$ select * from private.get_tenant_dashboard_impl(target_tenant_id,target_today); $$;
create or replace function public.list_tenant_periods(target_tenant_id uuid)
returns table(period_id uuid,period_name text,period_year integer,period_status text,open_date date,close_date date)
language sql stable security invoker set search_path='' as $$ select * from private.list_tenant_periods_impl(target_tenant_id); $$;
create or replace function public.list_tenant_fsps(target_tenant_id uuid,target_today date,search_query text,submission_filter text,regulatory_filter text,relationship_filter text,sort_field text,sort_direction text,page_number integer,page_size integer)
returns table(tenant_fsp_id uuid,fsp_id uuid,fsp_number text,registered_name text,trade_name text,regulatory_status text,broker_reference text,relationship_status text,submission_id uuid,submission_status text,submission_route text,submit_date timestamptz,period_id uuid,period_name text,total_count bigint)
language sql stable security invoker set search_path='' as $$ select * from private.list_tenant_fsps_impl(target_tenant_id,target_today,search_query,submission_filter,regulatory_filter,relationship_filter,sort_field,sort_direction,page_number,page_size); $$;
create or replace function public.list_tenant_submissions(target_tenant_id uuid,target_today date,target_period_id uuid,search_query text,status_filter text,route_filter text,sort_field text,sort_direction text,page_number integer,page_size integer)
returns table(submission_id uuid,tenant_fsp_id uuid,fsp_id uuid,fsp_number text,registered_name text,trade_name text,broker_reference text,period_id uuid,period_name text,period_year integer,submission_status text,submission_route text,start_date timestamptz,submit_date timestamptz,total_count bigint)
language sql stable security invoker set search_path='' as $$ select * from private.list_tenant_submissions_impl(target_tenant_id,target_today,target_period_id,search_query,status_filter,route_filter,sort_field,sort_direction,page_number,page_size); $$;
create or replace function public.get_tenant_submission_header(target_tenant_id uuid,target_submission_id uuid)
returns table(submission_id uuid,tenant_fsp_id uuid,fsp_id uuid,fsp_number text,registered_name text,trade_name text,broker_reference text,period_id uuid,period_name text,period_year integer,questionnaire_version_id uuid,questionnaire_name text,questionnaire_version integer,submission_status text,submission_route text,start_date timestamptz,submit_date timestamptz)
language sql stable security invoker set search_path='' as $$ select * from private.get_tenant_submission_header_impl(target_tenant_id,target_submission_id); $$;

revoke all on function
  public.list_my_tenant_memberships(),
  public.get_tenant_dashboard(uuid,date),
  public.list_tenant_periods(uuid),
  public.list_tenant_fsps(uuid,date,text,text,text,text,text,text,integer,integer),
  public.list_tenant_submissions(uuid,date,uuid,text,text,text,text,text,integer,integer),
  public.get_tenant_submission_header(uuid,uuid)
from public,anon;
grant execute on function
  public.list_my_tenant_memberships(),
  public.get_tenant_dashboard(uuid,date),
  public.list_tenant_periods(uuid),
  public.list_tenant_fsps(uuid,date,text,text,text,text,text,text,integer,integer),
  public.list_tenant_submissions(uuid,date,uuid,text,text,text,text,text,integer,integer),
  public.get_tenant_submission_header(uuid,uuid)
to authenticated;

revoke all on function
  private.list_my_tenant_memberships_impl(),
  private.get_tenant_dashboard_impl(uuid,date),
  private.list_tenant_periods_impl(uuid),
  private.list_tenant_fsps_impl(uuid,date,text,text,text,text,text,text,integer,integer),
  private.list_tenant_submissions_impl(uuid,date,uuid,text,text,text,text,text,integer,integer),
  private.get_tenant_submission_header_impl(uuid,uuid)
from public,anon;
grant execute on function
  private.has_active_tenant_access(uuid,uuid),
  private.list_my_tenant_memberships_impl(),
  private.get_tenant_dashboard_impl(uuid,date),
  private.list_tenant_periods_impl(uuid),
  private.list_tenant_fsps_impl(uuid,date,text,text,text,text,text,text,integer,integer),
  private.list_tenant_submissions_impl(uuid,date,uuid,text,text,text,text,text,integer,integer),
  private.get_tenant_submission_header_impl(uuid,uuid)
to authenticated;

comment on function public.list_my_tenant_memberships() is 'Active insurer contexts for the authenticated user; inactive tenants and memberships are excluded.';
comment on function public.get_tenant_dashboard(uuid,date) is 'Tenant-authorized current-period insurer metrics; absence of a submission counts as outstanding.';
comment on function public.list_tenant_fsps(uuid,date,text,text,text,text,text,text,integer,integer) is 'Tenant-authorized server-side portfolio search, filters, sorting and pagination.';
comment on function public.list_tenant_submissions(uuid,date,uuid,text,text,text,text,text,integer,integer) is 'Tenant-authorized server-side submission queue search, filters, sorting and pagination.';
