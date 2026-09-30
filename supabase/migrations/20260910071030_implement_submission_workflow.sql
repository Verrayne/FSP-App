-- Prompt 06: version-aware route rules, declarations, and trusted submission operations.
create table public.submission_route_rules (
  id uuid primary key default gen_random_uuid(),
  questionnaire_version_id uuid not null references public.questionnaire_versions(id) on delete restrict,
  source_questionnaire_question_id uuid not null,
  operator varchar(30) not null,
  comparison_value jsonb not null,
  submission_route varchar(20) not null,
  priority integer not null default 100,
  active boolean not null default true,
  create_date timestamptz not null default now(),
  constraint submission_route_rules_question_version_fk
    foreign key (source_questionnaire_question_id, questionnaire_version_id)
    references public.questionnaire_questions(id, questionnaire_version_id) on delete restrict,
  constraint submission_route_rules_operator_check
    check (operator in ('EQUALS', 'IN', 'GREATER_THAN', 'LESS_THAN')),
  constraint submission_route_rules_route_check check (submission_route in ('CERTIFICATE', 'AFFIDAVIT')),
  constraint submission_route_rules_priority_check check (priority >= 0),
  constraint submission_route_rules_comparison_check check (jsonb_typeof(comparison_value) in ('string', 'number', 'boolean', 'array'))
);

create table public.declaration_templates (
  id uuid primary key default gen_random_uuid(),
  questionnaire_version_id uuid not null references public.questionnaire_versions(id) on delete restrict,
  code varchar(100) not null,
  version_number integer not null,
  title varchar(255) not null,
  declaration_text text not null,
  active boolean not null default true,
  create_date timestamptz not null default now(),
  constraint declaration_templates_version_code_key unique (questionnaire_version_id, code, version_number),
  constraint declaration_templates_code_format check (code ~ '^[A-Z][A-Z0-9_]*$'),
  constraint declaration_templates_version_check check (version_number > 0),
  constraint declaration_templates_text_check check (btrim(declaration_text) <> '')
);

create table public.submission_declarations (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.submissions(id) on delete restrict,
  declaration_template_id uuid not null references public.declaration_templates(id) on delete restrict,
  declarant_user_id uuid not null references public.profiles(id) on delete restrict,
  declarant_name varchar(255) not null,
  accepted_date timestamptz not null default now(),
  constraint submission_declarations_name_check check (btrim(declarant_name) <> '')
);

create index submission_route_rules_version_priority_idx
  on public.submission_route_rules (questionnaire_version_id, priority) where active;
create index declaration_templates_version_active_idx
  on public.declaration_templates (questionnaire_version_id) where active;
create index submission_declarations_template_idx
  on public.submission_declarations (declaration_template_id);

alter table public.submission_route_rules enable row level security;
alter table public.submission_route_rules force row level security;
alter table public.declaration_templates enable row level security;
alter table public.declaration_templates force row level security;
alter table public.submission_declarations enable row level security;
alter table public.submission_declarations force row level security;

revoke all on public.submission_route_rules, public.declaration_templates, public.submission_declarations from anon, authenticated;
grant select on public.submission_route_rules, public.declaration_templates, public.submission_declarations to authenticated;
grant all on public.submission_route_rules, public.declaration_templates, public.submission_declarations to service_role;

create policy submission_route_rules_select_authorized
on public.submission_route_rules for select to authenticated
using (exists (
  select 1 from public.submission_periods sp
  where sp.questionnaire_version_id = submission_route_rules.questionnaire_version_id
));

create policy declaration_templates_select_authorized
on public.declaration_templates for select to authenticated
using (exists (
  select 1 from public.submission_periods sp
  where sp.questionnaire_version_id = declaration_templates.questionnaire_version_id
));

create policy submission_declarations_select_authorized
on public.submission_declarations for select to authenticated
using (exists (
  select 1 from public.submissions s where s.id = submission_declarations.submission_id
));

-- Browser roles never receive direct workflow writes. All mutations below derive the actor
-- from auth.uid(), validate membership and state, and run atomically in PostgreSQL.
create or replace function private.can_mutate_submission(target_submission_id uuid, actor_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.submissions s
    join public.tenant_fsps tf on tf.id = s.tenant_fsp_id
    join public.fsp_users fu on fu.fsp_id = tf.fsp_id
    where s.id = target_submission_id
      and tf.status = 'ACTIVE'
      and fu.user_id = actor_id
      and fu.status = 'ACTIVE'
      and fu.role in ('ADMIN', 'SUBMITTER')
  );
$$;

create or replace function private.submission_answer_json(target_submission_id uuid, target_question_id uuid)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  result jsonb;
begin
  select case
    when qt.code = 'MULTI_SELECT' then (
      select coalesce(jsonb_agg(vso.code order by vso.sort_order), '[]'::jsonb)
      from public.submission_response_options sro
      join public.value_set_options vso on vso.id = sro.value_set_option_id
      where sro.response_id = sr.id
    )
    when sr.selected_option_id is not null then to_jsonb(vso.code)
    when sr.text_value is not null then to_jsonb(sr.text_value)
    when sr.numeric_value is not null then to_jsonb(sr.numeric_value)
    when sr.date_value is not null then to_jsonb(sr.date_value::text)
    when sr.boolean_value is not null then to_jsonb(sr.boolean_value)
    else null
  end into result
  from public.submission_responses sr
  join public.questionnaire_questions qq on qq.id = sr.questionnaire_question_id
  join public.questions q on q.id = qq.question_id
  join public.question_types qt on qt.id = q.question_type_id
  left join public.value_set_options vso on vso.id = sr.selected_option_id
  where sr.submission_id = target_submission_id
    and sr.questionnaire_question_id = target_question_id;
  return result;
end;
$$;

create or replace function private.condition_matches(
  target_submission_id uuid,
  source_question_id uuid,
  condition_operator text,
  expected jsonb
)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare answer jsonb := private.submission_answer_json(target_submission_id, source_question_id);
begin
  if condition_operator = 'IS_EMPTY' then return answer is null or answer = 'null'::jsonb or answer = '[]'::jsonb or answer = '""'::jsonb; end if;
  if condition_operator = 'IS_NOT_EMPTY' then return not private.condition_matches(target_submission_id, source_question_id, 'IS_EMPTY', expected); end if;
  if answer is null then return false; end if;
  if condition_operator = 'EQUALS' then return answer = expected; end if;
  if condition_operator = 'NOT_EQUALS' then return answer <> expected; end if;
  if condition_operator = 'IN' then return jsonb_typeof(expected) = 'array' and expected @> jsonb_build_array(answer); end if;
  if condition_operator = 'NOT_IN' then return not (jsonb_typeof(expected) = 'array' and expected @> jsonb_build_array(answer)); end if;
  if condition_operator = 'GREATER_THAN' then return (answer #>> '{}')::numeric > (expected #>> '{}')::numeric; end if;
  if condition_operator = 'LESS_THAN' then return (answer #>> '{}')::numeric < (expected #>> '{}')::numeric; end if;
  return false;
exception when invalid_text_representation then return false;
end;
$$;

create or replace function private.question_is_visible(target_submission_id uuid, target_question_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select not exists (
    select 1
    from public.question_conditions qc
    where qc.questionnaire_question_id = target_question_id
      and (
        (qc.action = 'SHOW' and not private.condition_matches(target_submission_id, qc.source_questionnaire_question_id, qc.operator, qc.comparison_value))
        or (qc.action = 'HIDE' and private.condition_matches(target_submission_id, qc.source_questionnaire_question_id, qc.operator, qc.comparison_value))
      )
  );
$$;

create or replace function private.derive_submission_route(target_submission_id uuid)
returns varchar
language plpgsql
set search_path = ''
as $$
declare
  result varchar(20);
  old_route varchar(20);
  actor_id uuid := (select auth.uid());
  version_id uuid;
  tenant_id uuid;
  fsp_id uuid;
begin
  select s.submission_route, sp.questionnaire_version_id, sp.tenant_id, tf.fsp_id
  into old_route, version_id, tenant_id, fsp_id
  from public.submissions s
  join public.submission_periods sp on sp.id = s.submission_period_id
  join public.tenant_fsps tf on tf.id = s.tenant_fsp_id
  where s.id = target_submission_id;

  select rr.submission_route into result
  from public.submission_route_rules rr
  where rr.questionnaire_version_id = version_id
    and rr.active
    and private.condition_matches(target_submission_id, rr.source_questionnaire_question_id, rr.operator, rr.comparison_value)
  order by rr.priority, rr.id
  limit 1;

  if result is distinct from old_route then
    update public.submissions set submission_route = result where id = target_submission_id;
    if result is not null then
      insert into public.audit_events (tenant_id, fsp_id, submission_id, actor_user_id, event_type, entity_type, entity_id, metadata)
      values (tenant_id, fsp_id, target_submission_id, actor_id,
        'SUBMISSION_ROUTE_DETERMINED', 'SUBMISSION', target_submission_id,
        jsonb_build_object('route', result));
    end if;
  end if;
  return result;
end;
$$;

create or replace function private.start_submission(target_period_id uuid, target_tenant_fsp_id uuid)
returns table (submission_id uuid, submission_status varchar, submission_route varchar)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  context_row record;
  existing public.submissions%rowtype;
begin
  if actor_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select sp.*, tf.fsp_id, tf.status as relationship_status, qv.status as version_status
  into context_row
  from public.submission_periods sp
  join public.tenant_fsps tf on tf.id = target_tenant_fsp_id and tf.tenant_id = sp.tenant_id
  join public.questionnaire_versions qv on qv.id = sp.questionnaire_version_id
  where sp.id = target_period_id;
  if not found then raise exception 'Submission context not found' using errcode = 'P0002'; end if;
  if not exists (select 1 from public.fsp_users fu where fu.fsp_id = context_row.fsp_id and fu.user_id = actor_id and fu.status = 'ACTIVE' and fu.role in ('ADMIN','SUBMITTER')) then
    raise exception 'Submission access denied' using errcode = '42501';
  end if;
  if context_row.relationship_status <> 'ACTIVE' or context_row.status <> 'OPEN'
     or (now() at time zone 'Africa/Johannesburg')::date not between context_row.open_date and context_row.close_date then
    raise exception 'Submission period is not open' using errcode = '22023';
  end if;
  if context_row.version_status <> 'PUBLISHED' or not exists (select 1 from public.questionnaire_sections qs where qs.questionnaire_version_id = context_row.questionnaire_version_id) then
    raise exception 'Questionnaire configuration is unavailable' using errcode = '55000';
  end if;

  insert into public.submissions (submission_period_id, tenant_fsp_id, status, started_by, start_date)
  values (target_period_id, target_tenant_fsp_id, 'IN_PROGRESS', actor_id, now())
  on conflict (submission_period_id, tenant_fsp_id) do nothing
  returning * into existing;

  if existing.id is null then
    select * into existing from public.submissions
    where submission_period_id = target_period_id and tenant_fsp_id = target_tenant_fsp_id for update;
    if existing.status = 'NOT_STARTED' then
      update public.submissions set status='IN_PROGRESS', started_by=actor_id, start_date=now()
      where id=existing.id returning * into existing;
    end if;
  end if;

  if existing.start_date is not null and existing.started_by = actor_id
     and not exists (select 1 from public.audit_events ae where ae.submission_id=existing.id and ae.event_type='SUBMISSION_STARTED') then
    insert into public.audit_events (tenant_id,fsp_id,submission_id,actor_user_id,event_type,entity_type,entity_id)
    values (context_row.tenant_id,context_row.fsp_id,existing.id,actor_id,'SUBMISSION_STARTED','SUBMISSION',existing.id);
  end if;
  return query select existing.id, existing.status, existing.submission_route;
end;
$$;

create or replace function private.save_submission_response(target_submission_id uuid, target_question_id uuid, target_value jsonb)
returns table (response_id uuid, submission_route varchar)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  s public.submissions%rowtype;
  meta record;
  saved_id uuid;
  option_id uuid;
  numeric_answer numeric;
  text_answer text;
begin
  if actor_id is null or not private.can_mutate_submission(target_submission_id, actor_id) then raise exception 'Submission access denied' using errcode='42501'; end if;
  select * into s from public.submissions where id=target_submission_id for update;
  if s.status <> 'IN_PROGRESS' then raise exception 'Submission is read only' using errcode='55000'; end if;
  select qt.code as type_code, q.validation_rules, q.value_set_id, qq.read_only
  into meta
  from public.questionnaire_questions qq
  join public.questions q on q.id=qq.question_id
  join public.question_types qt on qt.id=q.question_type_id
  join public.submission_periods sp on sp.questionnaire_version_id=qq.questionnaire_version_id
  where qq.id=target_question_id and sp.id=s.submission_period_id;
  if not found then raise exception 'Question does not belong to submission questionnaire' using errcode='22023'; end if;
  if meta.read_only then raise exception 'Question is read only' using errcode='42501'; end if;

  if target_value is null or target_value = 'null'::jsonb then
    select id into saved_id from public.submission_responses where submission_id=target_submission_id and questionnaire_question_id=target_question_id;
    if saved_id is not null then delete from public.submission_response_options where response_id=saved_id; delete from public.submission_responses where id=saved_id; end if;
    delete from public.submission_declarations where submission_id=target_submission_id;
    return query select null::uuid, private.derive_submission_route(target_submission_id); return;
  end if;

  if meta.type_code in ('TEXT','TEXTAREA','MONTH') then
    if jsonb_typeof(target_value) <> 'string' then raise exception 'Text answer required' using errcode='22023'; end if;
    text_answer := target_value #>> '{}';
    if meta.type_code='MONTH' and text_answer !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then raise exception 'Valid month required' using errcode='22023'; end if;
    if meta.validation_rules ? 'minLength' and length(text_answer) < (meta.validation_rules->>'minLength')::int then raise exception 'Answer is too short' using errcode='22023'; end if;
    if meta.validation_rules ? 'maxLength' and length(text_answer) > (meta.validation_rules->>'maxLength')::int then raise exception 'Answer is too long' using errcode='22023'; end if;
    if meta.validation_rules ? 'pattern' and text_answer !~ (meta.validation_rules->>'pattern') then raise exception 'Answer format is invalid' using errcode='22023'; end if;
  elsif meta.type_code in ('NUMBER','CURRENCY','PERCENTAGE') then
    if jsonb_typeof(target_value) <> 'number' then raise exception 'Numeric answer required' using errcode='22023'; end if;
    numeric_answer := (target_value #>> '{}')::numeric;
    if coalesce(meta.validation_rules->>'minimum',meta.validation_rules->>'min') is not null and numeric_answer < coalesce(meta.validation_rules->>'minimum',meta.validation_rules->>'min')::numeric then raise exception 'Answer is below minimum' using errcode='22023'; end if;
    if coalesce(meta.validation_rules->>'maximum',meta.validation_rules->>'max') is not null and numeric_answer > coalesce(meta.validation_rules->>'maximum',meta.validation_rules->>'max')::numeric then raise exception 'Answer is above maximum' using errcode='22023'; end if;
  elsif meta.type_code='DATE' then
    if jsonb_typeof(target_value)<>'string' or (target_value#>>'{}') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Valid date required' using errcode='22023'; end if;
  elsif meta.type_code='BOOLEAN' then
    if jsonb_typeof(target_value)<>'boolean' then raise exception 'Boolean answer required' using errcode='22023'; end if;
  elsif meta.type_code='SINGLE_SELECT' then
    if jsonb_typeof(target_value)<>'string' then raise exception 'Option required' using errcode='22023'; end if;
    option_id := (target_value#>>'{}')::uuid;
    if not exists(select 1 from public.value_set_options where id=option_id and value_set_id=meta.value_set_id and active) then raise exception 'Invalid option' using errcode='22023'; end if;
  elsif meta.type_code='MULTI_SELECT' then
    if jsonb_typeof(target_value)<>'array' then raise exception 'Option array required' using errcode='22023'; end if;
    if exists(select 1 from jsonb_array_elements_text(target_value) x where not exists(select 1 from public.value_set_options v where v.id=x::uuid and v.value_set_id=meta.value_set_id and v.active)) then raise exception 'Invalid option' using errcode='22023'; end if;
  else raise exception 'Unsupported question type' using errcode='22023';
  end if;

  insert into public.submission_responses (submission_id,questionnaire_question_id,text_value,numeric_value,date_value,boolean_value,selected_option_id,answered_by,answered_date)
  values (target_submission_id,target_question_id,
    case when meta.type_code in ('TEXT','TEXTAREA','MONTH') then text_answer end,
    case when meta.type_code in ('NUMBER','CURRENCY','PERCENTAGE') then numeric_answer end,
    case when meta.type_code='DATE' then (target_value#>>'{}')::date end,
    case when meta.type_code='BOOLEAN' then (target_value#>>'{}')::boolean end,
    case when meta.type_code='SINGLE_SELECT' then option_id end,
    actor_id,now())
  on conflict (submission_id,questionnaire_question_id) do update set
    text_value=excluded.text_value,numeric_value=excluded.numeric_value,date_value=excluded.date_value,
    boolean_value=excluded.boolean_value,selected_option_id=excluded.selected_option_id,
    answered_by=actor_id,answered_date=now()
  returning id into saved_id;

  delete from public.submission_response_options where response_id=saved_id;
  if meta.type_code='MULTI_SELECT' then
    insert into public.submission_response_options(response_id,value_set_option_id)
    select saved_id, value::uuid from jsonb_array_elements_text(target_value);
  end if;
  delete from public.submission_declarations where submission_id=target_submission_id;
  return query select saved_id, private.derive_submission_route(target_submission_id);
end;
$$;

create or replace function private.acknowledge_submission_declaration(target_submission_id uuid)
returns table (declaration_id uuid, accepted_date timestamptz, declarant_name varchar)
language plpgsql security definer set search_path=''
as $$
declare actor_id uuid := (select auth.uid()); s public.submissions%rowtype; template_id uuid; person_name varchar; result public.submission_declarations%rowtype;
begin
  if actor_id is null or not private.can_mutate_submission(target_submission_id,actor_id) then raise exception 'Submission access denied' using errcode='42501'; end if;
  select * into s from public.submissions where id=target_submission_id for update;
  if s.status<>'IN_PROGRESS' or private.derive_submission_route(target_submission_id)<>'AFFIDAVIT' then raise exception 'Affidavit declaration is unavailable' using errcode='55000'; end if;
  select dt.id into template_id from public.declaration_templates dt join public.submission_periods sp on sp.questionnaire_version_id=dt.questionnaire_version_id where sp.id=s.submission_period_id and dt.active order by dt.version_number desc limit 1;
  if template_id is null then raise exception 'Declaration configuration is unavailable' using errcode='55000'; end if;
  select nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),'') into person_name from public.profiles p where p.id=actor_id and p.active;
  if person_name is null then raise exception 'Declarant profile is incomplete' using errcode='22023'; end if;
  insert into public.submission_declarations(submission_id,declaration_template_id,declarant_user_id,declarant_name)
  values(target_submission_id,template_id,actor_id,person_name)
  on conflict(submission_id) do update set declaration_template_id=excluded.declaration_template_id,declarant_user_id=actor_id,declarant_name=person_name,accepted_date=now()
  returning * into result;
  insert into public.audit_events(tenant_id,fsp_id,submission_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  select sp.tenant_id,tf.fsp_id,s.id,actor_id,'AFFIDAVIT_DECLARATION_ACCEPTED','SUBMISSION_DECLARATION',result.id,jsonb_build_object('declaration_template_id',template_id)
  from public.submission_periods sp join public.tenant_fsps tf on tf.id=s.tenant_fsp_id where sp.id=s.submission_period_id;
  return query select result.id,result.accepted_date,result.declarant_name;
end;
$$;

create or replace function private.prepare_certificate_upload(target_submission_id uuid,target_filename text,target_mime_type text,target_size_bytes bigint,target_sha256 text)
returns table(document_id uuid,document_version_id uuid,storage_path text)
language plpgsql security definer set search_path=''
as $$
declare actor_id uuid := (select auth.uid()); s public.submissions%rowtype; context_row record; doc_id uuid; version_id uuid:=gen_random_uuid(); object_path text;
begin
  if actor_id is null or not private.can_mutate_submission(target_submission_id,actor_id) then raise exception 'Submission access denied' using errcode='42501'; end if;
  select * into s from public.submissions where id=target_submission_id for update;
  if s.status<>'IN_PROGRESS' or private.derive_submission_route(target_submission_id)<>'CERTIFICATE' then raise exception 'Certificate upload is unavailable' using errcode='55000'; end if;
  if target_mime_type<>'application/pdf' or target_size_bytes<1 or target_size_bytes>4194304 or lower(target_filename) !~ '\.pdf$' or target_sha256 !~ '^[0-9a-f]{64}$' then raise exception 'Invalid certificate file' using errcode='22023'; end if;
  select sp.tenant_id,tf.fsp_id into context_row from public.submission_periods sp join public.tenant_fsps tf on tf.id=s.tenant_fsp_id where sp.id=s.submission_period_id;
  select id into doc_id from public.documents where submission_id=s.id and document_type='BBEEE_CERTIFICATE' order by create_date limit 1 for update;
  if doc_id is null then insert into public.documents(submission_id,document_type,status,created_by) values(s.id,'BBEEE_CERTIFICATE','PENDING',actor_id) returning id into doc_id; end if;
  object_path:=format('tenant/%s/fsp/%s/submission/%s/%s',context_row.tenant_id,context_row.fsp_id,s.id,version_id);
  insert into public.document_versions(id,document_id,storage_path,original_filename,mime_type,size_bytes,sha256,uploaded_by) values(version_id,doc_id,object_path,target_filename,target_mime_type,target_size_bytes,target_sha256,actor_id);
  return query select doc_id,version_id,object_path;
end;
$$;

create or replace function private.finalize_certificate_upload(target_document_version_id uuid)
returns table(document_id uuid,document_version_id uuid)
language plpgsql security definer set search_path=''
as $$
declare actor_id uuid := (select auth.uid()); context_row record;
begin
  select d.id as doc_id,d.submission_id,dv.storage_path,dv.uploaded_by,sp.tenant_id,tf.fsp_id
  into context_row from public.document_versions dv join public.documents d on d.id=dv.document_id join public.submissions s on s.id=d.submission_id join public.submission_periods sp on sp.id=s.submission_period_id join public.tenant_fsps tf on tf.id=s.tenant_fsp_id where dv.id=target_document_version_id for update of d;
  if not found or actor_id is null or context_row.uploaded_by<>actor_id or not private.can_mutate_submission(context_row.submission_id,actor_id) then raise exception 'Document access denied' using errcode='42501'; end if;
  if not exists(select 1 from storage.objects o where o.bucket_id='compliance-documents' and o.name=context_row.storage_path) then raise exception 'Uploaded object not found' using errcode='P0002'; end if;
  update public.documents set current_version_id=target_document_version_id,status='ACTIVE' where id=context_row.doc_id;
  insert into public.audit_events(tenant_id,fsp_id,submission_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values(context_row.tenant_id,context_row.fsp_id,context_row.submission_id,actor_id,'DOCUMENT_VERSION_CREATED','DOCUMENT',context_row.doc_id,jsonb_build_object('document_version_id',target_document_version_id));
  return query select context_row.doc_id,target_document_version_id;
end;
$$;

create or replace function private.cancel_certificate_upload(target_document_version_id uuid)
returns void language plpgsql security definer set search_path=''
as $$
declare actor_id uuid := (select auth.uid()); row_data record;
begin
  select dv.document_id,d.submission_id into row_data from public.document_versions dv join public.documents d on d.id=dv.document_id where dv.id=target_document_version_id and dv.uploaded_by=actor_id;
  if not found or not private.can_mutate_submission(row_data.submission_id,actor_id) then raise exception 'Document access denied' using errcode='42501'; end if;
  delete from public.document_versions where id=target_document_version_id and not exists(select 1 from public.documents d where d.current_version_id=target_document_version_id);
  delete from public.documents where id=row_data.document_id and current_version_id is null and not exists(select 1 from public.document_versions where document_id=row_data.document_id);
end;
$$;

create or replace function private.submit_submission(target_submission_id uuid)
returns table(submission_id uuid,submission_status varchar,submit_date timestamptz)
language plpgsql security definer set search_path=''
as $$
declare actor_id uuid := (select auth.uid()); s public.submissions%rowtype; context_row record; q record; answer_present boolean; route varchar;
begin
  if actor_id is null or not private.can_mutate_submission(target_submission_id,actor_id) then raise exception 'Submission access denied' using errcode='42501'; end if;
  select * into s from public.submissions where id=target_submission_id for update;
  if s.status='SUBMITTED' then return query select s.id,s.status,s.submit_date; return; end if;
  if s.status<>'IN_PROGRESS' then raise exception 'Submission is not mutable' using errcode='55000'; end if;
  select sp.*,tf.fsp_id into context_row from public.submission_periods sp join public.tenant_fsps tf on tf.id=s.tenant_fsp_id and tf.tenant_id=sp.tenant_id where sp.id=s.submission_period_id;
  if context_row.status<>'OPEN' or (now() at time zone 'Africa/Johannesburg')::date not between context_row.open_date and context_row.close_date then raise exception 'Submission period is closed' using errcode='22023'; end if;
  for q in select qq.id,qq.required from public.questionnaire_questions qq where qq.questionnaire_version_id=context_row.questionnaire_version_id loop
    if private.question_is_visible(s.id,q.id) and (q.required or exists(select 1 from public.question_conditions qc where qc.questionnaire_question_id=q.id and qc.action='REQUIRE' and private.condition_matches(s.id,qc.source_questionnaire_question_id,qc.operator,qc.comparison_value))) then
      select exists(select 1 from public.submission_responses sr where sr.submission_id=s.id and sr.questionnaire_question_id=q.id and (num_nonnulls(sr.text_value,sr.numeric_value,sr.date_value,sr.boolean_value,sr.selected_option_id)>0 or exists(select 1 from public.submission_response_options sro where sro.response_id=sr.id))) into answer_present;
      if not answer_present then raise exception 'Required questionnaire answers are incomplete' using errcode='22023'; end if;
    end if;
  end loop;
  route:=private.derive_submission_route(s.id);
  if route is null then raise exception 'Submission route cannot be determined' using errcode='22023'; end if;
  if route='CERTIFICATE' and not exists(select 1 from public.documents d join public.document_versions dv on dv.id=d.current_version_id join storage.objects o on o.bucket_id='compliance-documents' and o.name=dv.storage_path where d.submission_id=s.id and d.document_type='BBEEE_CERTIFICATE' and d.status='ACTIVE') then raise exception 'A current certificate is required' using errcode='22023'; end if;
  if route='AFFIDAVIT' and not exists(select 1 from public.submission_declarations sd join public.declaration_templates dt on dt.id=sd.declaration_template_id where sd.submission_id=s.id and dt.questionnaire_version_id=context_row.questionnaire_version_id and dt.active) then raise exception 'Declaration acknowledgement is required' using errcode='22023'; end if;
  update public.submissions set status='SUBMITTED',submission_route=route,submitted_by=actor_id,submit_date=now() where id=s.id returning * into s;
  insert into public.audit_events(tenant_id,fsp_id,submission_id,actor_user_id,event_type,entity_type,entity_id,metadata) values(context_row.tenant_id,context_row.fsp_id,s.id,actor_id,'SUBMISSION_SUBMITTED','SUBMISSION',s.id,jsonb_build_object('route',route));
  return query select s.id,s.status,s.submit_date;
end;
$$;

-- Exposed gateways contain no privilege escalation. The private implementations are not in a Data API schema.
create function public.start_submission(target_period_id uuid,target_tenant_fsp_id uuid)
returns table(submission_id uuid,submission_status varchar,submission_route varchar) language sql security invoker set search_path='' as $$select * from private.start_submission(target_period_id,target_tenant_fsp_id)$$;
create function public.save_submission_response(target_submission_id uuid,target_question_id uuid,target_value jsonb)
returns table(response_id uuid,submission_route varchar) language sql security invoker set search_path='' as $$select * from private.save_submission_response(target_submission_id,target_question_id,target_value)$$;
create function public.acknowledge_submission_declaration(target_submission_id uuid)
returns table(declaration_id uuid,accepted_date timestamptz,declarant_name varchar) language sql security invoker set search_path='' as $$select * from private.acknowledge_submission_declaration(target_submission_id)$$;
create function public.prepare_certificate_upload(target_submission_id uuid,target_filename text,target_mime_type text,target_size_bytes bigint,target_sha256 text)
returns table(document_id uuid,document_version_id uuid,storage_path text) language sql security invoker set search_path='' as $$select * from private.prepare_certificate_upload(target_submission_id,target_filename,target_mime_type,target_size_bytes,target_sha256)$$;
create function public.finalize_certificate_upload(target_document_version_id uuid)
returns table(document_id uuid,document_version_id uuid) language sql security invoker set search_path='' as $$select * from private.finalize_certificate_upload(target_document_version_id)$$;
create function public.cancel_certificate_upload(target_document_version_id uuid)
returns void language sql security invoker set search_path='' as $$select private.cancel_certificate_upload(target_document_version_id)$$;
create function public.submit_submission(target_submission_id uuid)
returns table(submission_id uuid,submission_status varchar,submit_date timestamptz) language sql security invoker set search_path='' as $$select * from private.submit_submission(target_submission_id)$$;

revoke all on function private.can_mutate_submission(uuid,uuid),private.submission_answer_json(uuid,uuid),private.condition_matches(uuid,uuid,text,jsonb),private.question_is_visible(uuid,uuid),private.derive_submission_route(uuid),private.start_submission(uuid,uuid),private.save_submission_response(uuid,uuid,jsonb),private.acknowledge_submission_declaration(uuid),private.prepare_certificate_upload(uuid,text,text,bigint,text),private.finalize_certificate_upload(uuid),private.cancel_certificate_upload(uuid),private.submit_submission(uuid) from public,anon;
grant execute on function private.start_submission(uuid,uuid),private.save_submission_response(uuid,uuid,jsonb),private.acknowledge_submission_declaration(uuid),private.prepare_certificate_upload(uuid,text,text,bigint,text),private.finalize_certificate_upload(uuid),private.cancel_certificate_upload(uuid),private.submit_submission(uuid) to authenticated;
revoke all on function public.start_submission(uuid,uuid),public.save_submission_response(uuid,uuid,jsonb),public.acknowledge_submission_declaration(uuid),public.prepare_certificate_upload(uuid,text,text,bigint,text),public.finalize_certificate_upload(uuid),public.cancel_certificate_upload(uuid),public.submit_submission(uuid) from public,anon;
grant execute on function public.start_submission(uuid,uuid),public.save_submission_response(uuid,uuid,jsonb),public.acknowledge_submission_declaration(uuid),public.prepare_certificate_upload(uuid,text,text,bigint,text),public.finalize_certificate_upload(uuid),public.cancel_certificate_upload(uuid),public.submit_submission(uuid) to authenticated;

-- Prototype, version-bound route/declaration configuration. This is explicitly not legal advice.
insert into public.submission_route_rules(questionnaire_version_id,source_questionnaire_question_id,operator,comparison_value,submission_route,priority)
select qv.id,qq.id,'EQUALS',to_jsonb('LT_10M'::text),'AFFIDAVIT',10
from public.questionnaire_versions qv join public.questionnaires qn on qn.id=qv.questionnaire_id join public.questionnaire_questions qq on qq.questionnaire_version_id=qv.id join public.questions q on q.id=qq.question_id
where qn.code='ANNUAL_BBEEE' and qv.version_number=1 and q.code='ANNUAL_REVENUE';
insert into public.submission_route_rules(questionnaire_version_id,source_questionnaire_question_id,operator,comparison_value,submission_route,priority)
select qv.id,qq.id,'IN','["10M_TO_25M","GT_25M"]'::jsonb,'CERTIFICATE',20
from public.questionnaire_versions qv join public.questionnaires qn on qn.id=qv.questionnaire_id join public.questionnaire_questions qq on qq.questionnaire_version_id=qv.id join public.questions q on q.id=qq.question_id
where qn.code='ANNUAL_BBEEE' and qv.version_number=1 and q.code='ANNUAL_REVENUE';
insert into public.declaration_templates(questionnaire_version_id,code,version_number,title,declaration_text)
select qv.id,'PROTOTYPE_EME_DECLARATION',1,'B-BBEE declaration acknowledgement','I confirm that the information in this submission is complete and accurate to the best of my knowledge, and I acknowledge that this authenticated acceptance is not a qualified digital signature.'
from public.questionnaire_versions qv join public.questionnaires qn on qn.id=qv.questionnaire_id
where qn.code='ANNUAL_BBEEE' and qv.version_number=1;

update storage.buckets set public=false,file_size_limit=4194304,allowed_mime_types=array['application/pdf']::text[] where id='compliance-documents';
drop policy if exists compliance_documents_insert_authorized on storage.objects;
create policy compliance_documents_insert_authorized on storage.objects for insert to authenticated with check (
  bucket_id='compliance-documents'
  and storage.objects.name ~ '^tenant/[0-9a-f-]{36}/fsp/[0-9a-f-]{36}/submission/[0-9a-f-]{36}/[0-9a-f-]{36}$'
  and exists(select 1 from public.submissions s join public.submission_periods sp on sp.id=s.submission_period_id join public.tenant_fsps tf on tf.id=s.tenant_fsp_id and tf.tenant_id=sp.tenant_id join public.fsp_users fu on fu.fsp_id=tf.fsp_id where s.id::text=(storage.foldername(storage.objects.name))[6] and sp.tenant_id::text=(storage.foldername(storage.objects.name))[2] and tf.fsp_id::text=(storage.foldername(storage.objects.name))[4] and s.status='IN_PROGRESS' and fu.user_id=(select auth.uid()) and fu.status='ACTIVE' and fu.role in('ADMIN','SUBMITTER'))
);
