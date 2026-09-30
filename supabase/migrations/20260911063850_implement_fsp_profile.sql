-- Prompt 08: trusted, allowlisted administration of persistent FSP master data.

alter table public.addresses
  add constraint addresses_type_check
  check (address_type in ('BUSINESS', 'POSTAL', 'REGISTERED'));

alter table public.addresses
  add constraint addresses_za_postal_code_check
  check (country_code <> 'ZA' or postal_code is null or postal_code ~ '^[0-9]{4}$');

alter table public.contacts
  add constraint contacts_email_format_check
  check (email is null or email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$');

create or replace function private.update_fsp_profile_impl(
  target_fsp_id uuid,
  target_trade_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  current_trade_name text;
  normalized_trade_name text := nullif(btrim(target_trade_name), '');
begin
  perform 1 from public.fsps f where f.id = target_fsp_id for update;
  if not found then raise exception 'FSP unavailable' using errcode = 'P0002'; end if;
  if actor_id is null or not private.is_active_fsp_admin(target_fsp_id, actor_id) then
    raise exception 'FSP administration denied' using errcode = '42501';
  end if;
  if normalized_trade_name is not null and length(normalized_trade_name) > 255 then
    raise exception 'Trading name is too long' using errcode = '22023';
  end if;

  select f.trade_name into current_trade_name from public.fsps f where f.id = target_fsp_id;
  if current_trade_name is distinct from normalized_trade_name then
    update public.fsps f set trade_name = normalized_trade_name where f.id = target_fsp_id;
    insert into public.audit_events(fsp_id,actor_user_id,event_type,entity_type,entity_id,metadata)
      values(target_fsp_id,actor_id,'FSP_PROFILE_UPDATED','FSP',target_fsp_id,
        jsonb_build_object('changed_fields',jsonb_build_array('trade_name')));
  end if;
end;
$$;

create or replace function private.save_fsp_address_impl(
  target_fsp_id uuid,
  target_address_id uuid,
  target_address_type text,
  target_line_1 text,
  target_line_2 text,
  target_suburb text,
  target_city text,
  target_province text,
  target_postal_code text,
  target_country_code text,
  target_primary boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  saved_id uuid;
  existing public.addresses;
  normalized_type text := upper(btrim(target_address_type));
  normalized_country text := upper(btrim(target_country_code));
  cleared_count integer := 0;
  event_name text;
begin
  perform 1 from public.fsps f where f.id = target_fsp_id for update;
  if not found then raise exception 'FSP unavailable' using errcode = 'P0002'; end if;
  if actor_id is null or not private.is_active_fsp_admin(target_fsp_id, actor_id) then
    raise exception 'FSP administration denied' using errcode = '42501';
  end if;
  if normalized_type not in ('BUSINESS','POSTAL','REGISTERED') then
    raise exception 'Unsupported address type' using errcode = '22023';
  end if;
  if nullif(btrim(target_line_1),'') is null or length(btrim(target_line_1)) > 255
    or nullif(btrim(target_city),'') is null or length(btrim(target_city)) > 120
    or length(coalesce(nullif(btrim(target_line_2),''),'')) > 255
    or length(coalesce(nullif(btrim(target_suburb),''),'')) > 120
    or length(coalesce(nullif(btrim(target_province),''),'')) > 120
    or length(coalesce(nullif(btrim(target_postal_code),''),'')) > 20
    or normalized_country !~ '^[A-Z]{2}$'
  then raise exception 'Invalid address values' using errcode = '22023'; end if;
  if normalized_country = 'ZA' and nullif(btrim(target_postal_code),'') is not null
    and btrim(target_postal_code) !~ '^[0-9]{4}$'
  then raise exception 'South African postal codes must contain four digits' using errcode = '22023'; end if;

  if target_address_id is not null then
    select a.* into existing from public.addresses a
      where a.id = target_address_id and a.fsp_id = target_fsp_id and a.active for update;
    if not found then raise exception 'Address unavailable' using errcode = 'P0002'; end if;
    saved_id := existing.id;
    event_name := 'FSP_ADDRESS_UPDATED';
  else
    saved_id := gen_random_uuid();
    event_name := 'FSP_ADDRESS_ADDED';
  end if;

  if target_primary then
    update public.addresses a set "primary" = false
      where a.fsp_id = target_fsp_id and a.address_type = normalized_type
        and a.active and a."primary" and a.id <> saved_id;
    get diagnostics cleared_count = row_count;
  end if;

  if target_address_id is null then
    insert into public.addresses(
      id,fsp_id,address_type,line_1,line_2,suburb,city,province,postal_code,country_code,"primary",active
    ) values(
      saved_id,target_fsp_id,normalized_type,btrim(target_line_1),nullif(btrim(target_line_2),''),
      nullif(btrim(target_suburb),''),btrim(target_city),nullif(btrim(target_province),''),
      nullif(btrim(target_postal_code),''),normalized_country,target_primary,true
    );
  else
    update public.addresses a set
      address_type=normalized_type,line_1=btrim(target_line_1),line_2=nullif(btrim(target_line_2),''),
      suburb=nullif(btrim(target_suburb),''),city=btrim(target_city),province=nullif(btrim(target_province),''),
      postal_code=nullif(btrim(target_postal_code),''),country_code=normalized_country,"primary"=target_primary
    where a.id=saved_id;
  end if;

  insert into public.audit_events(fsp_id,actor_user_id,event_type,entity_type,entity_id)
    values(target_fsp_id,actor_id,event_name,'FSP_ADDRESS',saved_id);
  if cleared_count > 0 then
    insert into public.audit_events(fsp_id,actor_user_id,event_type,entity_type,entity_id,metadata)
      values(target_fsp_id,actor_id,'FSP_PRIMARY_ADDRESS_CHANGED','FSP_ADDRESS',saved_id,
        jsonb_build_object('address_type',normalized_type));
  end if;
  return saved_id;
end;
$$;

create or replace function private.remove_fsp_address_impl(target_fsp_id uuid,target_address_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); affected integer;
begin
  perform 1 from public.fsps f where f.id=target_fsp_id for update;
  if actor_id is null or not private.is_active_fsp_admin(target_fsp_id,actor_id) then
    raise exception 'FSP administration denied' using errcode='42501'; end if;
  update public.addresses a set active=false,"primary"=false
    where a.id=target_address_id and a.fsp_id=target_fsp_id and a.active;
  get diagnostics affected=row_count;
  if affected=0 then raise exception 'Address unavailable' using errcode='P0002'; end if;
  insert into public.audit_events(fsp_id,actor_user_id,event_type,entity_type,entity_id)
    values(target_fsp_id,actor_id,'FSP_ADDRESS_REMOVED','FSP_ADDRESS',target_address_id);
end; $$;

create or replace function private.save_fsp_contact_impl(
  target_fsp_id uuid,target_contact_id uuid,target_first_name text,target_last_name text,
  target_job_title text,target_email text,target_contact_number text,target_primary boolean
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid:=auth.uid(); saved_id uuid; existing public.contacts; cleared_count integer:=0; event_name text;
  normalized_email text:=nullif(lower(btrim(target_email)),'');
begin
  perform 1 from public.fsps f where f.id=target_fsp_id for update;
  if not found then raise exception 'FSP unavailable' using errcode='P0002'; end if;
  if actor_id is null or not private.is_active_fsp_admin(target_fsp_id,actor_id) then
    raise exception 'FSP administration denied' using errcode='42501'; end if;
  if nullif(btrim(target_first_name),'') is null or length(btrim(target_first_name))>120
    or nullif(btrim(target_last_name),'') is null or length(btrim(target_last_name))>120
    or length(coalesce(nullif(btrim(target_job_title),''),''))>160
    or length(coalesce(normalized_email,''))>320
    or length(coalesce(nullif(btrim(target_contact_number),''),''))>40
    or (normalized_email is not null and normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
    or (nullif(btrim(target_contact_number),'') is not null and btrim(target_contact_number) !~ '^[0-9+() .xX-]{5,40}$')
  then raise exception 'Invalid contact values' using errcode='22023'; end if;

  if target_contact_id is not null then
    select c.* into existing from public.contacts c
      where c.id=target_contact_id and c.fsp_id=target_fsp_id and c.active for update;
    if not found then raise exception 'Contact unavailable' using errcode='P0002'; end if;
    saved_id:=existing.id; event_name:='FSP_CONTACT_UPDATED';
  else saved_id:=gen_random_uuid(); event_name:='FSP_CONTACT_ADDED'; end if;

  if target_primary then
    update public.contacts c set "primary"=false
      where c.fsp_id=target_fsp_id and c.active and c."primary" and c.id<>saved_id;
    get diagnostics cleared_count=row_count;
  end if;
  if target_contact_id is null then
    insert into public.contacts(id,fsp_id,first_name,last_name,job_title,email,contact_number,"primary",active)
      values(saved_id,target_fsp_id,btrim(target_first_name),btrim(target_last_name),
        nullif(btrim(target_job_title),''),normalized_email,nullif(btrim(target_contact_number),''),target_primary,true);
  else
    update public.contacts c set first_name=btrim(target_first_name),last_name=btrim(target_last_name),
      job_title=nullif(btrim(target_job_title),''),email=normalized_email,
      contact_number=nullif(btrim(target_contact_number),''),"primary"=target_primary
    where c.id=saved_id;
  end if;
  insert into public.audit_events(fsp_id,actor_user_id,event_type,entity_type,entity_id)
    values(target_fsp_id,actor_id,event_name,'FSP_CONTACT',saved_id);
  if cleared_count>0 then
    insert into public.audit_events(fsp_id,actor_user_id,event_type,entity_type,entity_id)
      values(target_fsp_id,actor_id,'FSP_PRIMARY_CONTACT_CHANGED','FSP_CONTACT',saved_id);
  end if;
  return saved_id;
end; $$;

create or replace function private.remove_fsp_contact_impl(target_fsp_id uuid,target_contact_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid:=auth.uid(); affected integer;
begin
  perform 1 from public.fsps f where f.id=target_fsp_id for update;
  if actor_id is null or not private.is_active_fsp_admin(target_fsp_id,actor_id) then
    raise exception 'FSP administration denied' using errcode='42501'; end if;
  update public.contacts c set active=false,"primary"=false
    where c.id=target_contact_id and c.fsp_id=target_fsp_id and c.active;
  get diagnostics affected=row_count;
  if affected=0 then raise exception 'Contact unavailable' using errcode='P0002'; end if;
  insert into public.audit_events(fsp_id,actor_user_id,event_type,entity_type,entity_id)
    values(target_fsp_id,actor_id,'FSP_CONTACT_REMOVED','FSP_CONTACT',target_contact_id);
end; $$;

revoke all on function private.update_fsp_profile_impl(uuid,text),
  private.save_fsp_address_impl(uuid,uuid,text,text,text,text,text,text,text,text,boolean),
  private.remove_fsp_address_impl(uuid,uuid),
  private.save_fsp_contact_impl(uuid,uuid,text,text,text,text,text,boolean),
  private.remove_fsp_contact_impl(uuid,uuid)
from public,anon,authenticated;
grant execute on function private.update_fsp_profile_impl(uuid,text),
  private.save_fsp_address_impl(uuid,uuid,text,text,text,text,text,text,text,text,boolean),
  private.remove_fsp_address_impl(uuid,uuid),
  private.save_fsp_contact_impl(uuid,uuid,text,text,text,text,text,boolean),
  private.remove_fsp_contact_impl(uuid,uuid)
to authenticated;

create function public.update_fsp_profile(target_fsp_id uuid,target_trade_name text)
returns void language sql security invoker set search_path='' as
  $$ select private.update_fsp_profile_impl(target_fsp_id,target_trade_name); $$;
create function public.save_fsp_address(
  target_fsp_id uuid,target_address_id uuid,target_address_type text,target_line_1 text,target_line_2 text,
  target_suburb text,target_city text,target_province text,target_postal_code text,target_country_code text,target_primary boolean
) returns uuid language sql security invoker set search_path='' as
  $$ select private.save_fsp_address_impl(target_fsp_id,target_address_id,target_address_type,target_line_1,target_line_2,target_suburb,target_city,target_province,target_postal_code,target_country_code,target_primary); $$;
create function public.remove_fsp_address(target_fsp_id uuid,target_address_id uuid)
returns void language sql security invoker set search_path='' as
  $$ select private.remove_fsp_address_impl(target_fsp_id,target_address_id); $$;
create function public.save_fsp_contact(
  target_fsp_id uuid,target_contact_id uuid,target_first_name text,target_last_name text,target_job_title text,
  target_email text,target_contact_number text,target_primary boolean
) returns uuid language sql security invoker set search_path='' as
  $$ select private.save_fsp_contact_impl(target_fsp_id,target_contact_id,target_first_name,target_last_name,target_job_title,target_email,target_contact_number,target_primary); $$;
create function public.remove_fsp_contact(target_fsp_id uuid,target_contact_id uuid)
returns void language sql security invoker set search_path='' as
  $$ select private.remove_fsp_contact_impl(target_fsp_id,target_contact_id); $$;

revoke all on function public.update_fsp_profile(uuid,text),
  public.save_fsp_address(uuid,uuid,text,text,text,text,text,text,text,text,boolean),
  public.remove_fsp_address(uuid,uuid),
  public.save_fsp_contact(uuid,uuid,text,text,text,text,text,boolean),
  public.remove_fsp_contact(uuid,uuid)
from public,anon,authenticated;
grant execute on function public.update_fsp_profile(uuid,text),
  public.save_fsp_address(uuid,uuid,text,text,text,text,text,text,text,text,boolean),
  public.remove_fsp_address(uuid,uuid),
  public.save_fsp_contact(uuid,uuid,text,text,text,text,text,boolean),
  public.remove_fsp_contact(uuid,uuid)
to authenticated;

comment on function public.update_fsp_profile(uuid,text) is
  'Allowlisted FSP-admin update surface. Regulatory identity, status, source and relationship fields are not accepted.';
