create table public.question_types (
  id uuid primary key default gen_random_uuid(),
  code varchar(40) not null,
  name varchar(120) not null,
  data_type varchar(30) not null,
  allows_value_set boolean not null default false,
  allows_multiple_values boolean not null default false,
  active boolean not null default true,
  constraint question_types_code_key unique (code),
  constraint question_types_code_format check (code ~ '^[A-Z][A-Z0-9_]*$'),
  constraint question_types_data_type_check check (data_type in ('TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'OPTION')),
  constraint question_types_multiple_requires_values check (not allows_multiple_values or allows_value_set)
);

create table public.value_sets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete restrict,
  code varchar(80) not null,
  name varchar(160) not null,
  description text,
  system boolean not null default false,
  active boolean not null default true,
  create_date timestamptz not null default now(),
  update_date timestamptz not null default now(),
  constraint value_sets_tenant_code_key unique nulls not distinct (tenant_id, code),
  constraint value_sets_code_format check (code ~ '^[A-Z][A-Z0-9_]*$'),
  constraint value_sets_system_scope_check check ((system and tenant_id is null) or not system)
);

create table public.value_set_options (
  id uuid primary key default gen_random_uuid(),
  value_set_id uuid not null references public.value_sets(id) on delete restrict,
  code varchar(80) not null,
  label varchar(255) not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  metadata jsonb,
  create_date timestamptz not null default now(),
  constraint value_set_options_value_set_code_key unique (value_set_id, code),
  constraint value_set_options_code_format check (code ~ '^[A-Z0-9][A-Z0-9_]*$'),
  constraint value_set_options_sort_order_check check (sort_order >= 0),
  constraint value_set_options_metadata_object check (metadata is null or jsonb_typeof(metadata) = 'object')
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete restrict,
  code varchar(100) not null,
  question_type_id uuid not null references public.question_types(id) on delete restrict,
  value_set_id uuid references public.value_sets(id) on delete restrict,
  label varchar(500) not null,
  help_text text,
  placeholder varchar(255),
  validation_rules jsonb,
  system boolean not null default false,
  active boolean not null default true,
  create_date timestamptz not null default now(),
  update_date timestamptz not null default now(),
  constraint questions_tenant_code_key unique nulls not distinct (tenant_id, code),
  constraint questions_code_format check (code ~ '^[A-Z][A-Z0-9_]*$'),
  constraint questions_system_scope_check check ((system and tenant_id is null) or not system),
  constraint questions_validation_rules_object check (validation_rules is null or jsonb_typeof(validation_rules) = 'object')
);

create table public.questionnaires (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete restrict,
  code varchar(100) not null,
  name varchar(255) not null,
  description text,
  active boolean not null default true,
  create_date timestamptz not null default now(),
  constraint questionnaires_tenant_code_key unique nulls not distinct (tenant_id, code),
  constraint questionnaires_code_format check (code ~ '^[A-Z][A-Z0-9_]*$')
);

create table public.questionnaire_versions (
  id uuid primary key default gen_random_uuid(),
  questionnaire_id uuid not null references public.questionnaires(id) on delete restrict,
  version_number integer not null,
  status varchar(20) not null default 'DRAFT',
  effective_from date,
  effective_to date,
  published_date timestamptz,
  published_by uuid references public.profiles(id) on delete restrict,
  create_date timestamptz not null default now(),
  constraint questionnaire_versions_number_key unique (questionnaire_id, version_number),
  constraint questionnaire_versions_number_check check (version_number > 0),
  constraint questionnaire_versions_status_check check (status in ('DRAFT', 'PUBLISHED', 'RETIRED')),
  constraint questionnaire_versions_effective_dates_check check (effective_to is null or effective_from is null or effective_to >= effective_from),
  constraint questionnaire_versions_publication_check check (
    (status = 'DRAFT' and published_date is null and published_by is null)
    or (status in ('PUBLISHED', 'RETIRED') and published_date is not null and published_by is not null)
  )
);

create table public.questionnaire_sections (
  id uuid primary key default gen_random_uuid(),
  questionnaire_version_id uuid not null references public.questionnaire_versions(id) on delete restrict,
  code varchar(100) not null,
  title varchar(255) not null,
  description text,
  sort_order integer not null,
  constraint questionnaire_sections_version_code_key unique (questionnaire_version_id, code),
  constraint questionnaire_sections_id_version_key unique (id, questionnaire_version_id),
  constraint questionnaire_sections_code_format check (code ~ '^[A-Z][A-Z0-9_]*$'),
  constraint questionnaire_sections_sort_order_check check (sort_order >= 0)
);

create table public.questionnaire_questions (
  id uuid primary key default gen_random_uuid(),
  questionnaire_version_id uuid not null references public.questionnaire_versions(id) on delete restrict,
  section_id uuid not null,
  question_id uuid not null references public.questions(id) on delete restrict,
  sort_order integer not null,
  required boolean not null default false,
  read_only boolean not null default false,
  default_value jsonb,
  constraint questionnaire_questions_version_question_key unique (questionnaire_version_id, question_id),
  constraint questionnaire_questions_id_version_key unique (id, questionnaire_version_id),
  constraint questionnaire_questions_section_version_fk foreign key (section_id, questionnaire_version_id)
    references public.questionnaire_sections(id, questionnaire_version_id) on delete restrict,
  constraint questionnaire_questions_sort_order_check check (sort_order >= 0)
);

create table public.question_conditions (
  id uuid primary key default gen_random_uuid(),
  questionnaire_question_id uuid not null references public.questionnaire_questions(id) on delete restrict,
  source_questionnaire_question_id uuid not null references public.questionnaire_questions(id) on delete restrict,
  operator varchar(30) not null,
  comparison_value jsonb,
  action varchar(20) not null,
  sort_order integer not null default 0,
  constraint question_conditions_distinct_questions check (questionnaire_question_id <> source_questionnaire_question_id),
  constraint question_conditions_operator_check check (operator in ('EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN', 'GREATER_THAN', 'LESS_THAN', 'IS_EMPTY', 'IS_NOT_EMPTY')),
  constraint question_conditions_action_check check (action in ('SHOW', 'HIDE', 'REQUIRE', 'DISABLE')),
  constraint question_conditions_sort_order_check check (sort_order >= 0)
);

create index value_sets_tenant_id_idx on public.value_sets (tenant_id) where tenant_id is not null;
create index value_set_options_value_set_id_idx on public.value_set_options (value_set_id);
create index questions_tenant_id_idx on public.questions (tenant_id) where tenant_id is not null;
create index questions_question_type_id_idx on public.questions (question_type_id);
create index questions_value_set_id_idx on public.questions (value_set_id) where value_set_id is not null;
create index questionnaires_tenant_id_idx on public.questionnaires (tenant_id) where tenant_id is not null;
create index questionnaire_versions_questionnaire_id_idx on public.questionnaire_versions (questionnaire_id);
create index questionnaire_sections_version_id_idx on public.questionnaire_sections (questionnaire_version_id);
create index questionnaire_questions_version_id_idx on public.questionnaire_questions (questionnaire_version_id);
create index questionnaire_questions_section_id_idx on public.questionnaire_questions (section_id);
create index questionnaire_questions_question_id_idx on public.questionnaire_questions (question_id);
create index question_conditions_target_idx on public.question_conditions (questionnaire_question_id);
create index question_conditions_source_idx on public.question_conditions (source_questionnaire_question_id);

create trigger value_sets_set_update_date before update on public.value_sets
for each row execute function private.set_update_date();
create trigger questions_set_update_date before update on public.questions
for each row execute function private.set_update_date();

comment on table public.value_set_options is
  'Options are retired with active=false rather than deleted so historical responses remain interpretable.';
comment on table public.questionnaire_versions is
  'Published versions are immutable through application workflows; direct browser writes are not granted.';
