-- FSP operational status is represented by the canonical active flag; the source
-- status text contains FSCA vocabulary such as AUTHORISED.
create or replace function public.create_fsp_invitation(
  target_fsp_id uuid, target_email text, target_role text, target_token_hash text
)
returns table (invitation_id uuid, email varchar, role varchar, expiry_date timestamptz)
language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); normalized text := lower(btrim(target_email)); created public.fsp_invitations;
begin
  perform 1 from public.fsps where id = target_fsp_id and active for update;
  if not found then raise exception 'FSP is unavailable' using errcode = 'P0002'; end if;
  if actor_id is null or not private.is_active_fsp_admin(target_fsp_id, actor_id)
    then raise exception 'FSP administration denied' using errcode = '42501'; end if;
  if normalized = '' or length(normalized) > 320 or normalized !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    then raise exception 'A valid email address is required' using errcode = '22023'; end if;
  if target_role not in ('ADMIN','SUBMITTER','VIEWER') or target_token_hash !~ '^[0-9a-f]{64}$'
    then raise exception 'Invalid invitation values' using errcode = '22023'; end if;
  update public.fsp_invitations set status = 'EXPIRED'
    where fsp_id = target_fsp_id and email_normalized = normalized and status = 'PENDING' and expiry_date <= now();
  if exists (
    select 1 from public.fsp_users fu join auth.users au on au.id = fu.user_id
    where fu.fsp_id = target_fsp_id and fu.status = 'ACTIVE' and lower(au.email) = normalized
  ) then raise exception 'This user already has active access' using errcode = '23505'; end if;
  insert into public.fsp_invitations(fsp_id,email,email_normalized,role,token_hash,invited_by,expiry_date)
    values(target_fsp_id,btrim(target_email),normalized,target_role,target_token_hash,actor_id,now()+interval '7 days')
    returning * into created;
  insert into public.audit_events(fsp_id,actor_user_id,event_type,entity_type,entity_id,metadata)
    values(target_fsp_id,actor_id,'FSP_USER_INVITED','FSP_INVITATION',created.id,jsonb_build_object('role',target_role));
  return query select created.id,created.email,created.role,created.expiry_date;
exception when unique_violation then raise exception 'A pending invitation already exists' using errcode='23505';
end; $$;

create or replace function public.accept_fsp_invitation(target_token_hash text)
returns table (fsp_id uuid, membership_id uuid)
language plpgsql security definer set search_path = '' as $$
declare actor_id uuid:=auth.uid(); actor_email text; row_data public.fsp_invitations; member_id uuid;
begin
  if actor_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select lower(email) into actor_email from auth.users where id=actor_id and email_confirmed_at is not null;
  if actor_email is null then raise exception 'A verified email is required' using errcode='42501'; end if;
  select * into row_data from public.fsp_invitations where token_hash=target_token_hash for update;
  if found and row_data.status='ACCEPTED' and row_data.accepted_by=actor_id then
    select id into member_id from public.fsp_users where fsp_id=row_data.fsp_id and user_id=actor_id and status='ACTIVE';
    return query select row_data.fsp_id,member_id;
    return;
  end if;
  if not found or row_data.status<>'PENDING' or row_data.expiry_date<=now()
    then raise exception 'Invitation unavailable' using errcode='P0002'; end if;
  perform 1 from public.fsps where id=row_data.fsp_id and active for update;
  if not found then raise exception 'Invitation unavailable' using errcode='P0002'; end if;
  if actor_email<>row_data.email_normalized then raise exception 'Invitation unavailable' using errcode='42501'; end if;
  insert into public.fsp_users(fsp_id,user_id,role,status,"primary",verified_date,verified_by)
    values(row_data.fsp_id,actor_id,row_data.role,'ACTIVE',false,now(),actor_id)
    on conflict(fsp_id,user_id) do update set role=excluded.role,status='ACTIVE',"primary"=false,
      verified_date=now(),verified_by=actor_id,revoked_date=null,revoked_by=null returning id into member_id;
  update public.fsp_invitations set status='ACCEPTED',accepted_date=now(),accepted_by=actor_id where id=row_data.id;
  insert into public.audit_events(fsp_id,actor_user_id,event_type,entity_type,entity_id,metadata)
    values(row_data.fsp_id,actor_id,'FSP_INVITATION_ACCEPTED','FSP_USER',member_id,jsonb_build_object('role',row_data.role));
  return query select row_data.fsp_id,member_id;
end; $$;

create or replace function public.get_fsp_invitation_context(target_token_hash text)
returns table (fsp_name varchar, fsp_number varchar, role varchar, expiry_date timestamptz)
language sql stable security definer set search_path = '' as $$
  select f.registered_name,f.fsp_number,i.role,i.expiry_date
  from public.fsp_invitations i join public.fsps f on f.id=i.fsp_id
  where i.token_hash=target_token_hash and i.status='PENDING' and i.expiry_date>now() and f.active
    and target_token_hash ~ '^[0-9a-f]{64}$' limit 1;
$$;
