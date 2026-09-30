-- Global FSP registry ingestion. Source payloads and import operations are server-only;
-- authenticated clients receive narrowly scoped data through RPCs and the platform API.

create table public.platform_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete restrict,
  role varchar(40) not null default 'PLATFORM_ADMIN',
  status varchar(20) not null default 'ACTIVE',
  create_date timestamptz not null default now(),
  update_date timestamptz not null default now(),
  constraint platform_memberships_role_check check (role = 'PLATFORM_ADMIN'),
  constraint platform_memberships_status_check check (status in ('ACTIVE','REVOKED'))
);

create table public.fsp_registry_sources (
  id uuid primary key default gen_random_uuid(),
  code varchar(80) not null unique,
  name varchar(180) not null,
  provider_type varchar(40) not null,
  authority varchar(30) not null,
  source_mode varchar(30) not null default 'FULL_SNAPSHOT',
  schema_version varchar(20) not null default '1',
  active boolean not null default true,
  production_enabled boolean not null default false,
  freshness_threshold_days integer not null default 30,
  configuration jsonb not null default '{}'::jsonb,
  create_date timestamptz not null default now(),
  update_date timestamptz not null default now(),
  constraint fsp_registry_sources_code_format check (code ~ '^[A-Z][A-Z0-9_]*$'),
  constraint fsp_registry_sources_provider_check check (provider_type in ('MANUAL_FILE','TEST_FIXTURE','FSCA_AUTHORISED')),
  constraint fsp_registry_sources_authority_check check (authority in ('REGULATORY','NON_AUTHORITATIVE')),
  constraint fsp_registry_sources_mode_check check (source_mode in ('FULL_SNAPSHOT','DELTA')),
  constraint fsp_registry_sources_freshness_check check (freshness_threshold_days between 1 and 3650),
  constraint fsp_registry_sources_configuration_object check (jsonb_typeof(configuration) = 'object')
);

create table public.fsp_registry_imports (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.fsp_registry_sources(id) on delete restrict,
  status varchar(40) not null default 'VALIDATING',
  source_mode varchar(30) not null,
  schema_version varchar(20) not null,
  original_file_name varchar(255),
  file_hash varchar(64),
  storage_path text,
  mime_type varchar(120),
  file_size_bytes bigint,
  started_by uuid references public.profiles(id) on delete restrict,
  confirmed_by uuid references public.profiles(id) on delete restrict,
  started_date timestamptz not null default now(),
  validated_date timestamptz,
  confirmed_date timestamptz,
  completed_date timestamptz,
  total_count integer not null default 0,
  valid_count integer not null default 0,
  invalid_count integer not null default 0,
  inserted_count integer not null default 0,
  updated_count integer not null default 0,
  unchanged_count integer not null default 0,
  conflicted_count integer not null default 0,
  failed_count integer not null default 0,
  processed_count integer not null default 0,
  status_change_count integer not null default 0,
  error_code varchar(80),
  error_summary text,
  metadata jsonb not null default '{}'::jsonb,
  reprocess_of uuid references public.fsp_registry_imports(id) on delete restrict,
  create_date timestamptz not null default now(),
  update_date timestamptz not null default now(),
  constraint fsp_registry_imports_status_check check (status in ('VALIDATING','READY_FOR_CONFIRMATION','QUEUED','PROCESSING','COMPLETED','COMPLETED_WITH_ERRORS','FAILED','CANCELLED')),
  constraint fsp_registry_imports_source_mode_check check (source_mode in ('FULL_SNAPSHOT','DELTA')),
  constraint fsp_registry_imports_hash_format check (file_hash is null or file_hash ~ '^[a-f0-9]{64}$'),
  constraint fsp_registry_imports_size_check check (file_size_bytes is null or file_size_bytes between 1 and 4194304),
  constraint fsp_registry_imports_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table public.fsp_source_records (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.fsp_registry_imports(id) on delete restrict,
  source_id uuid not null references public.fsp_registry_sources(id) on delete restrict,
  row_number integer not null,
  source_record_key varchar(120),
  fsp_id uuid references public.fsps(id) on delete restrict,
  source_payload jsonb not null,
  normalized_payload jsonb,
  source_hash varchar(64),
  validation_status varchar(20) not null,
  match_status varchar(20),
  processing_status varchar(20) not null default 'STAGED',
  proposed_changes jsonb not null default '[]'::jsonb,
  error_code varchar(80),
  error_message text,
  worker_id varchar(120),
  lease_date timestamptz,
  attempt_count integer not null default 0,
  applied_date timestamptz,
  create_date timestamptz not null default now(),
  update_date timestamptz not null default now(),
  constraint fsp_source_records_row_unique unique (import_id,row_number),
  constraint fsp_source_records_row_check check (row_number > 1),
  constraint fsp_source_records_payload_object check (jsonb_typeof(source_payload) = 'object'),
  constraint fsp_source_records_normalized_object check (normalized_payload is null or jsonb_typeof(normalized_payload) = 'object'),
  constraint fsp_source_records_changes_array check (jsonb_typeof(proposed_changes) = 'array'),
  constraint fsp_source_records_hash_format check (source_hash is null or source_hash ~ '^[a-f0-9]{64}$'),
  constraint fsp_source_records_validation_check check (validation_status in ('VALID','INVALID','CONFLICT')),
  constraint fsp_source_records_match_check check (match_status is null or match_status in ('NEW','MATCHED')),
  constraint fsp_source_records_processing_check check (processing_status in ('STAGED','READY','PROCESSING','APPLIED','UNCHANGED','INVALID','CONFLICT','FAILED'))
);

create table public.fsp_registry_changes (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.fsp_registry_imports(id) on delete restrict,
  source_record_id uuid not null references public.fsp_source_records(id) on delete restrict,
  fsp_id uuid not null references public.fsps(id) on delete restrict,
  field_name varchar(80) not null,
  change_type varchar(30) not null,
  previous_value jsonb,
  new_value jsonb,
  source_effective_date date,
  detected_date timestamptz not null default now(),
  constraint fsp_registry_changes_record_field_unique unique(source_record_id,field_name),
  constraint fsp_registry_changes_type_check check (change_type in ('FSP_CREATED','FIELD_UPDATED','STATUS_CHANGED'))
);

alter table public.fsps
  add column registry_source_id uuid references public.fsp_registry_sources(id) on delete restrict,
  add column registry_import_id uuid references public.fsp_registry_imports(id) on delete restrict,
  add column registry_source_record_id uuid references public.fsp_source_records(id) on delete restrict,
  add column registry_update_date timestamptz;

create index platform_memberships_active_user_idx on public.platform_memberships(user_id) where status='ACTIVE';
create index fsp_registry_imports_source_started_idx on public.fsp_registry_imports(source_id,started_date desc);
create index fsp_registry_imports_status_idx on public.fsp_registry_imports(status,started_date) where status in ('QUEUED','PROCESSING');
create index fsp_registry_imports_file_hash_idx on public.fsp_registry_imports(source_id,file_hash) where file_hash is not null;
create index fsp_source_records_import_status_idx on public.fsp_source_records(import_id,processing_status,row_number);
create index fsp_source_records_fsp_idx on public.fsp_source_records(fsp_id) where fsp_id is not null;
create index fsp_source_records_lease_idx on public.fsp_source_records(processing_status,lease_date) where processing_status='PROCESSING';
create index fsp_registry_changes_fsp_date_idx on public.fsp_registry_changes(fsp_id,detected_date desc);

create trigger platform_memberships_set_update_date before update on public.platform_memberships for each row execute function private.set_update_date();
create trigger fsp_registry_sources_set_update_date before update on public.fsp_registry_sources for each row execute function private.set_update_date();
create trigger fsp_registry_imports_set_update_date before update on public.fsp_registry_imports for each row execute function private.set_update_date();
create trigger fsp_source_records_set_update_date before update on public.fsp_source_records for each row execute function private.set_update_date();

alter table public.platform_memberships enable row level security;
alter table public.platform_memberships force row level security;
alter table public.fsp_registry_sources enable row level security;
alter table public.fsp_registry_sources force row level security;
alter table public.fsp_registry_imports enable row level security;
alter table public.fsp_registry_imports force row level security;
alter table public.fsp_source_records enable row level security;
alter table public.fsp_source_records force row level security;
alter table public.fsp_registry_changes enable row level security;
alter table public.fsp_registry_changes force row level security;

create policy platform_memberships_no_direct_access on public.platform_memberships for all to authenticated using(false) with check(false);
create policy fsp_registry_sources_no_direct_access on public.fsp_registry_sources for all to authenticated using(false) with check(false);
create policy fsp_registry_imports_no_direct_access on public.fsp_registry_imports for all to authenticated using(false) with check(false);
create policy fsp_source_records_no_direct_access on public.fsp_source_records for all to authenticated using(false) with check(false);
create policy fsp_registry_changes_no_direct_access on public.fsp_registry_changes for all to authenticated using(false) with check(false);

revoke all on public.platform_memberships,public.fsp_registry_sources,public.fsp_registry_imports,public.fsp_source_records,public.fsp_registry_changes from anon,authenticated;
grant all on public.platform_memberships,public.fsp_registry_sources,public.fsp_registry_imports,public.fsp_source_records,public.fsp_registry_changes to service_role;

create or replace function public.get_my_platform_access()
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.platform_memberships pm where pm.user_id=(select auth.uid()) and pm.role='PLATFORM_ADMIN' and pm.status='ACTIVE');
$$;
revoke all on function public.get_my_platform_access() from public,anon;
grant execute on function public.get_my_platform_access() to authenticated,service_role;

create or replace function public.get_fsp_registry_provenance(target_fsp_id uuid)
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
revoke all on function public.get_fsp_registry_provenance(uuid) from public,anon;
grant execute on function public.get_fsp_registry_provenance(uuid) to authenticated,service_role;

create or replace function public.confirm_fsp_registry_import(target_import_id uuid)
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
revoke all on function public.confirm_fsp_registry_import(uuid) from public,anon;
grant execute on function public.confirm_fsp_registry_import(uuid) to authenticated,service_role;

create or replace function public.claim_fsp_registry_records(claim_worker_id text,claim_limit integer default 50)
returns setof public.fsp_source_records language plpgsql security definer set search_path='' as $$
begin
  if coalesce((select auth.role()),'') <> 'service_role' then raise exception 'Service role required' using errcode='42501'; end if;
  update public.fsp_source_records set processing_status='READY',worker_id=null,lease_date=null
    where processing_status='PROCESSING' and lease_date < now()-interval '10 minutes';
  return query with candidates as (
    select r.id from public.fsp_source_records r join public.fsp_registry_imports i on i.id=r.import_id
    where r.processing_status='READY' and i.status in ('QUEUED','PROCESSING') order by i.confirmed_date,r.row_number for update skip locked limit least(greatest(claim_limit,1),100)
  ) update public.fsp_source_records r set processing_status='PROCESSING',worker_id=claim_worker_id,lease_date=now(),attempt_count=attempt_count+1
    from candidates c where r.id=c.id returning r.*;
end; $$;
revoke all on function public.claim_fsp_registry_records(text,integer) from public,anon,authenticated;
grant execute on function public.claim_fsp_registry_records(text,integer) to service_role;

create or replace function private.refresh_fsp_registry_import(target_import_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare remaining integer; failures integer; conflicts integer;
begin
  select count(*) filter(where processing_status in ('READY','PROCESSING')),count(*) filter(where processing_status='FAILED'),count(*) filter(where processing_status='CONFLICT')
    into remaining,failures,conflicts from public.fsp_source_records where import_id=target_import_id;
  update public.fsp_registry_imports i set
    status=case when remaining>0 then 'PROCESSING' when failures+conflicts+(select count(*) from public.fsp_source_records where import_id=target_import_id and processing_status='INVALID')>0 then 'COMPLETED_WITH_ERRORS' else 'COMPLETED' end,
    completed_date=case when remaining=0 then coalesce(completed_date,now()) else null end,
    processed_count=(select count(*) from public.fsp_source_records where import_id=target_import_id and processing_status in ('APPLIED','UNCHANGED','FAILED')),
    inserted_count=(select count(*) from public.fsp_source_records where import_id=target_import_id and processing_status='APPLIED' and match_status='NEW'),
    updated_count=(select count(*) from public.fsp_source_records where import_id=target_import_id and processing_status='APPLIED' and match_status='MATCHED'),
    unchanged_count=(select count(*) from public.fsp_source_records where import_id=target_import_id and processing_status='UNCHANGED'),
    failed_count=failures,
    conflicted_count=conflicts
    where i.id=target_import_id;
end; $$;
revoke all on function private.refresh_fsp_registry_import(uuid) from public,anon,authenticated;

create or replace function public.apply_fsp_registry_record(target_record_id uuid,claim_worker_id text)
returns text language plpgsql security definer set search_path='' as $$
declare r public.fsp_source_records; imp public.fsp_registry_imports; src public.fsp_registry_sources; current_fsp public.fsps; payload jsonb; item record; changed integer:=0; created boolean:=false; effective date;
begin
  if coalesce((select auth.role()),'') <> 'service_role' then raise exception 'Service role required' using errcode='42501'; end if;
  select * into r from public.fsp_source_records where id=target_record_id for update;
  if r.id is null or r.processing_status<>'PROCESSING' or r.worker_id<>claim_worker_id then raise exception 'Record is not claimed by this worker' using errcode='55000'; end if;
  select * into imp from public.fsp_registry_imports where id=r.import_id for update;
  select * into src from public.fsp_registry_sources where id=r.source_id;
  if src.authority<>'REGULATORY' and coalesce((imp.metadata->>'test_mode')::boolean,false) is not true then raise exception 'Non-authoritative source cannot update the registry' using errcode='42501'; end if;
  payload:=r.normalized_payload; effective:=nullif(payload->>'status_effective_date','')::date;
  select * into current_fsp from public.fsps where fsp_number=payload->>'fsp_number' for update;
  if current_fsp.id is null then
    insert into public.fsps(fsp_number,registered_name,registration_number,fsp_type,status,status_effective_date,source,source_last_check_date,registry_source_id,registry_import_id,registry_source_record_id,registry_update_date)
      values(payload->>'fsp_number',payload->>'registered_name',payload->>'registration_number',payload->>'fsp_type',payload->>'status',effective,src.code,now(),src.id,imp.id,r.id,now()) returning * into current_fsp;
    created:=true; changed:=1;
    insert into public.fsp_registry_changes(import_id,source_record_id,fsp_id,field_name,change_type,new_value,source_effective_date)
      values(imp.id,r.id,current_fsp.id,'__record__','FSP_CREATED',payload,effective);
  else
    for item in select * from (values
      ('registered_name',to_jsonb(current_fsp.registered_name),payload->'registered_name'),
      ('registration_number',to_jsonb(current_fsp.registration_number),payload->'registration_number'),
      ('fsp_type',to_jsonb(current_fsp.fsp_type),payload->'fsp_type'),
      ('status',to_jsonb(current_fsp.status),payload->'status'),
      ('status_effective_date',to_jsonb(current_fsp.status_effective_date),case when payload ? 'status_effective_date' then to_jsonb(effective) else null end)
    ) d(field_name,old_value,new_value)
    loop
      if payload ? item.field_name and item.new_value is distinct from item.old_value then
        insert into public.fsp_registry_changes(import_id,source_record_id,fsp_id,field_name,change_type,previous_value,new_value,source_effective_date)
          values(imp.id,r.id,current_fsp.id,item.field_name,case when item.field_name='status' then 'STATUS_CHANGED' else 'FIELD_UPDATED' end,item.old_value,item.new_value,effective)
          on conflict(source_record_id,field_name) do nothing;
        changed:=changed+1;
      end if;
    end loop;
    update public.fsps set
      registered_name=case when payload ? 'registered_name' then payload->>'registered_name' else registered_name end,
      registration_number=case when payload ? 'registration_number' then payload->>'registration_number' else registration_number end,
      fsp_type=case when payload ? 'fsp_type' then payload->>'fsp_type' else fsp_type end,
      status=case when payload ? 'status' then payload->>'status' else status end,
      status_effective_date=case when payload ? 'status_effective_date' then effective else status_effective_date end,
      source=src.code,source_last_check_date=now(),registry_source_id=src.id,registry_import_id=imp.id,registry_source_record_id=r.id,registry_update_date=now()
      where id=current_fsp.id;
  end if;
  update public.fsp_source_records set fsp_id=current_fsp.id,processing_status=case when changed>0 then 'APPLIED' else 'UNCHANGED' end,applied_date=now(),worker_id=null,lease_date=null where id=r.id;
  if changed>0 then
    insert into public.audit_events(fsp_id,event_type,entity_type,entity_id,metadata) values(current_fsp.id,case when created then 'FSP_REGISTRY_CREATED' else 'FSP_REGISTRY_UPDATED' end,'FSP',current_fsp.id,jsonb_build_object('import_id',imp.id,'source_record_id',r.id,'changed_fields',changed));
  end if;
  perform private.refresh_fsp_registry_import(imp.id);
  return case when created then 'INSERTED' when changed>0 then 'UPDATED' else 'UNCHANGED' end;
end; $$;
revoke all on function public.apply_fsp_registry_record(uuid,text) from public,anon,authenticated;
grant execute on function public.apply_fsp_registry_record(uuid,text) to service_role;

create or replace function public.fail_fsp_registry_record(target_record_id uuid,claim_worker_id text,failure_code text,failure_message text)
returns void language plpgsql security definer set search_path='' as $$
declare target_import uuid;
begin
  if coalesce((select auth.role()),'') <> 'service_role' then raise exception 'Service role required' using errcode='42501'; end if;
  update public.fsp_source_records set processing_status='FAILED',error_code=left(failure_code,80),error_message=left(failure_message,1000),worker_id=null,lease_date=null
    where id=target_record_id and processing_status='PROCESSING' and worker_id=claim_worker_id returning import_id into target_import;
  if target_import is not null then perform private.refresh_fsp_registry_import(target_import); end if;
end; $$;
revoke all on function public.fail_fsp_registry_record(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.fail_fsp_registry_record(uuid,text,text,text) to service_role;

insert into public.fsp_registry_sources(code,name,provider_type,authority,source_mode,schema_version,production_enabled,configuration) values
  ('FSCA_MANUAL_CSV','FSCA authorised manual CSV','MANUAL_FILE','REGULATORY','FULL_SNAPSHOT','1',true,'{"required_headers":["fsp_number","registered_name","regulatory_status"]}'::jsonb),
  ('DEVELOPMENT_FIXTURE','Development registry fixture','TEST_FIXTURE','NON_AUTHORITATIVE','DELTA','1',false,'{}'::jsonb)
on conflict(code) do nothing;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('registry-imports','registry-imports',false,4194304,array['text/csv','application/csv','text/plain'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

comment on table public.fsp_registry_sources is 'Configured, provenance-preserving registry providers. Configuration must never contain credentials.';
comment on table public.fsp_source_records is 'Minimised source rows retained for validation, replay, provenance and row-level failure recovery.';
comment on column public.fsps.trade_name is 'FSP-maintained profile field; registry imports must not update it.';
