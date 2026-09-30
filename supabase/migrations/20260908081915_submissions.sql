create table public.submission_periods (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  questionnaire_version_id uuid not null references public.questionnaire_versions(id) on delete restrict,
  name varchar(255) not null,
  year integer not null,
  open_date date not null,
  close_date date not null,
  status varchar(20) not null default 'DRAFT',
  create_date timestamptz not null default now(),
  constraint submission_periods_tenant_year_name_key unique (tenant_id, year, name),
  constraint submission_periods_year_check check (year between 2000 and 2200),
  constraint submission_periods_dates_check check (close_date >= open_date),
  constraint submission_periods_status_check check (status in ('DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED'))
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  submission_period_id uuid not null references public.submission_periods(id) on delete restrict,
  tenant_fsp_id uuid not null references public.tenant_fsps(id) on delete restrict,
  status varchar(30) not null default 'NOT_STARTED',
  submission_route varchar(20),
  started_by uuid references public.profiles(id) on delete restrict,
  start_date timestamptz,
  submitted_by uuid references public.profiles(id) on delete restrict,
  submit_date timestamptz,
  create_date timestamptz not null default now(),
  update_date timestamptz not null default now(),
  constraint submissions_period_fsp_key unique (submission_period_id, tenant_fsp_id),
  constraint submissions_status_check check (status in ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW', 'COMPLETED', 'REJECTED')),
  constraint submissions_route_check check (submission_route is null or submission_route in ('CERTIFICATE', 'AFFIDAVIT')),
  constraint submissions_start_fields_check check (
    (status = 'NOT_STARTED' and started_by is null and start_date is null)
    or (status <> 'NOT_STARTED' and started_by is not null and start_date is not null)
  ),
  constraint submissions_submit_fields_check check (
    (status in ('NOT_STARTED', 'IN_PROGRESS') and submitted_by is null and submit_date is null)
    or (status in ('SUBMITTED', 'UNDER_REVIEW', 'COMPLETED', 'REJECTED') and submitted_by is not null and submit_date is not null)
  )
);

create table public.submission_responses (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete restrict,
  questionnaire_question_id uuid not null references public.questionnaire_questions(id) on delete restrict,
  text_value text,
  numeric_value numeric(18,4),
  date_value date,
  boolean_value boolean,
  selected_option_id uuid references public.value_set_options(id) on delete restrict,
  answered_by uuid references public.profiles(id) on delete restrict,
  answered_date timestamptz,
  update_date timestamptz not null default now(),
  constraint submission_responses_submission_question_key unique (submission_id, questionnaire_question_id),
  constraint submission_responses_single_scalar_value check (
    num_nonnulls(text_value, numeric_value, date_value, boolean_value, selected_option_id) <= 1
  ),
  constraint submission_responses_answer_pair check (
    (answered_by is null and answered_date is null)
    or (answered_by is not null and answered_date is not null)
  )
);

create table public.submission_response_options (
  response_id uuid not null references public.submission_responses(id) on delete restrict,
  value_set_option_id uuid not null references public.value_set_options(id) on delete restrict,
  primary key (response_id, value_set_option_id)
);

create index submission_periods_tenant_id_idx on public.submission_periods (tenant_id);
create index submission_periods_questionnaire_version_idx on public.submission_periods (questionnaire_version_id);
create index submissions_tenant_fsp_id_idx on public.submissions (tenant_fsp_id);
create index submissions_period_id_idx on public.submissions (submission_period_id);
create index submission_responses_submission_id_idx on public.submission_responses (submission_id);
create index submission_responses_question_idx on public.submission_responses (questionnaire_question_id);
create index submission_response_options_option_idx on public.submission_response_options (value_set_option_id);

create trigger submissions_set_update_date before update on public.submissions
for each row execute function private.set_update_date();
create trigger submission_responses_set_update_date before update on public.submission_responses
for each row execute function private.set_update_date();

create or replace function private.validate_submission_tenant()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.submission_periods sp
    join public.tenant_fsps tf on tf.id = new.tenant_fsp_id
    where sp.id = new.submission_period_id
      and sp.tenant_id = tf.tenant_id
  ) then
    raise exception 'Submission period and tenant-FSP relationship must belong to the same tenant'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.validate_submission_tenant() from public, anon, authenticated;
create trigger submissions_validate_tenant
before insert or update of submission_period_id, tenant_fsp_id on public.submissions
for each row execute function private.validate_submission_tenant();

create or replace function private.validate_submission_response()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  expected_version uuid;
  question_value_set uuid;
begin
  select sp.questionnaire_version_id
    into expected_version
  from public.submissions s
  join public.submission_periods sp on sp.id = s.submission_period_id
  where s.id = new.submission_id;

  if not exists (
    select 1 from public.questionnaire_questions qq
    where qq.id = new.questionnaire_question_id
      and qq.questionnaire_version_id = expected_version
  ) then
    raise exception 'Response question must belong to the submission questionnaire version'
      using errcode = '23514';
  end if;

  if new.selected_option_id is not null then
    select q.value_set_id
      into question_value_set
    from public.questionnaire_questions qq
    join public.questions q on q.id = qq.question_id
    where qq.id = new.questionnaire_question_id;

    if not exists (
      select 1 from public.value_set_options vso
      where vso.id = new.selected_option_id
        and vso.value_set_id = question_value_set
    ) then
      raise exception 'Selected option must belong to the question value set'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.validate_submission_response() from public, anon, authenticated;
create trigger submission_responses_validate
before insert or update of submission_id, questionnaire_question_id, selected_option_id
on public.submission_responses
for each row execute function private.validate_submission_response();

create or replace function private.validate_multi_select_option()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.submission_responses sr
    join public.questionnaire_questions qq on qq.id = sr.questionnaire_question_id
    join public.questions q on q.id = qq.question_id
    join public.question_types qt on qt.id = q.question_type_id
    join public.value_set_options vso on vso.id = new.value_set_option_id
    where sr.id = new.response_id
      and qt.allows_multiple_values
      and q.value_set_id = vso.value_set_id
  ) then
    raise exception 'Multi-select option must belong to a multi-select question value set'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.validate_multi_select_option() from public, anon, authenticated;
create trigger submission_response_options_validate
before insert or update on public.submission_response_options
for each row execute function private.validate_multi_select_option();
