-- Prompt 07: FSP-scoped user administration and secure application invitations.

alter table public.fsp_users
  add column revoked_date timestamptz,
  add column revoked_by uuid references public.profiles(id) on delete restrict,
  add constraint fsp_users_revocation_pair check (
    (revoked_date is null and revoked_by is null)
    or (revoked_date is not null and revoked_by is not null)
  );

create index fsp_users_fsp_status_role_idx
  on public.fsp_users (fsp_id, status, role);

create table public.fsp_invitations (
  id uuid primary key default gen_random_uuid(),
  fsp_id uuid not null references public.fsps(id) on delete restrict,
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
  constraint fsp_invitations_email_normalized check (
    email_normalized = lower(btrim(email)) and email_normalized = btrim(email_normalized)
  ),
  constraint fsp_invitations_role check (role in ('ADMIN', 'SUBMITTER', 'VIEWER')),
  constraint fsp_invitations_status check (status in ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED')),
  constraint fsp_invitations_token_hash check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint fsp_invitations_delivery_status check (delivery_status in ('PENDING', 'SENT', 'CAPTURED', 'FAILED')),
  constraint fsp_invitations_expiry check (expiry_date > invite_date),
  constraint fsp_invitations_acceptance_pair check (
    (accepted_date is null and accepted_by is null) or
    (accepted_date is not null and accepted_by is not null)
  ),
  constraint fsp_invitations_revocation_pair check (
    (revoked_date is null and revoked_by is null) or
    (revoked_date is not null and revoked_by is not null)
  )
);

create unique index fsp_invitations_one_pending_email_idx
  on public.fsp_invitations (fsp_id, email_normalized)
  where status = 'PENDING';
create index fsp_invitations_fsp_status_idx on public.fsp_invitations (fsp_id, status, invite_date desc);
create index fsp_invitations_expiry_idx on public.fsp_invitations (expiry_date) where status = 'PENDING';

create trigger fsp_invitations_set_update_date before update on public.fsp_invitations
for each row execute function private.set_update_date();

alter table public.fsp_invitations enable row level security;
alter table public.fsp_invitations force row level security;
revoke all on table public.fsp_invitations from public, anon, authenticated;
grant all on table public.fsp_invitations to service_role;

create or replace function private.is_active_fsp_admin(target_fsp_id uuid, actor_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.fsp_users fu
    where fu.fsp_id = target_fsp_id and fu.user_id = actor_id
      and fu.status = 'ACTIVE' and fu.role = 'ADMIN'
  );
$$;
revoke all on function private.is_active_fsp_admin(uuid, uuid) from public, anon, authenticated;

create or replace function public.list_fsp_members(target_fsp_id uuid)
returns table (
  membership_id uuid, user_id uuid, first_name varchar, last_name varchar, email varchar,
  role varchar, status varchar, is_primary boolean, create_date timestamptz, update_date timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
declare actor_id uuid := auth.uid();
begin
  if actor_id is null or not exists (
    select 1 from public.fsp_users fu
    where fu.fsp_id = target_fsp_id and fu.user_id = actor_id and fu.status = 'ACTIVE'
  ) then raise exception 'FSP access denied' using errcode = '42501'; end if;
  return query
    select fu.id, fu.user_id, p.first_name, p.last_name, au.email::varchar,
      fu.role, fu.status, fu."primary", fu.create_date, fu.update_date
    from public.fsp_users fu
    join public.profiles p on p.id = fu.user_id
    join auth.users au on au.id = fu.user_id
    where fu.fsp_id = target_fsp_id and fu.status <> 'REVOKED'
    order by lower(p.first_name), lower(p.last_name), lower(au.email);
end; $$;

create or replace function public.list_fsp_invitations(target_fsp_id uuid)
returns table (
  invitation_id uuid, email varchar, role varchar, status varchar, invite_date timestamptz,
  expiry_date timestamptz, delivery_status varchar, delivery_date timestamptz
)
language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid();
begin
  if actor_id is null or not private.is_active_fsp_admin(target_fsp_id, actor_id)
    then raise exception 'FSP administration denied' using errcode = '42501'; end if;
  update public.fsp_invitations set status = 'EXPIRED'
    where fsp_id = target_fsp_id and status = 'PENDING' and expiry_date <= now();
  return query select i.id, i.email, i.role, i.status, i.invite_date, i.expiry_date,
    i.delivery_status, i.delivery_date
    from public.fsp_invitations i where i.fsp_id = target_fsp_id
    order by i.invite_date desc;
end; $$;

create or replace function public.create_fsp_invitation(
  target_fsp_id uuid, target_email text, target_role text, target_token_hash text
)
returns table (invitation_id uuid, email varchar, role varchar, expiry_date timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := auth.uid(); normalized text := lower(btrim(target_email)); created public.fsp_invitations;
begin
  perform 1 from public.fsps where id = target_fsp_id and status = 'ACTIVE' for update;
  if not found then raise exception 'FSP is unavailable' using errcode = 'P0002'; end if;
  if actor_id is null or not private.is_active_fsp_admin(target_fsp_id, actor_id)
    then raise exception 'FSP administration denied' using errcode = '42501'; end if;
  if normalized = '' or length(normalized) > 320 or normalized !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    then raise exception 'A valid email address is required' using errcode = '22023'; end if;
  if target_role not in ('ADMIN','SUBMITTER','VIEWER') or target_token_hash !~ '^[0-9a-f]{64}$'
    then raise exception 'Invalid invitation values' using errcode = '22023'; end if;
  update public.fsp_invitations set status = 'EXPIRED'
    where fsp_id = target_fsp_id and email_normalized = normalized
      and status = 'PENDING' and expiry_date <= now();
  if exists (
    select 1 from public.fsp_users fu join auth.users au on au.id = fu.user_id
    where fu.fsp_id = target_fsp_id and fu.status = 'ACTIVE' and lower(au.email) = normalized
  ) then raise exception 'This user already has active access' using errcode = '23505'; end if;
  insert into public.fsp_invitations (
    fsp_id,email,email_normalized,role,token_hash,invited_by,expiry_date
  ) values (
    target_fsp_id,btrim(target_email),normalized,target_role,target_token_hash,actor_id,now()+interval '7 days'
  ) returning * into created;
  insert into public.audit_events (fsp_id,actor_user_id,event_type,entity_type,entity_id,metadata)
    values (target_fsp_id,actor_id,'FSP_USER_INVITED','FSP_INVITATION',created.id,jsonb_build_object('role',target_role));
  return query select created.id, created.email, created.role, created.expiry_date;
exception when unique_violation then
  raise exception 'A pending invitation already exists' using errcode = '23505';
end; $$;

create or replace function public.resend_fsp_invitation(target_invitation_id uuid, target_token_hash text)
returns table (invitation_id uuid, email varchar, role varchar, expiry_date timestamptz)
language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); current_row public.fsp_invitations;
begin
  select * into current_row from public.fsp_invitations where id = target_invitation_id for update;
  if not found then raise exception 'Invitation unavailable' using errcode = 'P0002'; end if;
  perform 1 from public.fsps where id = current_row.fsp_id for update;
  if actor_id is null or not private.is_active_fsp_admin(current_row.fsp_id, actor_id)
    then raise exception 'FSP administration denied' using errcode = '42501'; end if;
  if current_row.status <> 'PENDING' or current_row.expiry_date <= now()
    then raise exception 'Invitation unavailable' using errcode = '55000'; end if;
  if target_token_hash !~ '^[0-9a-f]{64}$'
    then raise exception 'Invalid invitation values' using errcode = '22023'; end if;
  update public.fsp_invitations set token_hash=target_token_hash, invite_date=now(),
    expiry_date=now()+interval '7 days', delivery_status='PENDING', delivery_date=null, delivery_error_code=null
    where id=target_invitation_id returning * into current_row;
  insert into public.audit_events (fsp_id,actor_user_id,event_type,entity_type,entity_id)
    values(current_row.fsp_id,actor_id,'FSP_INVITATION_RESENT','FSP_INVITATION',current_row.id);
  return query select current_row.id,current_row.email,current_row.role,current_row.expiry_date;
end; $$;

create or replace function public.record_fsp_invitation_delivery(
  target_invitation_id uuid, target_status text, target_error_code text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_fsp_id uuid;
begin
  select fsp_id into target_fsp_id from public.fsp_invitations where id=target_invitation_id for update;
  if actor_id is null or not private.is_active_fsp_admin(target_fsp_id,actor_id)
    then raise exception 'FSP administration denied' using errcode='42501'; end if;
  if target_status not in ('SENT','CAPTURED','FAILED') then raise exception 'Invalid delivery state' using errcode='22023'; end if;
  update public.fsp_invitations set delivery_status=target_status, delivery_date=now(),
    delivery_error_code=case when target_status='FAILED' then left(target_error_code,80) else null end
    where id=target_invitation_id;
end; $$;

create or replace function public.revoke_fsp_invitation(target_invitation_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); row_data public.fsp_invitations;
begin
  select * into row_data from public.fsp_invitations where id=target_invitation_id for update;
  if not found or actor_id is null or not private.is_active_fsp_admin(row_data.fsp_id,actor_id)
    then raise exception 'Invitation unavailable' using errcode='42501'; end if;
  if row_data.status <> 'PENDING' then raise exception 'Invitation unavailable' using errcode='55000'; end if;
  update public.fsp_invitations set status='REVOKED',revoked_date=now(),revoked_by=actor_id where id=row_data.id;
  insert into public.audit_events(fsp_id,actor_user_id,event_type,entity_type,entity_id)
    values(row_data.fsp_id,actor_id,'FSP_INVITATION_REVOKED','FSP_INVITATION',row_data.id);
end; $$;

create or replace function public.get_fsp_invitation_context(target_token_hash text)
returns table (fsp_name varchar, fsp_number varchar, role varchar, expiry_date timestamptz)
language sql stable security definer set search_path = '' as $$
  select f.registered_name,f.fsp_number,i.role,i.expiry_date
  from public.fsp_invitations i join public.fsps f on f.id=i.fsp_id
  where i.token_hash=target_token_hash and i.status='PENDING' and i.expiry_date>now() and f.status='ACTIVE'
    and target_token_hash ~ '^[0-9a-f]{64}$'
  limit 1;
$$;

create or replace function public.accept_fsp_invitation(target_token_hash text)
returns table (fsp_id uuid, membership_id uuid)
language plpgsql security definer set search_path = '' as $$
declare actor_id uuid:=auth.uid(); actor_email text; row_data public.fsp_invitations; member_id uuid;
begin
  if actor_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select lower(email) into actor_email from auth.users where id=actor_id and email_confirmed_at is not null;
  if actor_email is null then raise exception 'A verified email is required' using errcode='42501'; end if;
  select * into row_data from public.fsp_invitations where token_hash=target_token_hash for update;
  if not found or row_data.status<>'PENDING' or row_data.expiry_date<=now()
    then raise exception 'Invitation unavailable' using errcode='P0002'; end if;
  perform 1 from public.fsps where id=row_data.fsp_id and status='ACTIVE' for update;
  if not found then raise exception 'Invitation unavailable' using errcode='P0002'; end if;
  if actor_email<>row_data.email_normalized then raise exception 'Invitation unavailable' using errcode='42501'; end if;
  insert into public.fsp_users(fsp_id,user_id,role,status,"primary",verified_date,verified_by)
    values(row_data.fsp_id,actor_id,row_data.role,'ACTIVE',false,now(),actor_id)
    on conflict(fsp_id,user_id) do update set role=excluded.role,status='ACTIVE',"primary"=false,
      verified_date=now(),verified_by=actor_id,revoked_date=null,revoked_by=null
    returning id into member_id;
  update public.fsp_invitations set status='ACCEPTED',accepted_date=now(),accepted_by=actor_id where id=row_data.id;
  insert into public.audit_events(fsp_id,actor_user_id,event_type,entity_type,entity_id,metadata)
    values(row_data.fsp_id,actor_id,'FSP_INVITATION_ACCEPTED','FSP_USER',member_id,jsonb_build_object('role',row_data.role));
  return query select row_data.fsp_id,member_id;
end; $$;

create or replace function public.change_fsp_member_role(target_membership_id uuid,target_role text)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid:=auth.uid(); row_data public.fsp_users; old_role text;
begin
  select * into row_data from public.fsp_users where id=target_membership_id;
  if not found or target_role not in ('ADMIN','SUBMITTER','VIEWER') then raise exception 'Invalid membership operation' using errcode='22023'; end if;
  perform 1 from public.fsps where id=row_data.fsp_id for update;
  if actor_id is null or not private.is_active_fsp_admin(row_data.fsp_id,actor_id)
    then raise exception 'FSP administration denied' using errcode='42501'; end if;
  select role into old_role from public.fsp_users where id=target_membership_id for update;
  if row_data.status<>'ACTIVE' then raise exception 'Membership is not active' using errcode='55000'; end if;
  if old_role='ADMIN' and target_role<>'ADMIN' and
    (select count(*) from public.fsp_users where fsp_id=row_data.fsp_id and role='ADMIN' and status='ACTIVE')<=1
    then raise exception 'The final active administrator cannot be changed' using errcode='55000'; end if;
  update public.fsp_users set role=target_role where id=target_membership_id;
  insert into public.audit_events(fsp_id,actor_user_id,event_type,entity_type,entity_id,metadata)
    values(row_data.fsp_id,actor_id,'FSP_USER_ROLE_CHANGED','FSP_USER',row_data.id,jsonb_build_object('old_role',old_role,'new_role',target_role));
end; $$;

create or replace function public.revoke_fsp_member(target_membership_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid:=auth.uid(); row_data public.fsp_users;
begin
  select * into row_data from public.fsp_users where id=target_membership_id;
  if not found then raise exception 'Membership unavailable' using errcode='P0002'; end if;
  perform 1 from public.fsps where id=row_data.fsp_id for update;
  if actor_id is null or not private.is_active_fsp_admin(row_data.fsp_id,actor_id)
    then raise exception 'FSP administration denied' using errcode='42501'; end if;
  select * into row_data from public.fsp_users where id=target_membership_id for update;
  if row_data.status<>'ACTIVE' then raise exception 'Membership is not active' using errcode='55000'; end if;
  if row_data.role='ADMIN' and
    (select count(*) from public.fsp_users where fsp_id=row_data.fsp_id and role='ADMIN' and status='ACTIVE')<=1
    then raise exception 'The final active administrator cannot be revoked' using errcode='55000'; end if;
  update public.fsp_users set status='REVOKED',"primary"=false,revoked_date=now(),revoked_by=actor_id where id=row_data.id;
  insert into public.audit_events(fsp_id,actor_user_id,event_type,entity_type,entity_id,metadata)
    values(row_data.fsp_id,actor_id,'FSP_USER_REVOKED','FSP_USER',row_data.id,jsonb_build_object('role',row_data.role));
end; $$;

revoke all on function public.list_fsp_members(uuid) from public, anon;
revoke all on function public.list_fsp_invitations(uuid) from public, anon;
revoke all on function public.create_fsp_invitation(uuid,text,text,text) from public, anon;
revoke all on function public.resend_fsp_invitation(uuid,text) from public, anon;
revoke all on function public.record_fsp_invitation_delivery(uuid,text,text) from public, anon;
revoke all on function public.revoke_fsp_invitation(uuid) from public, anon;
revoke all on function public.accept_fsp_invitation(text) from public, anon;
revoke all on function public.change_fsp_member_role(uuid,text) from public, anon;
revoke all on function public.revoke_fsp_member(uuid) from public, anon;
grant execute on function public.list_fsp_members(uuid) to authenticated;
grant execute on function public.list_fsp_invitations(uuid) to authenticated;
grant execute on function public.create_fsp_invitation(uuid,text,text,text) to authenticated;
grant execute on function public.resend_fsp_invitation(uuid,text) to authenticated;
grant execute on function public.record_fsp_invitation_delivery(uuid,text,text) to authenticated;
grant execute on function public.revoke_fsp_invitation(uuid) to authenticated;
grant execute on function public.accept_fsp_invitation(text) to authenticated;
grant execute on function public.change_fsp_member_role(uuid,text) to authenticated;
grant execute on function public.revoke_fsp_member(uuid) to authenticated;
revoke all on function public.get_fsp_invitation_context(text) from public;
grant execute on function public.get_fsp_invitation_context(text) to anon, authenticated;

comment on column public.fsp_invitations.token_hash is 'SHA-256 digest of a high-entropy application invitation token. Raw tokens are never persisted.';
comment on function public.get_fsp_invitation_context(text) is 'Returns the same empty result for unknown, expired, revoked, or accepted invitation tokens.';
