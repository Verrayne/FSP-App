-- Prompt 10: tenant-scoped administration for organisation, users, periods and FSP relationships.

alter table public.tenant_memberships
  add column revoked_date timestamptz,
  add column revoked_by uuid references public.profiles(id) on delete restrict,
  add constraint tenant_memberships_revocation_pair check (
    (revoked_date is null and revoked_by is null)
    or (revoked_date is not null and revoked_by is not null)
  );

create index tenant_memberships_tenant_status_role_idx
  on public.tenant_memberships (tenant_id, status, role);

create table public.tenant_invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  email varchar(320) not null,
  email_normalized varchar(320) not null,
  role varchar(20) not null,
  status varchar(20) not null default 'PENDING',
  token_hash char(64) not null unique,
  invited_by uuid not null references public.profiles(id) on delete restrict,
  invite_date timestamptz not null default now(),
  expiry_date timestamptz not null,
  accepted_date timestamptz,
  accepted_by uuid references public.profiles(id) on delete restrict,
  revoked_date timestamptz,
  revoked_by uuid references public.profiles(id) on delete restrict,
  delivery_status varchar(20) not null default 'PENDING',
  delivery_date timestamptz,
  delivery_error_code varchar(80),
  create_date timestamptz not null default now(),
  update_date timestamptz not null default now(),
  constraint tenant_invitations_email_normalized check (
    email_normalized = lower(btrim(email)) and email_normalized = btrim(email_normalized)
  ),
  constraint tenant_invitations_role_check check (role in ('ADMIN','REVIEWER')),
  constraint tenant_invitations_status_check check (status in ('PENDING','ACCEPTED','EXPIRED','REVOKED')),
  constraint tenant_invitations_token_hash_check check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint tenant_invitations_delivery_status_check check (delivery_status in ('PENDING','SENT','CAPTURED','FAILED')),
  constraint tenant_invitations_expiry_check check (expiry_date > invite_date),
  constraint tenant_invitations_acceptance_pair check (
    (accepted_date is null and accepted_by is null)
    or (accepted_date is not null and accepted_by is not null)
  ),
  constraint tenant_invitations_revocation_pair check (
    (revoked_date is null and revoked_by is null)
    or (revoked_date is not null and revoked_by is not null)
  )
);

create unique index tenant_invitations_one_pending_email_idx
  on public.tenant_invitations (tenant_id, email_normalized) where status='PENDING';
create index tenant_invitations_tenant_status_idx
  on public.tenant_invitations (tenant_id, status, invite_date desc);
create index tenant_invitations_expiry_idx
  on public.tenant_invitations (expiry_date) where status='PENDING';
create index tenant_fsps_tenant_status_name_idx
  on public.tenant_fsps (tenant_id, status, fsp_id);
create index submission_periods_tenant_status_dates_idx
  on public.submission_periods (tenant_id, status, open_date, close_date);

create trigger tenant_invitations_set_update_date before update on public.tenant_invitations
for each row execute function private.set_update_date();

alter table public.tenant_invitations enable row level security;
alter table public.tenant_invitations force row level security;
revoke all on table public.tenant_invitations from public, anon, authenticated;
grant all on table public.tenant_invitations to service_role;

create policy tenant_invitations_no_direct_access on public.tenant_invitations
for all to authenticated using (false) with check (false);

create or replace function private.is_active_tenant_admin(target_tenant_id uuid, actor_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists (
    select 1 from public.tenant_memberships tm
    join public.tenants t on t.id=tm.tenant_id
    where tm.tenant_id=target_tenant_id and tm.user_id=actor_id
      and tm.status='ACTIVE' and tm.role='ADMIN' and t.active and t.status='ACTIVE'
  );
$$;

create or replace function private.get_tenant_settings_impl(target_tenant_id uuid)
returns table(tenant_id uuid,tenant_code text,tenant_name text,tenant_status text,tenant_active boolean,update_date timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.is_active_tenant_admin(target_tenant_id,auth.uid()) then
    raise exception 'Tenant settings unavailable' using errcode='42501';
  end if;
  return query select t.id,t.code::text,t.name::text,t.status::text,t.active,t.update_date
    from public.tenants t where t.id=target_tenant_id;
end; $$;

create or replace function private.update_tenant_organisation_impl(target_tenant_id uuid,target_name text)
returns table(tenant_id uuid,tenant_name text,update_date timestamptz)
language plpgsql security definer set search_path='' as $$
declare actor_id uuid:=auth.uid(); updated public.tenants;
begin
  perform 1 from public.tenants where id=target_tenant_id for update;
  if not found or actor_id is null or not private.is_active_tenant_admin(target_tenant_id,actor_id) then
    raise exception 'Tenant settings unavailable' using errcode='42501';
  end if;
  if btrim(target_name)='' or length(btrim(target_name))>255 then
    raise exception 'Organisation name is invalid' using errcode='22023';
  end if;
  update public.tenants set name=btrim(target_name) where id=target_tenant_id returning * into updated;
  insert into public.audit_events(tenant_id,actor_user_id,event_type,entity_type,entity_id,metadata)
    values(target_tenant_id,actor_id,'TENANT_ORGANISATION_UPDATED','TENANT',target_tenant_id,
      jsonb_build_object('changed_fields',jsonb_build_array('name')));
  return query select updated.id,updated.name::text,updated.update_date;
end; $$;

create or replace function private.list_tenant_members_impl(target_tenant_id uuid)
returns table(membership_id uuid,user_id uuid,first_name text,last_name text,email text,role text,status text,create_date timestamptz,update_date timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.is_active_tenant_admin(target_tenant_id,auth.uid()) then
    raise exception 'Tenant administration denied' using errcode='42501';
  end if;
  return query select tm.id,tm.user_id,p.first_name::text,p.last_name::text,au.email::text,
    tm.role::text,tm.status::text,tm.create_date,tm.update_date
    from public.tenant_memberships tm
    join public.profiles p on p.id=tm.user_id
    join auth.users au on au.id=tm.user_id
    where tm.tenant_id=target_tenant_id and tm.status<>'REVOKED'
    order by lower(p.first_name),lower(p.last_name),lower(au.email);
end; $$;

create or replace function private.list_tenant_invitations_impl(target_tenant_id uuid)
returns table(invitation_id uuid,email text,role text,status text,invite_date timestamptz,expiry_date timestamptz,delivery_status text,delivery_date timestamptz)
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.is_active_tenant_admin(target_tenant_id,auth.uid()) then
    raise exception 'Tenant administration denied' using errcode='42501';
  end if;
  update public.tenant_invitations set status='EXPIRED'
    where tenant_id=target_tenant_id and status='PENDING' and expiry_date<=now();
  return query select i.id,i.email::text,i.role::text,i.status::text,i.invite_date,i.expiry_date,
    i.delivery_status::text,i.delivery_date from public.tenant_invitations i
    where i.tenant_id=target_tenant_id order by i.invite_date desc,i.id;
end; $$;

create or replace function private.create_tenant_invitation_impl(target_tenant_id uuid,target_email text,target_role text,target_token_hash text)
returns table(invitation_id uuid,email text,role text,expiry_date timestamptz)
language plpgsql security definer set search_path='' as $$
declare actor_id uuid:=auth.uid(); normalized text:=lower(btrim(target_email)); created public.tenant_invitations;
begin
  perform 1 from public.tenants where id=target_tenant_id and active and status='ACTIVE' for update;
  if not found or actor_id is null or not private.is_active_tenant_admin(target_tenant_id,actor_id) then
    raise exception 'Tenant administration denied' using errcode='42501';
  end if;
  if normalized='' or length(normalized)>320 or normalized !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'A valid email address is required' using errcode='22023';
  end if;
  if target_role not in ('ADMIN','REVIEWER') or target_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid invitation values' using errcode='22023';
  end if;
  update public.tenant_invitations set status='EXPIRED'
    where tenant_id=target_tenant_id and email_normalized=normalized and status='PENDING' and expiry_date<=now();
  if exists(select 1 from public.tenant_memberships tm join auth.users au on au.id=tm.user_id
    where tm.tenant_id=target_tenant_id and tm.status='ACTIVE' and lower(au.email)=normalized) then
    raise exception 'This user already has active access' using errcode='23505';
  end if;
  insert into public.tenant_invitations(tenant_id,email,email_normalized,role,token_hash,invited_by,expiry_date)
    values(target_tenant_id,btrim(target_email),normalized,target_role,target_token_hash,actor_id,now()+interval '7 days')
    returning * into created;
  insert into public.audit_events(tenant_id,actor_user_id,event_type,entity_type,entity_id,metadata)
    values(target_tenant_id,actor_id,'TENANT_USER_INVITED','TENANT_INVITATION',created.id,jsonb_build_object('role',target_role));
  return query select created.id,created.email::text,created.role::text,created.expiry_date;
exception when unique_violation then
  raise exception 'A pending invitation already exists' using errcode='23505';
end; $$;

create or replace function private.resend_tenant_invitation_impl(target_invitation_id uuid,target_token_hash text)
returns table(invitation_id uuid,email text,role text,expiry_date timestamptz)
language plpgsql security definer set search_path='' as $$
declare actor_id uuid:=auth.uid(); row_data public.tenant_invitations;
begin
  select * into row_data from public.tenant_invitations where id=target_invitation_id for update;
  if not found then raise exception 'Invitation unavailable' using errcode='P0002'; end if;
  perform 1 from public.tenants where id=row_data.tenant_id for update;
  if actor_id is null or not private.is_active_tenant_admin(row_data.tenant_id,actor_id) then
    raise exception 'Invitation unavailable' using errcode='42501';
  end if;
  if row_data.status<>'PENDING' or row_data.expiry_date<=now() or target_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invitation unavailable' using errcode='55000';
  end if;
  update public.tenant_invitations set token_hash=target_token_hash,invite_date=now(),expiry_date=now()+interval '7 days',
    delivery_status='PENDING',delivery_date=null,delivery_error_code=null
    where id=row_data.id returning * into row_data;
  insert into public.audit_events(tenant_id,actor_user_id,event_type,entity_type,entity_id)
    values(row_data.tenant_id,actor_id,'TENANT_INVITATION_RESENT','TENANT_INVITATION',row_data.id);
  return query select row_data.id,row_data.email::text,row_data.role::text,row_data.expiry_date;
end; $$;

create or replace function private.record_tenant_invitation_delivery_impl(target_invitation_id uuid,target_status text,target_error_code text)
returns void language plpgsql security definer set search_path='' as $$
declare actor_id uuid:=auth.uid(); tenant_id_value uuid;
begin
  select tenant_id into tenant_id_value from public.tenant_invitations where id=target_invitation_id for update;
  if actor_id is null or not private.is_active_tenant_admin(tenant_id_value,actor_id) then
    raise exception 'Tenant administration denied' using errcode='42501';
  end if;
  if target_status not in ('SENT','CAPTURED','FAILED') then raise exception 'Invalid delivery state' using errcode='22023'; end if;
  update public.tenant_invitations set delivery_status=target_status,delivery_date=now(),
    delivery_error_code=case when target_status='FAILED' then left(target_error_code,80) else null end
    where id=target_invitation_id;
end; $$;

create or replace function private.revoke_tenant_invitation_impl(target_invitation_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare actor_id uuid:=auth.uid(); row_data public.tenant_invitations;
begin
  select * into row_data from public.tenant_invitations where id=target_invitation_id for update;
  if not found or actor_id is null or not private.is_active_tenant_admin(row_data.tenant_id,actor_id) then
    raise exception 'Invitation unavailable' using errcode='42501';
  end if;
  perform 1 from public.tenants where id=row_data.tenant_id for update;
  if row_data.status<>'PENDING' then raise exception 'Invitation unavailable' using errcode='55000'; end if;
  update public.tenant_invitations set status='REVOKED',revoked_date=now(),revoked_by=actor_id where id=row_data.id;
  insert into public.audit_events(tenant_id,actor_user_id,event_type,entity_type,entity_id)
    values(row_data.tenant_id,actor_id,'TENANT_INVITATION_REVOKED','TENANT_INVITATION',row_data.id);
end; $$;

create or replace function private.get_tenant_invitation_context_impl(target_token_hash text)
returns table(tenant_name text,role text,expiry_date timestamptz)
language sql stable security definer set search_path='' as $$
  select t.name::text,i.role::text,i.expiry_date
  from public.tenant_invitations i join public.tenants t on t.id=i.tenant_id
  where target_token_hash ~ '^[0-9a-f]{64}$' and i.token_hash=target_token_hash
    and i.status='PENDING' and i.expiry_date>now() and t.active and t.status='ACTIVE' limit 1;
$$;

create or replace function private.accept_tenant_invitation_impl(target_token_hash text)
returns table(tenant_id uuid,membership_id uuid)
language plpgsql security definer set search_path='' as $$
declare actor_id uuid:=auth.uid(); actor_email text; row_data public.tenant_invitations; member_id uuid;
begin
  if actor_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select lower(email) into actor_email from auth.users where id=actor_id and email_confirmed_at is not null;
  if actor_email is null then raise exception 'A verified email is required' using errcode='42501'; end if;
  select * into row_data from public.tenant_invitations where token_hash=target_token_hash for update;
  if not found or row_data.status<>'PENDING' or row_data.expiry_date<=now() then
    raise exception 'Invitation unavailable' using errcode='P0002';
  end if;
  perform 1 from public.tenants where id=row_data.tenant_id and active and status='ACTIVE' for update;
  if not found or actor_email<>row_data.email_normalized or row_data.role not in ('ADMIN','REVIEWER') then
    raise exception 'Invitation unavailable' using errcode='42501';
  end if;
  insert into public.tenant_memberships(tenant_id,user_id,role,status)
    values(row_data.tenant_id,actor_id,row_data.role,'ACTIVE')
    on conflict(tenant_id,user_id) do update set role=excluded.role,status='ACTIVE',revoked_date=null,revoked_by=null
    returning id into member_id;
  update public.tenant_invitations set status='ACCEPTED',accepted_date=now(),accepted_by=actor_id where id=row_data.id;
  insert into public.audit_events(tenant_id,actor_user_id,event_type,entity_type,entity_id,metadata)
    values(row_data.tenant_id,actor_id,'TENANT_INVITATION_ACCEPTED','TENANT_MEMBERSHIP',member_id,jsonb_build_object('role',row_data.role));
  return query select row_data.tenant_id,member_id;
end; $$;

create or replace function private.change_tenant_member_role_impl(target_membership_id uuid,target_role text)
returns void language plpgsql security definer set search_path='' as $$
declare actor_id uuid:=auth.uid(); row_data public.tenant_memberships; old_role text;
begin
  select * into row_data from public.tenant_memberships where id=target_membership_id;
  if not found or target_role not in ('ADMIN','REVIEWER') then raise exception 'Invalid membership operation' using errcode='22023'; end if;
  perform 1 from public.tenants where id=row_data.tenant_id for update;
  if actor_id is null or not private.is_active_tenant_admin(row_data.tenant_id,actor_id) then
    raise exception 'Tenant administration denied' using errcode='42501';
  end if;
  select role into old_role from public.tenant_memberships where id=row_data.id and status='ACTIVE' for update;
  if not found then raise exception 'Membership is not active' using errcode='55000'; end if;
  if old_role='ADMIN' and target_role<>'ADMIN' and
    (select count(*) from public.tenant_memberships where tenant_id=row_data.tenant_id and role='ADMIN' and status='ACTIVE')<=1 then
    raise exception 'The final active tenant administrator cannot be changed' using errcode='55000';
  end if;
  update public.tenant_memberships set role=target_role where id=row_data.id;
  insert into public.audit_events(tenant_id,actor_user_id,event_type,entity_type,entity_id,metadata)
    values(row_data.tenant_id,actor_id,'TENANT_MEMBER_ROLE_CHANGED','TENANT_MEMBERSHIP',row_data.id,
      jsonb_build_object('old_role',old_role,'new_role',target_role));
end; $$;

create or replace function private.revoke_tenant_member_impl(target_membership_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare actor_id uuid:=auth.uid(); row_data public.tenant_memberships;
begin
  select * into row_data from public.tenant_memberships where id=target_membership_id;
  if not found then raise exception 'Membership unavailable' using errcode='P0002'; end if;
  perform 1 from public.tenants where id=row_data.tenant_id for update;
  if actor_id is null or not private.is_active_tenant_admin(row_data.tenant_id,actor_id) then
    raise exception 'Tenant administration denied' using errcode='42501';
  end if;
  select * into row_data from public.tenant_memberships where id=row_data.id for update;
  if row_data.status<>'ACTIVE' then raise exception 'Membership is not active' using errcode='55000'; end if;
  if row_data.role='ADMIN' and
    (select count(*) from public.tenant_memberships where tenant_id=row_data.tenant_id and role='ADMIN' and status='ACTIVE')<=1 then
    raise exception 'The final active tenant administrator cannot be removed' using errcode='55000';
  end if;
  update public.tenant_memberships set status='REVOKED',revoked_date=now(),revoked_by=actor_id where id=row_data.id;
  insert into public.audit_events(tenant_id,actor_user_id,event_type,entity_type,entity_id,metadata)
    values(row_data.tenant_id,actor_id,'TENANT_MEMBERSHIP_REMOVED','TENANT_MEMBERSHIP',row_data.id,jsonb_build_object('role',row_data.role));
end; $$;

create or replace function private.list_manageable_questionnaire_versions_impl(target_tenant_id uuid)
returns table(questionnaire_version_id uuid,questionnaire_name text,version_number integer,effective_from date,effective_to date)
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.is_active_tenant_admin(target_tenant_id,auth.uid()) then
    raise exception 'Tenant administration denied' using errcode='42501';
  end if;
  return query select qv.id,q.name::text,qv.version_number,qv.effective_from,qv.effective_to
    from public.questionnaire_versions qv join public.questionnaires q on q.id=qv.questionnaire_id
    where qv.status='PUBLISHED' and q.active and (q.tenant_id is null or q.tenant_id=target_tenant_id)
    order by q.name,qv.version_number desc;
end; $$;

create or replace function private.list_tenant_settings_periods_impl(target_tenant_id uuid)
returns table(period_id uuid,period_name text,period_year integer,stored_status text,display_status text,open_date date,close_date date,questionnaire_version_id uuid,questionnaire_name text,questionnaire_version integer,submission_count bigint)
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.is_active_tenant_admin(target_tenant_id,auth.uid()) then
    raise exception 'Tenant administration denied' using errcode='42501';
  end if;
  return query select sp.id,sp.name::text,sp.year,sp.status::text,
    (case when sp.status='DRAFT' then 'DRAFT' when sp.status in ('CLOSED','ARCHIVED') or sp.close_date<current_date then 'CLOSED'
      when sp.open_date>current_date then 'UPCOMING' else 'OPEN' end)::text,
    sp.open_date,sp.close_date,sp.questionnaire_version_id,q.name::text,qv.version_number,count(s.id)::bigint
    from public.submission_periods sp
    join public.questionnaire_versions qv on qv.id=sp.questionnaire_version_id
    join public.questionnaires q on q.id=qv.questionnaire_id
    left join public.submissions s on s.submission_period_id=sp.id
    where sp.tenant_id=target_tenant_id
    group by sp.id,q.name,qv.version_number order by sp.open_date desc,sp.id;
end; $$;

create or replace function private.validate_period_questionnaire(target_tenant_id uuid,target_questionnaire_version_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.questionnaire_versions qv join public.questionnaires q on q.id=qv.questionnaire_id
    where qv.id=target_questionnaire_version_id and qv.status='PUBLISHED' and q.active
      and (q.tenant_id is null or q.tenant_id=target_tenant_id));
$$;

create or replace function private.create_tenant_submission_period_impl(target_tenant_id uuid,target_name text,target_year integer,target_open_date date,target_close_date date,target_questionnaire_version_id uuid,target_status text)
returns table(period_id uuid)
language plpgsql security definer set search_path='' as $$
declare actor_id uuid:=auth.uid(); created public.submission_periods;
begin
  perform 1 from public.tenants where id=target_tenant_id for update;
  if not found or actor_id is null or not private.is_active_tenant_admin(target_tenant_id,actor_id) then raise exception 'Tenant administration denied' using errcode='42501'; end if;
  if btrim(target_name)='' or length(btrim(target_name))>255 or target_year not between 2000 and 2200
    or target_open_date>=target_close_date or target_status not in ('DRAFT','OPEN') then raise exception 'Invalid submission period' using errcode='22023'; end if;
  if not private.validate_period_questionnaire(target_tenant_id,target_questionnaire_version_id) then raise exception 'Questionnaire version unavailable' using errcode='22023'; end if;
  if target_status='OPEN' and exists(select 1 from public.submission_periods sp where sp.tenant_id=target_tenant_id and sp.status='OPEN'
    and daterange(sp.open_date,sp.close_date,'[]') && daterange(target_open_date,target_close_date,'[]')) then raise exception 'Submission periods may not overlap' using errcode='23505'; end if;
  insert into public.submission_periods(tenant_id,questionnaire_version_id,name,year,open_date,close_date,status)
    values(target_tenant_id,target_questionnaire_version_id,btrim(target_name),target_year,target_open_date,target_close_date,target_status)
    returning * into created;
  insert into public.audit_events(tenant_id,actor_user_id,event_type,entity_type,entity_id,metadata)
    values(target_tenant_id,actor_id,'SUBMISSION_PERIOD_CREATED','SUBMISSION_PERIOD',created.id,jsonb_build_object('status',target_status,'year',target_year));
  return query select created.id;
end; $$;

create or replace function private.update_tenant_submission_period_impl(target_period_id uuid,target_name text,target_year integer,target_open_date date,target_close_date date,target_questionnaire_version_id uuid,target_status text)
returns void language plpgsql security definer set search_path='' as $$
declare actor_id uuid:=auth.uid(); row_data public.submission_periods; submissions_exist boolean;
begin
  select * into row_data from public.submission_periods where id=target_period_id;
  if not found then raise exception 'Submission period unavailable' using errcode='P0002'; end if;
  perform 1 from public.tenants where id=row_data.tenant_id for update;
  if actor_id is null or not private.is_active_tenant_admin(row_data.tenant_id,actor_id) then raise exception 'Submission period unavailable' using errcode='42501'; end if;
  select * into row_data from public.submission_periods where id=target_period_id for update;
  select exists(select 1 from public.submissions where submission_period_id=target_period_id) into submissions_exist;
  if btrim(target_name)='' or length(btrim(target_name))>255 or target_year not between 2000 and 2200
    or target_open_date>=target_close_date or target_status not in ('DRAFT','OPEN','CLOSED') then raise exception 'Invalid submission period' using errcode='22023'; end if;
  if row_data.status in ('CLOSED','ARCHIVED') then raise exception 'Historical submission periods are read-only' using errcode='55000'; end if;
  if submissions_exist and target_questionnaire_version_id<>row_data.questionnaire_version_id then raise exception 'Questionnaire version cannot change after submissions exist' using errcode='55000'; end if;
  if row_data.status='OPEN' and (target_year<>row_data.year or target_open_date<>row_data.open_date or target_questionnaire_version_id<>row_data.questionnaire_version_id or target_status='DRAFT') then
    raise exception 'Open period fields are protected' using errcode='55000';
  end if;
  if not private.validate_period_questionnaire(row_data.tenant_id,target_questionnaire_version_id) then raise exception 'Questionnaire version unavailable' using errcode='22023'; end if;
  if target_status='OPEN' and exists(select 1 from public.submission_periods sp where sp.tenant_id=row_data.tenant_id and sp.id<>target_period_id and sp.status='OPEN'
    and daterange(sp.open_date,sp.close_date,'[]') && daterange(target_open_date,target_close_date,'[]')) then raise exception 'Submission periods may not overlap' using errcode='23505'; end if;
  update public.submission_periods set name=btrim(target_name),year=target_year,open_date=target_open_date,close_date=target_close_date,
    questionnaire_version_id=target_questionnaire_version_id,status=target_status where id=target_period_id;
  insert into public.audit_events(tenant_id,actor_user_id,event_type,entity_type,entity_id,metadata)
    values(row_data.tenant_id,actor_id,'SUBMISSION_PERIOD_UPDATED','SUBMISSION_PERIOD',row_data.id,
      jsonb_build_object('status',target_status,'questionnaire_changed',target_questionnaire_version_id<>row_data.questionnaire_version_id));
end; $$;

create or replace function private.delete_tenant_submission_period_impl(target_period_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare actor_id uuid:=auth.uid(); row_data public.submission_periods;
begin
  select * into row_data from public.submission_periods where id=target_period_id;
  if not found then raise exception 'Submission period unavailable' using errcode='P0002'; end if;
  perform 1 from public.tenants where id=row_data.tenant_id for update;
  if actor_id is null or not private.is_active_tenant_admin(row_data.tenant_id,actor_id) then raise exception 'Submission period unavailable' using errcode='42501'; end if;
  select * into row_data from public.submission_periods where id=target_period_id for update;
  if row_data.status<>'DRAFT' or exists(select 1 from public.submissions where submission_period_id=target_period_id) then
    raise exception 'Only unused draft periods may be deleted' using errcode='55000';
  end if;
  insert into public.audit_events(tenant_id,actor_user_id,event_type,entity_type,entity_id,metadata)
    values(row_data.tenant_id,actor_id,'SUBMISSION_PERIOD_DELETED','SUBMISSION_PERIOD',row_data.id,jsonb_build_object('name',row_data.name));
  delete from public.submission_periods where id=target_period_id;
end; $$;

create or replace function private.list_tenant_fsp_relationships_impl(target_tenant_id uuid,search_query text,page_number integer,page_size integer)
returns table(tenant_fsp_id uuid,fsp_id uuid,fsp_number text,registered_name text,trade_name text,regulatory_status text,broker_reference text,relationship_status text,link_date timestamptz,delink_date timestamptz,submission_count bigint,total_count bigint)
language plpgsql stable security definer set search_path='' as $$
declare escaped_search text;
begin
  if auth.uid() is null or not private.is_active_tenant_admin(target_tenant_id,auth.uid()) then raise exception 'Tenant administration denied' using errcode='42501'; end if;
  if page_number<1 or page_size not in (10,25,50) then raise exception 'Invalid relationship filters' using errcode='22023'; end if;
  escaped_search:=replace(replace(replace(btrim(search_query),'\','\\'),'%','\%'),'_','\_');
  return query with rows as (
    select tf.id,tf.fsp_id,f.fsp_number::text,f.registered_name::text,f.trade_name::text,f.status::text,
      tf.broker_reference::text,tf.status::text,tf.link_date,tf.delink_date,count(s.id)::bigint
    from public.tenant_fsps tf join public.fsps f on f.id=tf.fsp_id
    left join public.submissions s on s.tenant_fsp_id=tf.id where tf.tenant_id=target_tenant_id
      and (escaped_search='' or f.fsp_number ilike '%'||escaped_search||'%' escape '\' or f.registered_name ilike '%'||escaped_search||'%' escape '\'
        or coalesce(f.trade_name,'') ilike '%'||escaped_search||'%' escape '\' or coalesce(tf.broker_reference,'') ilike '%'||escaped_search||'%' escape '\')
    group by tf.id,f.id
  ) select r.*,count(*) over()::bigint from rows r order by lower(coalesce(r.trade_name,r.registered_name)),r.id
    limit page_size offset ((page_number-1)*page_size);
end; $$;

create or replace function private.search_fsps_for_tenant_link_impl(target_tenant_id uuid,search_query text,result_limit integer)
returns table(fsp_id uuid,fsp_number text,registered_name text,trade_name text,regulatory_status text,relationship_id uuid,relationship_status text)
language plpgsql stable security definer set search_path='' as $$
declare escaped_search text;
begin
  if auth.uid() is null or not private.is_active_tenant_admin(target_tenant_id,auth.uid()) then raise exception 'Tenant administration denied' using errcode='42501'; end if;
  if length(btrim(search_query))<2 or result_limit not between 1 and 20 then raise exception 'Search is invalid' using errcode='22023'; end if;
  escaped_search:=replace(replace(replace(btrim(search_query),'\','\\'),'%','\%'),'_','\_');
  return query select f.id,f.fsp_number::text,f.registered_name::text,f.trade_name::text,f.status::text,tf.id,tf.status::text
    from public.fsps f left join public.tenant_fsps tf on tf.fsp_id=f.id and tf.tenant_id=target_tenant_id
    where f.fsp_number ilike '%'||escaped_search||'%' escape '\' or f.registered_name ilike '%'||escaped_search||'%' escape '\'
      or coalesce(f.trade_name,'') ilike '%'||escaped_search||'%' escape '\'
    order by case when f.fsp_number=btrim(search_query) then 0 else 1 end,lower(coalesce(f.trade_name,f.registered_name)),f.id limit result_limit;
end; $$;

create or replace function private.link_tenant_fsp_impl(target_tenant_id uuid,target_fsp_id uuid,target_broker_reference text)
returns table(tenant_fsp_id uuid,relationship_status text)
language plpgsql security definer set search_path='' as $$
declare actor_id uuid:=auth.uid(); existing public.tenant_fsps; created_id uuid; event_name text;
begin
  perform 1 from public.tenants where id=target_tenant_id for update;
  if not found or actor_id is null or not private.is_active_tenant_admin(target_tenant_id,actor_id) then raise exception 'Tenant administration denied' using errcode='42501'; end if;
  perform 1 from public.fsps where id=target_fsp_id for update;
  if not found then raise exception 'FSP unavailable' using errcode='P0002'; end if;
  if target_broker_reference is not null and length(btrim(target_broker_reference))>100 then raise exception 'Broker reference is invalid' using errcode='22023'; end if;
  select * into existing from public.tenant_fsps where tenant_id=target_tenant_id and fsp_id=target_fsp_id for update;
  if found then
    if existing.status='ACTIVE' then raise exception 'FSP is already linked' using errcode='23505'; end if;
    update public.tenant_fsps set status='ACTIVE',broker_reference=nullif(btrim(target_broker_reference),''),link_date=now(),delink_date=null where id=existing.id;
    created_id:=existing.id; event_name:='TENANT_FSP_RELINKED';
  else
    insert into public.tenant_fsps(tenant_id,fsp_id,broker_reference) values(target_tenant_id,target_fsp_id,nullif(btrim(target_broker_reference),'')) returning id into created_id;
    event_name:='TENANT_FSP_LINKED';
  end if;
  insert into public.audit_events(tenant_id,fsp_id,actor_user_id,event_type,entity_type,entity_id,metadata)
    values(target_tenant_id,target_fsp_id,actor_id,event_name,'TENANT_FSP',created_id,jsonb_build_object('broker_reference_set',target_broker_reference is not null));
  return query select created_id,'ACTIVE'::text;
end; $$;

create or replace function private.update_tenant_fsp_relationship_impl(target_tenant_fsp_id uuid,target_broker_reference text)
returns void language plpgsql security definer set search_path='' as $$
declare actor_id uuid:=auth.uid(); row_data public.tenant_fsps;
begin
  select * into row_data from public.tenant_fsps where id=target_tenant_fsp_id;
  if not found then raise exception 'Relationship unavailable' using errcode='P0002'; end if;
  perform 1 from public.tenants where id=row_data.tenant_id for update;
  if actor_id is null or not private.is_active_tenant_admin(row_data.tenant_id,actor_id) then raise exception 'Relationship unavailable' using errcode='42501'; end if;
  if target_broker_reference is not null and length(btrim(target_broker_reference))>100 then raise exception 'Broker reference is invalid' using errcode='22023'; end if;
  update public.tenant_fsps set broker_reference=nullif(btrim(target_broker_reference),'') where id=row_data.id;
  insert into public.audit_events(tenant_id,fsp_id,actor_user_id,event_type,entity_type,entity_id,metadata)
    values(row_data.tenant_id,row_data.fsp_id,actor_id,'TENANT_FSP_UPDATED','TENANT_FSP',row_data.id,jsonb_build_object('changed_fields',jsonb_build_array('broker_reference')));
end; $$;

create or replace function private.delink_tenant_fsp_impl(target_tenant_fsp_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare actor_id uuid:=auth.uid(); row_data public.tenant_fsps;
begin
  select * into row_data from public.tenant_fsps where id=target_tenant_fsp_id;
  if not found then raise exception 'Relationship unavailable' using errcode='P0002'; end if;
  perform 1 from public.tenants where id=row_data.tenant_id for update;
  if actor_id is null or not private.is_active_tenant_admin(row_data.tenant_id,actor_id) then raise exception 'Relationship unavailable' using errcode='42501'; end if;
  select * into row_data from public.tenant_fsps where id=row_data.id for update;
  if row_data.status<>'ACTIVE' then raise exception 'Relationship is not active' using errcode='55000'; end if;
  update public.tenant_fsps set status='DELINKED',delink_date=now() where id=row_data.id;
  insert into public.audit_events(tenant_id,fsp_id,actor_user_id,event_type,entity_type,entity_id)
    values(row_data.tenant_id,row_data.fsp_id,actor_id,'TENANT_FSP_DELINKED','TENANT_FSP',row_data.id);
end; $$;

-- Public Data API gateways. Trusted implementations remain outside the exposed schema.
create or replace function public.get_tenant_settings(target_tenant_id uuid) returns table(tenant_id uuid,tenant_code text,tenant_name text,tenant_status text,tenant_active boolean,update_date timestamptz) language sql stable security invoker set search_path='' as $$select * from private.get_tenant_settings_impl(target_tenant_id)$$;
create or replace function public.update_tenant_organisation(target_tenant_id uuid,target_name text) returns table(tenant_id uuid,tenant_name text,update_date timestamptz) language sql security invoker set search_path='' as $$select * from private.update_tenant_organisation_impl(target_tenant_id,target_name)$$;
create or replace function public.list_tenant_members(target_tenant_id uuid) returns table(membership_id uuid,user_id uuid,first_name text,last_name text,email text,role text,status text,create_date timestamptz,update_date timestamptz) language sql stable security invoker set search_path='' as $$select * from private.list_tenant_members_impl(target_tenant_id)$$;
create or replace function public.list_tenant_invitations(target_tenant_id uuid) returns table(invitation_id uuid,email text,role text,status text,invite_date timestamptz,expiry_date timestamptz,delivery_status text,delivery_date timestamptz) language sql security invoker set search_path='' as $$select * from private.list_tenant_invitations_impl(target_tenant_id)$$;
create or replace function public.create_tenant_invitation(target_tenant_id uuid,target_email text,target_role text,target_token_hash text) returns table(invitation_id uuid,email text,role text,expiry_date timestamptz) language sql security invoker set search_path='' as $$select * from private.create_tenant_invitation_impl(target_tenant_id,target_email,target_role,target_token_hash)$$;
create or replace function public.resend_tenant_invitation(target_invitation_id uuid,target_token_hash text) returns table(invitation_id uuid,email text,role text,expiry_date timestamptz) language sql security invoker set search_path='' as $$select * from private.resend_tenant_invitation_impl(target_invitation_id,target_token_hash)$$;
create or replace function public.record_tenant_invitation_delivery(target_invitation_id uuid,target_status text,target_error_code text default null) returns void language sql security invoker set search_path='' as $$select private.record_tenant_invitation_delivery_impl(target_invitation_id,target_status,target_error_code)$$;
create or replace function public.revoke_tenant_invitation(target_invitation_id uuid) returns void language sql security invoker set search_path='' as $$select private.revoke_tenant_invitation_impl(target_invitation_id)$$;
create or replace function public.get_tenant_invitation_context(target_token_hash text) returns table(tenant_name text,role text,expiry_date timestamptz) language sql stable security invoker set search_path='' as $$select * from private.get_tenant_invitation_context_impl(target_token_hash)$$;
create or replace function public.accept_tenant_invitation(target_token_hash text) returns table(tenant_id uuid,membership_id uuid) language sql security invoker set search_path='' as $$select * from private.accept_tenant_invitation_impl(target_token_hash)$$;
create or replace function public.change_tenant_member_role(target_membership_id uuid,target_role text) returns void language sql security invoker set search_path='' as $$select private.change_tenant_member_role_impl(target_membership_id,target_role)$$;
create or replace function public.revoke_tenant_member(target_membership_id uuid) returns void language sql security invoker set search_path='' as $$select private.revoke_tenant_member_impl(target_membership_id)$$;
create or replace function public.list_manageable_questionnaire_versions(target_tenant_id uuid) returns table(questionnaire_version_id uuid,questionnaire_name text,version_number integer,effective_from date,effective_to date) language sql stable security invoker set search_path='' as $$select * from private.list_manageable_questionnaire_versions_impl(target_tenant_id)$$;
create or replace function public.list_tenant_settings_periods(target_tenant_id uuid) returns table(period_id uuid,period_name text,period_year integer,stored_status text,display_status text,open_date date,close_date date,questionnaire_version_id uuid,questionnaire_name text,questionnaire_version integer,submission_count bigint) language sql stable security invoker set search_path='' as $$select * from private.list_tenant_settings_periods_impl(target_tenant_id)$$;
create or replace function public.create_tenant_submission_period(target_tenant_id uuid,target_name text,target_year integer,target_open_date date,target_close_date date,target_questionnaire_version_id uuid,target_status text) returns table(period_id uuid) language sql security invoker set search_path='' as $$select * from private.create_tenant_submission_period_impl(target_tenant_id,target_name,target_year,target_open_date,target_close_date,target_questionnaire_version_id,target_status)$$;
create or replace function public.update_tenant_submission_period(target_period_id uuid,target_name text,target_year integer,target_open_date date,target_close_date date,target_questionnaire_version_id uuid,target_status text) returns void language sql security invoker set search_path='' as $$select private.update_tenant_submission_period_impl(target_period_id,target_name,target_year,target_open_date,target_close_date,target_questionnaire_version_id,target_status)$$;
create or replace function public.delete_tenant_submission_period(target_period_id uuid) returns void language sql security invoker set search_path='' as $$select private.delete_tenant_submission_period_impl(target_period_id)$$;
create or replace function public.list_tenant_fsp_relationships(target_tenant_id uuid,search_query text,page_number integer,page_size integer) returns table(tenant_fsp_id uuid,fsp_id uuid,fsp_number text,registered_name text,trade_name text,regulatory_status text,broker_reference text,relationship_status text,link_date timestamptz,delink_date timestamptz,submission_count bigint,total_count bigint) language sql stable security invoker set search_path='' as $$select * from private.list_tenant_fsp_relationships_impl(target_tenant_id,search_query,page_number,page_size)$$;
create or replace function public.search_fsps_for_tenant_link(target_tenant_id uuid,search_query text,result_limit integer default 10) returns table(fsp_id uuid,fsp_number text,registered_name text,trade_name text,regulatory_status text,relationship_id uuid,relationship_status text) language sql stable security invoker set search_path='' as $$select * from private.search_fsps_for_tenant_link_impl(target_tenant_id,search_query,result_limit)$$;
create or replace function public.link_tenant_fsp(target_tenant_id uuid,target_fsp_id uuid,target_broker_reference text default null) returns table(tenant_fsp_id uuid,relationship_status text) language sql security invoker set search_path='' as $$select * from private.link_tenant_fsp_impl(target_tenant_id,target_fsp_id,target_broker_reference)$$;
create or replace function public.update_tenant_fsp_relationship(target_tenant_fsp_id uuid,target_broker_reference text default null) returns void language sql security invoker set search_path='' as $$select private.update_tenant_fsp_relationship_impl(target_tenant_fsp_id,target_broker_reference)$$;
create or replace function public.delink_tenant_fsp(target_tenant_fsp_id uuid) returns void language sql security invoker set search_path='' as $$select private.delink_tenant_fsp_impl(target_tenant_fsp_id)$$;

revoke all on function public.get_tenant_settings(uuid),public.update_tenant_organisation(uuid,text),public.list_tenant_members(uuid),
  public.list_tenant_invitations(uuid),public.create_tenant_invitation(uuid,text,text,text),public.resend_tenant_invitation(uuid,text),
  public.record_tenant_invitation_delivery(uuid,text,text),public.revoke_tenant_invitation(uuid),public.get_tenant_invitation_context(text),
  public.accept_tenant_invitation(text),public.change_tenant_member_role(uuid,text),public.revoke_tenant_member(uuid),
  public.list_manageable_questionnaire_versions(uuid),public.list_tenant_settings_periods(uuid),
  public.create_tenant_submission_period(uuid,text,integer,date,date,uuid,text),public.update_tenant_submission_period(uuid,text,integer,date,date,uuid,text),
  public.delete_tenant_submission_period(uuid),public.list_tenant_fsp_relationships(uuid,text,integer,integer),
  public.search_fsps_for_tenant_link(uuid,text,integer),public.link_tenant_fsp(uuid,uuid,text),
  public.update_tenant_fsp_relationship(uuid,text),public.delink_tenant_fsp(uuid)
from public,anon;
grant execute on function public.get_tenant_settings(uuid),public.update_tenant_organisation(uuid,text),public.list_tenant_members(uuid),
  public.list_tenant_invitations(uuid),public.create_tenant_invitation(uuid,text,text,text),public.resend_tenant_invitation(uuid,text),
  public.record_tenant_invitation_delivery(uuid,text,text),public.revoke_tenant_invitation(uuid),public.change_tenant_member_role(uuid,text),
  public.revoke_tenant_member(uuid),public.list_manageable_questionnaire_versions(uuid),public.list_tenant_settings_periods(uuid),
  public.create_tenant_submission_period(uuid,text,integer,date,date,uuid,text),public.update_tenant_submission_period(uuid,text,integer,date,date,uuid,text),
  public.delete_tenant_submission_period(uuid),public.list_tenant_fsp_relationships(uuid,text,integer,integer),
  public.search_fsps_for_tenant_link(uuid,text,integer),public.link_tenant_fsp(uuid,uuid,text),
  public.update_tenant_fsp_relationship(uuid,text),public.delink_tenant_fsp(uuid),public.accept_tenant_invitation(text)
to authenticated;
grant execute on function public.get_tenant_invitation_context(text) to anon,authenticated;

grant execute on function private.get_tenant_settings_impl(uuid),private.update_tenant_organisation_impl(uuid,text),
  private.list_tenant_members_impl(uuid),private.list_tenant_invitations_impl(uuid),private.create_tenant_invitation_impl(uuid,text,text,text),
  private.resend_tenant_invitation_impl(uuid,text),private.record_tenant_invitation_delivery_impl(uuid,text,text),
  private.revoke_tenant_invitation_impl(uuid),private.get_tenant_invitation_context_impl(text),private.accept_tenant_invitation_impl(text),
  private.change_tenant_member_role_impl(uuid,text),private.revoke_tenant_member_impl(uuid),
  private.list_manageable_questionnaire_versions_impl(uuid),private.list_tenant_settings_periods_impl(uuid),
  private.create_tenant_submission_period_impl(uuid,text,integer,date,date,uuid,text),
  private.update_tenant_submission_period_impl(uuid,text,integer,date,date,uuid,text),private.delete_tenant_submission_period_impl(uuid),
  private.list_tenant_fsp_relationships_impl(uuid,text,integer,integer),private.search_fsps_for_tenant_link_impl(uuid,text,integer),
  private.link_tenant_fsp_impl(uuid,uuid,text),private.update_tenant_fsp_relationship_impl(uuid,text),private.delink_tenant_fsp_impl(uuid)
to authenticated;
grant execute on function private.get_tenant_invitation_context_impl(text) to anon;
revoke all on function private.is_active_tenant_admin(uuid,uuid),private.validate_period_questionnaire(uuid,uuid) from public,anon,authenticated;

comment on table public.tenant_invitations is 'Tenant-scoped, single-use invitations. Only SHA-256 token digests are persisted.';
comment on function private.is_active_tenant_admin(uuid,uuid) is 'RLS-safe active tenant administrator predicate; private schema is not Data API exposed.';
comment on function public.update_tenant_organisation(uuid,text) is 'Allowlisted tenant profile update: organisation name only.';
comment on function public.change_tenant_member_role(uuid,text) is 'Atomic role change that locks the tenant row and preserves the final active administrator invariant.';
comment on function public.revoke_tenant_member(uuid) is 'Soft-removes tenant access without deleting the shared Auth user or profile.';
comment on function public.list_tenant_settings_periods(uuid) is 'Tenant-admin period list with deterministic derived display lifecycle.';
comment on function public.link_tenant_fsp(uuid,uuid,text) is 'Links or relinks one global FSP without creating FSP user access.';
