create index fsp_registry_changes_import_idx on public.fsp_registry_changes(import_id);
create index fsp_registry_imports_confirmed_by_idx on public.fsp_registry_imports(confirmed_by) where confirmed_by is not null;
create index fsp_registry_imports_reprocess_of_idx on public.fsp_registry_imports(reprocess_of) where reprocess_of is not null;
create index fsp_registry_imports_started_by_idx on public.fsp_registry_imports(started_by) where started_by is not null;
create index fsp_source_records_source_idx on public.fsp_source_records(source_id);
create index fsps_registry_import_idx on public.fsps(registry_import_id) where registry_import_id is not null;
create index fsps_registry_source_idx on public.fsps(registry_source_id) where registry_source_id is not null;
create index fsps_registry_source_record_idx on public.fsps(registry_source_record_id) where registry_source_record_id is not null;

create schema if not exists registry_private;
revoke all on schema registry_private from public,anon,authenticated;

create or replace function registry_private.get_my_platform_access_impl()
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.platform_memberships pm where pm.user_id=(select auth.uid()) and pm.role='PLATFORM_ADMIN' and pm.status='ACTIVE');
$$;

create or replace function public.get_my_platform_access()
returns boolean language sql stable security invoker set search_path='' as $$
  select registry_private.get_my_platform_access_impl();
$$;

create or replace function registry_private.get_fsp_registry_provenance_impl(target_fsp_id uuid)
returns table(source_code text,source_name text,source_authority text,last_checked_at timestamptz,last_import_id uuid,last_import_status text,registry_updated_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not exists(
    select 1 from public.fsp_users fu where fu.fsp_id=target_fsp_id and fu.user_id=(select auth.uid()) and fu.status='ACTIVE'
    union all
    select 1 from public.tenant_fsps tf join public.tenant_memberships tm on tm.tenant_id=tf.tenant_id
      where tf.fsp_id=target_fsp_id and tf.status='ACTIVE' and tm.user_id=(select auth.uid()) and tm.status='ACTIVE'
  ) then raise exception 'Access denied' using errcode='42501'; end if;
  return query select s.code::text,s.name::text,s.authority::text,f.source_last_check_date,i.id,i.status::text,f.registry_update_date
    from public.fsps f left join public.fsp_registry_sources s on s.id=f.registry_source_id
    left join public.fsp_registry_imports i on i.id=f.registry_import_id where f.id=target_fsp_id;
end; $$;

create or replace function public.get_fsp_registry_provenance(target_fsp_id uuid)
returns table(source_code text,source_name text,source_authority text,last_checked_at timestamptz,last_import_id uuid,last_import_status text,registry_updated_at timestamptz)
language sql stable security invoker set search_path='' as $$
  select * from registry_private.get_fsp_registry_provenance_impl(target_fsp_id);
$$;

create or replace function registry_private.confirm_fsp_registry_import_impl(target_import_id uuid)
returns public.fsp_registry_imports language plpgsql security definer set search_path='' as $$
declare result public.fsp_registry_imports;
begin
  if not exists(select 1 from public.platform_memberships where user_id=(select auth.uid()) and role='PLATFORM_ADMIN' and status='ACTIVE') then
    raise exception 'Platform administrator access required' using errcode='42501';
  end if;
  update public.fsp_registry_imports set status='QUEUED',confirmed_by=(select auth.uid()),confirmed_date=now(),error_code=null,error_summary=null
    where id=target_import_id and status='READY_FOR_CONFIRMATION' returning * into result;
  if result.id is null then raise exception 'Import is not ready for confirmation' using errcode='55000'; end if;
  update public.fsp_source_records set processing_status=case validation_status when 'VALID' then 'READY' when 'CONFLICT' then 'CONFLICT' else 'INVALID' end
    where import_id=target_import_id and processing_status='STAGED';
  insert into public.audit_events(actor_user_id,event_type,entity_type,entity_id,metadata)
    values((select auth.uid()),'FSP_REGISTRY_IMPORT_CONFIRMED','FSP_REGISTRY_IMPORT',target_import_id,jsonb_build_object('source_id',result.source_id));
  return result;
end; $$;

create or replace function public.confirm_fsp_registry_import(target_import_id uuid)
returns public.fsp_registry_imports language sql security invoker set search_path='' as $$
  select registry_private.confirm_fsp_registry_import_impl(target_import_id);
$$;

revoke all on function registry_private.get_my_platform_access_impl(),registry_private.get_fsp_registry_provenance_impl(uuid),registry_private.confirm_fsp_registry_import_impl(uuid) from public,anon;
grant usage on schema registry_private to authenticated,service_role;
grant execute on function registry_private.get_my_platform_access_impl(),registry_private.get_fsp_registry_provenance_impl(uuid),registry_private.confirm_fsp_registry_import_impl(uuid) to authenticated,service_role;
revoke all on function public.get_my_platform_access(),public.get_fsp_registry_provenance(uuid),public.confirm_fsp_registry_import(uuid) from public,anon;
grant execute on function public.get_my_platform_access(),public.get_fsp_registry_provenance(uuid),public.confirm_fsp_registry_import(uuid) to authenticated,service_role;
