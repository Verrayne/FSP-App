create or replace function platform_private.generate_internal_code(
  target_label text,
  target_prefix text,
  target_max_length integer
)
returns text
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  clean_label text;
  suffix text;
begin
  if target_max_length < 12 then
    raise exception 'Generated-code length must be at least 12 characters' using errcode = '22023';
  end if;

  clean_label := trim(both '_' from regexp_replace(upper(coalesce(btrim(target_label), '')), '[^A-Z0-9]+', '_', 'g'));
  if clean_label = '' then
    clean_label := upper(target_prefix);
  elsif clean_label !~ '^[A-Z]' then
    clean_label := upper(target_prefix) || '_' || clean_label;
  end if;

  suffix := '_' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  return left(clean_label, target_max_length - length(suffix)) || suffix;
end;
$$;

create or replace function platform_private.create_platform_value_set_impl(
  target_code text,
  target_name text,
  target_description text,
  target_options jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := platform_private.require_platform_admin();
  created_id uuid;
  item jsonb;
  ordinal integer := 0;
  clean_code text := platform_private.generate_internal_code(target_name, 'VALUE_SET', 80);
  option_code text;
  option_label text;
begin
  if length(btrim(target_name)) < 2 then
    raise exception 'A valid value-set name is required' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(target_options, '[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(target_options, '[]'::jsonb)) = 0 then
    raise exception 'Add at least one option' using errcode = '22023';
  end if;

  insert into public.value_sets(tenant_id, code, name, description, system)
  values (null, clean_code, btrim(target_name), nullif(btrim(target_description), ''), true)
  returning id into created_id;

  for item in select value from jsonb_array_elements(target_options) loop
    ordinal := ordinal + 10;
    option_label := btrim(item->>'label');
    if option_label = '' then
      raise exception 'Every option requires a label' using errcode = '22023';
    end if;
    option_code := platform_private.generate_internal_code(option_label, 'OPTION', 80);
    insert into public.value_set_options(value_set_id, code, label, sort_order)
    values (created_id, option_code, option_label, ordinal);
  end loop;

  insert into public.audit_events(actor_user_id, event_type, entity_type, entity_id, metadata)
  values (actor_id, 'PLATFORM_VALUE_SET_CREATED', 'VALUE_SET', created_id, jsonb_build_object('code', clean_code));
  return created_id;
end;
$$;

create or replace function platform_private.create_platform_question_impl(
  target_code text,
  target_label text,
  target_help_text text,
  target_question_type_id uuid,
  target_value_set_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := platform_private.require_platform_admin();
  created_id uuid;
  type_row public.question_types;
  clean_code text := platform_private.generate_internal_code(target_label, 'QUESTION', 100);
begin
  select * into type_row from public.question_types where id = target_question_type_id and active;
  if not found or length(btrim(target_label)) < 2 then
    raise exception 'A valid question label and type are required' using errcode = '22023';
  end if;
  if target_value_set_id is not null and (not type_row.allows_value_set or not exists (
    select 1 from public.value_sets vs
    where vs.id = target_value_set_id and vs.tenant_id is null and vs.system and vs.active
  )) then
    raise exception 'The selected value set is not available for this question type' using errcode = '22023';
  end if;
  if type_row.allows_value_set and target_value_set_id is null then
    raise exception 'This question type requires a value set' using errcode = '22023';
  end if;

  insert into public.questions(tenant_id, code, question_type_id, value_set_id, label, help_text, system)
  values (null, clean_code, target_question_type_id, target_value_set_id, btrim(target_label), nullif(btrim(target_help_text), ''), true)
  returning id into created_id;
  insert into public.audit_events(actor_user_id, event_type, entity_type, entity_id, metadata)
  values (actor_id, 'PLATFORM_QUESTION_CREATED', 'QUESTION', created_id, jsonb_build_object('code', clean_code));
  return created_id;
end;
$$;

create or replace function platform_private.create_platform_questionnaire_impl(
  target_tenant_id uuid,
  target_code text,
  target_name text,
  target_description text
)
returns table(questionnaire_id uuid, version_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := platform_private.require_platform_admin();
  q_id uuid;
  v_id uuid;
  clean_code text := platform_private.generate_internal_code(target_name, 'QUESTIONNAIRE', 100);
begin
  if target_tenant_id is not null and not exists (
    select 1 from public.tenants where id = target_tenant_id and active
  ) then
    raise exception 'Tenant not found or inactive' using errcode = '22023';
  end if;
  if length(btrim(target_name)) < 2 then
    raise exception 'A valid questionnaire name is required' using errcode = '22023';
  end if;

  insert into public.questionnaires(tenant_id, code, name, description)
  values (target_tenant_id, clean_code, btrim(target_name), nullif(btrim(target_description), ''))
  returning id into q_id;
  insert into public.questionnaire_versions(questionnaire_id, version_number)
  values (q_id, 1)
  returning id into v_id;
  insert into public.audit_events(tenant_id, actor_user_id, event_type, entity_type, entity_id, metadata)
  values (target_tenant_id, actor_id, 'PLATFORM_QUESTIONNAIRE_CREATED', 'QUESTIONNAIRE', q_id, jsonb_build_object('code', clean_code));
  return query select q_id, v_id;
end;
$$;

create or replace function platform_private.add_platform_questionnaire_section_impl(
  target_version_id uuid,
  target_code text,
  target_title text,
  target_description text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := platform_private.require_platform_admin();
  created_id uuid;
  next_order integer;
  clean_code text := platform_private.generate_internal_code(target_title, 'SECTION', 100);
begin
  perform 1 from public.questionnaire_versions where id = target_version_id and status = 'DRAFT' for update;
  if not found then
    raise exception 'Only draft questionnaire versions can be edited' using errcode = '55000';
  end if;
  if length(btrim(target_title)) < 2 then
    raise exception 'A valid section title is required' using errcode = '22023';
  end if;

  select coalesce(max(sort_order), 0) + 10 into next_order
  from public.questionnaire_sections where questionnaire_version_id = target_version_id;
  insert into public.questionnaire_sections(questionnaire_version_id, code, title, description, sort_order)
  values (target_version_id, clean_code, btrim(target_title), nullif(btrim(target_description), ''), next_order)
  returning id into created_id;
  insert into public.audit_events(actor_user_id, event_type, entity_type, entity_id)
  values (actor_id, 'PLATFORM_QUESTIONNAIRE_SECTION_ADDED', 'QUESTIONNAIRE_SECTION', created_id);
  return created_id;
end;
$$;

revoke all on function platform_private.generate_internal_code(text, text, integer) from public, anon, authenticated;

comment on function platform_private.generate_internal_code(text, text, integer) is
  'Generates opaque, valid internal identifiers so platform users never need to supply business-facing codes.';
