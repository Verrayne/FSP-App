-- Platform administration for SaaS tenant provisioning, shared reference data,
-- and versioned questionnaire authoring. Browser roles never receive direct
-- write access to the underlying tables.

create schema if not exists platform_private;
revoke all on schema platform_private from public, anon, authenticated;
grant usage on schema platform_private to authenticated, service_role;

create or replace function platform_private.require_platform_admin()
returns uuid
language plpgsql stable security definer set search_path=''
as $$
declare actor_id uuid := auth.uid();
begin
  if actor_id is null or not exists (
    select 1 from public.platform_memberships pm
    where pm.user_id=actor_id and pm.role='PLATFORM_ADMIN' and pm.status='ACTIVE'
  ) then
    raise exception 'Platform administrator access required' using errcode='42501';
  end if;
  return actor_id;
end;
$$;

create or replace function platform_private.get_platform_dashboard_impl()
returns table(active_tenants bigint, active_fsps bigint, published_questionnaires bigint, draft_questionnaires bigint)
language plpgsql stable security definer set search_path=''
as $$
begin
  perform platform_private.require_platform_admin();
  return query select
    (select count(*) from public.tenants t where t.status='ACTIVE' and t.active),
    (select count(*) from public.fsps f where f.status='AUTHORISED'),
    (select count(distinct qv.questionnaire_id) from public.questionnaire_versions qv where qv.status='PUBLISHED'),
    (select count(*) from public.questionnaire_versions qv where qv.status='DRAFT');
end;
$$;

create or replace function platform_private.list_platform_tenants_impl()
returns table(tenant_id uuid, tenant_code text, tenant_name text, tenant_status text, tenant_active boolean,
  administrator_count bigint, fsp_count bigint, submission_period_count bigint, create_date timestamptz, update_date timestamptz)
language plpgsql stable security definer set search_path=''
as $$
begin
  perform platform_private.require_platform_admin();
  return query
  select t.id,t.code::text,t.name::text,t.status::text,t.active,
    (select count(*) from public.tenant_memberships tm where tm.tenant_id=t.id and tm.role='ADMIN' and tm.status='ACTIVE'),
    (select count(*) from public.tenant_fsps tf where tf.tenant_id=t.id and tf.status='ACTIVE'),
    (select count(*) from public.submission_periods sp where sp.tenant_id=t.id),
    t.create_date,t.update_date
  from public.tenants t order by t.name,t.id;
end;
$$;

create or replace function platform_private.create_platform_tenant_impl(
  target_code text,target_name text,target_admin_email text,target_token_hash text)
returns table(tenant_id uuid,invitation_id uuid,admin_email text,expiry_date timestamptz)
language plpgsql security definer set search_path=''
as $$
declare actor_id uuid:=platform_private.require_platform_admin(); created_tenant public.tenants;
  created_invitation public.tenant_invitations; normalized text:=lower(btrim(target_admin_email)); clean_code text:=upper(btrim(target_code));
begin
  if clean_code !~ '^[A-Z][A-Z0-9_]{1,59}$' then raise exception 'Use a 2-60 character uppercase tenant code' using errcode='22023'; end if;
  if length(btrim(target_name))<2 or length(btrim(target_name))>255 then raise exception 'A tenant name is required' using errcode='22023'; end if;
  if normalized='' or length(normalized)>320 or normalized !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'A valid administrator email is required' using errcode='22023';
  end if;
  if target_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'Invalid invitation token' using errcode='22023'; end if;
  insert into public.tenants(code,name) values(clean_code,btrim(target_name)) returning * into created_tenant;
  insert into public.tenant_invitations(tenant_id,email,email_normalized,role,token_hash,invited_by,expiry_date)
    values(created_tenant.id,btrim(target_admin_email),normalized,'ADMIN',target_token_hash,actor_id,now()+interval '7 days')
    returning * into created_invitation;
  insert into public.audit_events(tenant_id,actor_user_id,event_type,entity_type,entity_id,metadata)
    values(created_tenant.id,actor_id,'PLATFORM_TENANT_CREATED','TENANT',created_tenant.id,
      jsonb_build_object('code',clean_code,'administrator_email',normalized));
  return query select created_tenant.id,created_invitation.id,created_invitation.email::text,created_invitation.expiry_date;
exception when unique_violation then raise exception 'Tenant code already exists' using errcode='23505';
end;
$$;

create or replace function platform_private.update_platform_tenant_impl(target_tenant_id uuid,target_name text,target_status text)
returns void language plpgsql security definer set search_path=''
as $$
declare actor_id uuid:=platform_private.require_platform_admin();
begin
  if length(btrim(target_name))<2 or length(btrim(target_name))>255 or target_status not in ('ACTIVE','SUSPENDED','CLOSED') then
    raise exception 'Invalid tenant values' using errcode='22023';
  end if;
  update public.tenants set name=btrim(target_name),status=target_status,active=(target_status='ACTIVE') where id=target_tenant_id;
  if not found then raise exception 'Tenant not found' using errcode='P0002'; end if;
  insert into public.audit_events(tenant_id,actor_user_id,event_type,entity_type,entity_id,metadata)
    values(target_tenant_id,actor_id,'PLATFORM_TENANT_UPDATED','TENANT',target_tenant_id,jsonb_build_object('status',target_status));
end;
$$;

create or replace function platform_private.list_platform_value_sets_impl()
returns table(value_set_id uuid,value_set_code text,value_set_name text,description text,active boolean,option_count bigint,options jsonb)
language plpgsql stable security definer set search_path=''
as $$
begin
  perform platform_private.require_platform_admin();
  return query select vs.id,vs.code::text,vs.name::text,vs.description,vs.active,count(vso.id),
    coalesce(jsonb_agg(jsonb_build_object('id',vso.id,'code',vso.code,'label',vso.label,'sortOrder',vso.sort_order,'active',vso.active)
      order by vso.sort_order,vso.code) filter(where vso.id is not null),'[]'::jsonb)
  from public.value_sets vs left join public.value_set_options vso on vso.value_set_id=vs.id
  where vs.tenant_id is null and vs.system
  group by vs.id order by vs.name,vs.id;
end;
$$;

create or replace function platform_private.create_platform_value_set_impl(target_code text,target_name text,target_description text,target_options jsonb)
returns uuid language plpgsql security definer set search_path=''
as $$
declare actor_id uuid:=platform_private.require_platform_admin(); created_id uuid; item jsonb; ordinal integer:=0;
  clean_code text:=upper(btrim(target_code));
begin
  if clean_code !~ '^[A-Z][A-Z0-9_]{1,79}$' or length(btrim(target_name))<2 then
    raise exception 'A valid value-set code and name are required' using errcode='22023';
  end if;
  if jsonb_typeof(coalesce(target_options,'[]'::jsonb))<>'array' or jsonb_array_length(coalesce(target_options,'[]'::jsonb))=0 then
    raise exception 'Add at least one option' using errcode='22023';
  end if;
  insert into public.value_sets(tenant_id,code,name,description,system)
    values(null,clean_code,btrim(target_name),nullif(btrim(target_description),''),true) returning id into created_id;
  for item in select value from jsonb_array_elements(target_options) loop
    ordinal:=ordinal+10;
    if upper(btrim(item->>'code')) !~ '^[A-Z0-9][A-Z0-9_]*$' or btrim(item->>'label')='' then
      raise exception 'Every option requires a valid code and label' using errcode='22023';
    end if;
    insert into public.value_set_options(value_set_id,code,label,sort_order)
      values(created_id,upper(btrim(item->>'code')),btrim(item->>'label'),ordinal);
  end loop;
  insert into public.audit_events(actor_user_id,event_type,entity_type,entity_id,metadata)
    values(actor_id,'PLATFORM_VALUE_SET_CREATED','VALUE_SET',created_id,jsonb_build_object('code',clean_code));
  return created_id;
exception when unique_violation then raise exception 'Value-set or option code already exists' using errcode='23505';
end;
$$;

create or replace function platform_private.list_platform_questions_impl()
returns table(question_id uuid,question_code text,question_label text,help_text text,question_type_id uuid,question_type_code text,
  question_type_name text,value_set_id uuid,value_set_name text,active boolean)
language plpgsql stable security definer set search_path=''
as $$
begin
  perform platform_private.require_platform_admin();
  return query select q.id,q.code::text,q.label::text,q.help_text,qt.id,qt.code::text,qt.name::text,vs.id,vs.name::text,q.active
    from public.questions q join public.question_types qt on qt.id=q.question_type_id
    left join public.value_sets vs on vs.id=q.value_set_id
    where q.tenant_id is null and q.system order by q.code,q.id;
end;
$$;

create or replace function platform_private.create_platform_question_impl(target_code text,target_label text,target_help_text text,
  target_question_type_id uuid,target_value_set_id uuid)
returns uuid language plpgsql security definer set search_path=''
as $$
declare actor_id uuid:=platform_private.require_platform_admin(); created_id uuid; type_row public.question_types;
  clean_code text:=upper(btrim(target_code));
begin
  select * into type_row from public.question_types where id=target_question_type_id and active;
  if not found or clean_code !~ '^[A-Z][A-Z0-9_]{1,99}$' or length(btrim(target_label))<2 then
    raise exception 'A valid question code, label and type are required' using errcode='22023';
  end if;
  if target_value_set_id is not null and (not type_row.allows_value_set or not exists(
    select 1 from public.value_sets vs where vs.id=target_value_set_id and vs.tenant_id is null and vs.system and vs.active)) then
    raise exception 'The selected value set is not available for this question type' using errcode='22023';
  end if;
  if type_row.allows_value_set and target_value_set_id is null then raise exception 'This question type requires a value set' using errcode='22023'; end if;
  insert into public.questions(tenant_id,code,question_type_id,value_set_id,label,help_text,system)
    values(null,clean_code,target_question_type_id,target_value_set_id,btrim(target_label),nullif(btrim(target_help_text),''),true)
    returning id into created_id;
  insert into public.audit_events(actor_user_id,event_type,entity_type,entity_id,metadata)
    values(actor_id,'PLATFORM_QUESTION_CREATED','QUESTION',created_id,jsonb_build_object('code',clean_code));
  return created_id;
exception when unique_violation then raise exception 'Question code already exists' using errcode='23505';
end;
$$;

create or replace function platform_private.list_platform_questionnaires_impl()
returns table(questionnaire_id uuid,tenant_id uuid,tenant_name text,questionnaire_code text,questionnaire_name text,description text,
  active boolean,latest_version_id uuid,latest_version integer,latest_status text,section_count bigint,question_count bigint)
language plpgsql stable security definer set search_path=''
as $$
begin
  perform platform_private.require_platform_admin();
  return query
  select q.id,q.tenant_id,t.name::text,q.code::text,q.name::text,q.description,q.active,
    latest.id,latest.version_number,latest.status::text,
    (select count(*) from public.questionnaire_sections qs where qs.questionnaire_version_id=latest.id),
    (select count(*) from public.questionnaire_questions qq where qq.questionnaire_version_id=latest.id)
  from public.questionnaires q left join public.tenants t on t.id=q.tenant_id
  left join lateral (select qv.* from public.questionnaire_versions qv where qv.questionnaire_id=q.id order by qv.version_number desc limit 1) latest on true
  order by q.name,q.id;
end;
$$;

create or replace function platform_private.create_platform_questionnaire_impl(target_tenant_id uuid,target_code text,target_name text,target_description text)
returns table(questionnaire_id uuid,version_id uuid)
language plpgsql security definer set search_path=''
as $$
declare actor_id uuid:=platform_private.require_platform_admin(); q_id uuid; v_id uuid; clean_code text:=upper(btrim(target_code));
begin
  if target_tenant_id is not null and not exists(select 1 from public.tenants where id=target_tenant_id and active) then
    raise exception 'Tenant not found or inactive' using errcode='22023';
  end if;
  if clean_code !~ '^[A-Z][A-Z0-9_]{1,99}$' or length(btrim(target_name))<2 then
    raise exception 'A valid questionnaire code and name are required' using errcode='22023';
  end if;
  insert into public.questionnaires(tenant_id,code,name,description)
    values(target_tenant_id,clean_code,btrim(target_name),nullif(btrim(target_description),'')) returning id into q_id;
  insert into public.questionnaire_versions(questionnaire_id,version_number) values(q_id,1) returning id into v_id;
  insert into public.audit_events(tenant_id,actor_user_id,event_type,entity_type,entity_id,metadata)
    values(target_tenant_id,actor_id,'PLATFORM_QUESTIONNAIRE_CREATED','QUESTIONNAIRE',q_id,jsonb_build_object('code',clean_code));
  return query select q_id,v_id;
exception when unique_violation then raise exception 'Questionnaire code already exists in this scope' using errcode='23505';
end;
$$;

create or replace function platform_private.get_platform_questionnaire_version_impl(target_version_id uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare result jsonb;
begin
  perform platform_private.require_platform_admin();
  select jsonb_build_object('questionnaireId',q.id,'versionId',qv.id,'code',q.code,'name',q.name,'description',q.description,
    'tenantId',q.tenant_id,'tenantName',t.name,'versionNumber',qv.version_number,'status',qv.status,
    'effectiveFrom',qv.effective_from,'effectiveTo',qv.effective_to,
    'sections',coalesce((select jsonb_agg(jsonb_build_object('id',qs.id,'code',qs.code,'title',qs.title,'description',qs.description,
      'sortOrder',qs.sort_order,'questions',coalesce((select jsonb_agg(jsonb_build_object('id',qq.id,'questionId',question.id,
        'code',question.code,'label',question.label,'typeCode',qt.code,'valueSetName',vs.name,'required',qq.required,'sortOrder',qq.sort_order)
        order by qq.sort_order,qq.id) from public.questionnaire_questions qq join public.questions question on question.id=qq.question_id
        join public.question_types qt on qt.id=question.question_type_id left join public.value_sets vs on vs.id=question.value_set_id
        where qq.section_id=qs.id),'[]'::jsonb)) order by qs.sort_order,qs.id)
      from public.questionnaire_sections qs where qs.questionnaire_version_id=qv.id),'[]'::jsonb)) into result
  from public.questionnaire_versions qv join public.questionnaires q on q.id=qv.questionnaire_id
  left join public.tenants t on t.id=q.tenant_id where qv.id=target_version_id;
  if result is null then raise exception 'Questionnaire version not found' using errcode='P0002'; end if;
  return result;
end;
$$;

create or replace function platform_private.add_platform_questionnaire_section_impl(target_version_id uuid,target_code text,target_title text,target_description text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare actor_id uuid:=platform_private.require_platform_admin(); created_id uuid; next_order integer; clean_code text:=upper(btrim(target_code));
begin
  perform 1 from public.questionnaire_versions where id=target_version_id and status='DRAFT' for update;
  if not found then raise exception 'Only draft questionnaire versions can be edited' using errcode='55000'; end if;
  if clean_code !~ '^[A-Z][A-Z0-9_]{1,99}$' or length(btrim(target_title))<2 then raise exception 'A valid section code and title are required' using errcode='22023'; end if;
  select coalesce(max(sort_order),0)+10 into next_order from public.questionnaire_sections where questionnaire_version_id=target_version_id;
  insert into public.questionnaire_sections(questionnaire_version_id,code,title,description,sort_order)
    values(target_version_id,clean_code,btrim(target_title),nullif(btrim(target_description),''),next_order) returning id into created_id;
  insert into public.audit_events(actor_user_id,event_type,entity_type,entity_id) values(actor_id,'PLATFORM_QUESTIONNAIRE_SECTION_ADDED','QUESTIONNAIRE_SECTION',created_id);
  return created_id;
exception when unique_violation then raise exception 'Section code already exists in this version' using errcode='23505';
end;
$$;

create or replace function platform_private.add_platform_questionnaire_question_impl(target_version_id uuid,target_section_id uuid,target_question_id uuid,target_required boolean)
returns uuid language plpgsql security definer set search_path=''
as $$
declare actor_id uuid:=platform_private.require_platform_admin(); created_id uuid; next_order integer;
begin
  perform 1 from public.questionnaire_versions where id=target_version_id and status='DRAFT' for update;
  if not found then raise exception 'Only draft questionnaire versions can be edited' using errcode='55000'; end if;
  if not exists(select 1 from public.questionnaire_sections where id=target_section_id and questionnaire_version_id=target_version_id) or
     not exists(select 1 from public.questions where id=target_question_id and active) then
    raise exception 'Section or question unavailable' using errcode='22023';
  end if;
  select coalesce(max(sort_order),0)+10 into next_order from public.questionnaire_questions where section_id=target_section_id;
  insert into public.questionnaire_questions(questionnaire_version_id,section_id,question_id,sort_order,required)
    values(target_version_id,target_section_id,target_question_id,next_order,coalesce(target_required,false)) returning id into created_id;
  insert into public.audit_events(actor_user_id,event_type,entity_type,entity_id) values(actor_id,'PLATFORM_QUESTIONNAIRE_QUESTION_ADDED','QUESTIONNAIRE_QUESTION',created_id);
  return created_id;
exception when unique_violation then raise exception 'Question is already included in this version' using errcode='23505';
end;
$$;

create or replace function platform_private.remove_platform_questionnaire_item_impl(target_item_id uuid,target_item_type text)
returns void language plpgsql security definer set search_path=''
as $$
declare actor_id uuid:=platform_private.require_platform_admin(); version_id uuid;
begin
  if target_item_type='QUESTION' then
    select questionnaire_version_id into version_id from public.questionnaire_questions where id=target_item_id;
    if not exists(select 1 from public.questionnaire_versions where id=version_id and status='DRAFT') then raise exception 'Only draft questionnaire versions can be edited' using errcode='55000'; end if;
    delete from public.questionnaire_questions where id=target_item_id;
  elsif target_item_type='SECTION' then
    select questionnaire_version_id into version_id from public.questionnaire_sections where id=target_item_id;
    if not exists(select 1 from public.questionnaire_versions where id=version_id and status='DRAFT') then raise exception 'Only draft questionnaire versions can be edited' using errcode='55000'; end if;
    delete from public.questionnaire_questions where section_id=target_item_id;
    delete from public.questionnaire_sections where id=target_item_id;
  else raise exception 'Invalid questionnaire item type' using errcode='22023'; end if;
  if version_id is null then raise exception 'Questionnaire item not found' using errcode='P0002'; end if;
  insert into public.audit_events(actor_user_id,event_type,entity_type,entity_id,metadata)
    values(actor_id,'PLATFORM_QUESTIONNAIRE_ITEM_REMOVED','QUESTIONNAIRE_VERSION',version_id,jsonb_build_object('item_type',target_item_type));
end;
$$;

create or replace function platform_private.publish_platform_questionnaire_impl(target_version_id uuid,target_effective_from date,target_effective_to date)
returns void language plpgsql security definer set search_path=''
as $$
declare actor_id uuid:=platform_private.require_platform_admin(); q_id uuid;
begin
  select questionnaire_id into q_id from public.questionnaire_versions where id=target_version_id and status='DRAFT' for update;
  if q_id is null then raise exception 'Only draft questionnaire versions can be published' using errcode='55000'; end if;
  if target_effective_from is null or (target_effective_to is not null and target_effective_to<target_effective_from) then raise exception 'Valid effective dates are required' using errcode='22023'; end if;
  if not exists(select 1 from public.questionnaire_sections where questionnaire_version_id=target_version_id) or
     not exists(select 1 from public.questionnaire_questions where questionnaire_version_id=target_version_id) then
    raise exception 'Add at least one section and question before publishing' using errcode='55000';
  end if;
  update public.questionnaire_versions set status='PUBLISHED',effective_from=target_effective_from,effective_to=target_effective_to,
    published_date=now(),published_by=actor_id where id=target_version_id;
  insert into public.audit_events(actor_user_id,event_type,entity_type,entity_id) values(actor_id,'PLATFORM_QUESTIONNAIRE_PUBLISHED','QUESTIONNAIRE_VERSION',target_version_id);
end;
$$;

create or replace function platform_private.create_platform_questionnaire_version_impl(target_questionnaire_id uuid)
returns uuid language plpgsql security definer set search_path=''
as $$
declare actor_id uuid:=platform_private.require_platform_admin(); source_id uuid; created_id uuid; next_version integer; section_row record; new_section_id uuid;
begin
  if exists(select 1 from public.questionnaire_versions where questionnaire_id=target_questionnaire_id and status='DRAFT') then
    raise exception 'Finish the existing draft before creating another version' using errcode='55000';
  end if;
  select id,version_number into source_id,next_version from public.questionnaire_versions where questionnaire_id=target_questionnaire_id order by version_number desc limit 1;
  if source_id is null then raise exception 'Questionnaire not found' using errcode='P0002'; end if;
  next_version:=next_version+1;
  insert into public.questionnaire_versions(questionnaire_id,version_number) values(target_questionnaire_id,next_version) returning id into created_id;
  for section_row in select * from public.questionnaire_sections where questionnaire_version_id=source_id order by sort_order,id loop
    insert into public.questionnaire_sections(questionnaire_version_id,code,title,description,sort_order)
      values(created_id,section_row.code,section_row.title,section_row.description,section_row.sort_order) returning id into new_section_id;
    insert into public.questionnaire_questions(questionnaire_version_id,section_id,question_id,sort_order,required,read_only,default_value)
      select created_id,new_section_id,qq.question_id,qq.sort_order,qq.required,qq.read_only,qq.default_value
      from public.questionnaire_questions qq where qq.section_id=section_row.id order by qq.sort_order,qq.id;
  end loop;
  insert into public.audit_events(actor_user_id,event_type,entity_type,entity_id,metadata)
    values(actor_id,'PLATFORM_QUESTIONNAIRE_VERSION_CREATED','QUESTIONNAIRE_VERSION',created_id,jsonb_build_object('version',next_version));
  return created_id;
end;
$$;

-- Stable Data API gateways. The implementations enforce platform membership
-- inside SECURITY DEFINER functions and expose only narrow projections.
create or replace function public.get_platform_dashboard() returns table(active_tenants bigint,active_fsps bigint,published_questionnaires bigint,draft_questionnaires bigint)
language sql stable security invoker set search_path='' as $$select * from platform_private.get_platform_dashboard_impl()$$;
create or replace function public.list_platform_tenants() returns table(tenant_id uuid,tenant_code text,tenant_name text,tenant_status text,tenant_active boolean,administrator_count bigint,fsp_count bigint,submission_period_count bigint,create_date timestamptz,update_date timestamptz)
language sql stable security invoker set search_path='' as $$select * from platform_private.list_platform_tenants_impl()$$;
create or replace function public.create_platform_tenant(target_code text,target_name text,target_admin_email text,target_token_hash text) returns table(tenant_id uuid,invitation_id uuid,admin_email text,expiry_date timestamptz)
language sql security invoker set search_path='' as $$select * from platform_private.create_platform_tenant_impl(target_code,target_name,target_admin_email,target_token_hash)$$;
create or replace function public.update_platform_tenant(target_tenant_id uuid,target_name text,target_status text) returns void
language sql security invoker set search_path='' as $$select platform_private.update_platform_tenant_impl(target_tenant_id,target_name,target_status)$$;
create or replace function public.list_platform_value_sets() returns table(value_set_id uuid,value_set_code text,value_set_name text,description text,active boolean,option_count bigint,options jsonb)
language sql stable security invoker set search_path='' as $$select * from platform_private.list_platform_value_sets_impl()$$;
create or replace function public.create_platform_value_set(target_code text,target_name text,target_description text,target_options jsonb) returns uuid
language sql security invoker set search_path='' as $$select platform_private.create_platform_value_set_impl(target_code,target_name,target_description,target_options)$$;
create or replace function public.list_platform_questions() returns table(question_id uuid,question_code text,question_label text,help_text text,question_type_id uuid,question_type_code text,question_type_name text,value_set_id uuid,value_set_name text,active boolean)
language sql stable security invoker set search_path='' as $$select * from platform_private.list_platform_questions_impl()$$;
create or replace function public.create_platform_question(target_code text,target_label text,target_help_text text,target_question_type_id uuid,target_value_set_id uuid) returns uuid
language sql security invoker set search_path='' as $$select platform_private.create_platform_question_impl(target_code,target_label,target_help_text,target_question_type_id,target_value_set_id)$$;
create or replace function public.list_platform_questionnaires() returns table(questionnaire_id uuid,tenant_id uuid,tenant_name text,questionnaire_code text,questionnaire_name text,description text,active boolean,latest_version_id uuid,latest_version integer,latest_status text,section_count bigint,question_count bigint)
language sql stable security invoker set search_path='' as $$select * from platform_private.list_platform_questionnaires_impl()$$;
create or replace function public.create_platform_questionnaire(target_tenant_id uuid,target_code text,target_name text,target_description text) returns table(questionnaire_id uuid,version_id uuid)
language sql security invoker set search_path='' as $$select * from platform_private.create_platform_questionnaire_impl(target_tenant_id,target_code,target_name,target_description)$$;
create or replace function public.get_platform_questionnaire_version(target_version_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$select platform_private.get_platform_questionnaire_version_impl(target_version_id)$$;
create or replace function public.add_platform_questionnaire_section(target_version_id uuid,target_code text,target_title text,target_description text) returns uuid
language sql security invoker set search_path='' as $$select platform_private.add_platform_questionnaire_section_impl(target_version_id,target_code,target_title,target_description)$$;
create or replace function public.add_platform_questionnaire_question(target_version_id uuid,target_section_id uuid,target_question_id uuid,target_required boolean) returns uuid
language sql security invoker set search_path='' as $$select platform_private.add_platform_questionnaire_question_impl(target_version_id,target_section_id,target_question_id,target_required)$$;
create or replace function public.remove_platform_questionnaire_item(target_item_id uuid,target_item_type text) returns void
language sql security invoker set search_path='' as $$select platform_private.remove_platform_questionnaire_item_impl(target_item_id,target_item_type)$$;
create or replace function public.publish_platform_questionnaire(target_version_id uuid,target_effective_from date,target_effective_to date) returns void
language sql security invoker set search_path='' as $$select platform_private.publish_platform_questionnaire_impl(target_version_id,target_effective_from,target_effective_to)$$;
create or replace function public.create_platform_questionnaire_version(target_questionnaire_id uuid) returns uuid
language sql security invoker set search_path='' as $$select platform_private.create_platform_questionnaire_version_impl(target_questionnaire_id)$$;

revoke all on function platform_private.require_platform_admin(),platform_private.get_platform_dashboard_impl(),
  platform_private.list_platform_tenants_impl(),platform_private.create_platform_tenant_impl(text,text,text,text),
  platform_private.update_platform_tenant_impl(uuid,text,text),platform_private.list_platform_value_sets_impl(),
  platform_private.create_platform_value_set_impl(text,text,text,jsonb),platform_private.list_platform_questions_impl(),
  platform_private.create_platform_question_impl(text,text,text,uuid,uuid),platform_private.list_platform_questionnaires_impl(),
  platform_private.create_platform_questionnaire_impl(uuid,text,text,text),platform_private.get_platform_questionnaire_version_impl(uuid),
  platform_private.add_platform_questionnaire_section_impl(uuid,text,text,text),platform_private.add_platform_questionnaire_question_impl(uuid,uuid,uuid,boolean),
  platform_private.remove_platform_questionnaire_item_impl(uuid,text),platform_private.publish_platform_questionnaire_impl(uuid,date,date),
  platform_private.create_platform_questionnaire_version_impl(uuid)
from public,anon;
grant execute on function platform_private.require_platform_admin(),platform_private.get_platform_dashboard_impl(),
  platform_private.list_platform_tenants_impl(),platform_private.create_platform_tenant_impl(text,text,text,text),
  platform_private.update_platform_tenant_impl(uuid,text,text),platform_private.list_platform_value_sets_impl(),
  platform_private.create_platform_value_set_impl(text,text,text,jsonb),platform_private.list_platform_questions_impl(),
  platform_private.create_platform_question_impl(text,text,text,uuid,uuid),platform_private.list_platform_questionnaires_impl(),
  platform_private.create_platform_questionnaire_impl(uuid,text,text,text),platform_private.get_platform_questionnaire_version_impl(uuid),
  platform_private.add_platform_questionnaire_section_impl(uuid,text,text,text),platform_private.add_platform_questionnaire_question_impl(uuid,uuid,uuid,boolean),
  platform_private.remove_platform_questionnaire_item_impl(uuid,text),platform_private.publish_platform_questionnaire_impl(uuid,date,date),
  platform_private.create_platform_questionnaire_version_impl(uuid)
to authenticated,service_role;

revoke all on function public.get_platform_dashboard(),public.list_platform_tenants(),public.create_platform_tenant(text,text,text,text),
  public.update_platform_tenant(uuid,text,text),public.list_platform_value_sets(),public.create_platform_value_set(text,text,text,jsonb),
  public.list_platform_questions(),public.create_platform_question(text,text,text,uuid,uuid),public.list_platform_questionnaires(),
  public.create_platform_questionnaire(uuid,text,text,text),public.get_platform_questionnaire_version(uuid),
  public.add_platform_questionnaire_section(uuid,text,text,text),public.add_platform_questionnaire_question(uuid,uuid,uuid,boolean),
  public.remove_platform_questionnaire_item(uuid,text),public.publish_platform_questionnaire(uuid,date,date),
  public.create_platform_questionnaire_version(uuid)
from public,anon;
grant execute on function public.get_platform_dashboard(),public.list_platform_tenants(),public.create_platform_tenant(text,text,text,text),
  public.update_platform_tenant(uuid,text,text),public.list_platform_value_sets(),public.create_platform_value_set(text,text,text,jsonb),
  public.list_platform_questions(),public.create_platform_question(text,text,text,uuid,uuid),public.list_platform_questionnaires(),
  public.create_platform_questionnaire(uuid,text,text,text),public.get_platform_questionnaire_version(uuid),
  public.add_platform_questionnaire_section(uuid,text,text,text),public.add_platform_questionnaire_question(uuid,uuid,uuid,boolean),
  public.remove_platform_questionnaire_item(uuid,text),public.publish_platform_questionnaire(uuid,date,date),
  public.create_platform_questionnaire_version(uuid)
to authenticated,service_role;

comment on schema platform_private is 'RLS-safe platform administration implementation; not exposed through the Data API.';
comment on function public.publish_platform_questionnaire(uuid,date,date) is 'Publishes an immutable questionnaire version after structural validation.';
