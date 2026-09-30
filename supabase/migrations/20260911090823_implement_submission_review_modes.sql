-- Prompt 11: immutable submission attempts, tenant review modes, human decisions,
-- and a durable fail-closed AI review job boundary.

alter table public.submission_periods
  add column review_mode varchar(30) not null default 'HUMAN_REVIEW',
  add constraint submission_periods_review_mode_check
    check (review_mode in ('AUTOMATIC_ACCEPTANCE','HUMAN_REVIEW','AI_REVIEW'));

alter table public.submissions add column review_mode varchar(30);
update public.submissions set review_mode='HUMAN_REVIEW' where review_mode is null;
alter table public.submissions
  alter column review_mode set default 'HUMAN_REVIEW',
  alter column review_mode set not null,
  add constraint submissions_review_mode_check
    check (review_mode in ('AUTOMATIC_ACCEPTANCE','HUMAN_REVIEW','AI_REVIEW'));

alter table public.submissions drop constraint submissions_status_check;
alter table public.submissions add constraint submissions_status_check check (status in (
  'NOT_STARTED','IN_PROGRESS','SUBMITTED','UNDER_REVIEW','HUMAN_REVIEW_REQUIRED',
  'CHANGES_REQUESTED','COMPLETED','REJECTED'
));
alter table public.submissions drop constraint submissions_submit_fields_check;
alter table public.submissions add constraint submissions_submit_fields_check check (
  (status in ('NOT_STARTED','IN_PROGRESS') and submitted_by is null and submit_date is null)
  or (status in ('SUBMITTED','UNDER_REVIEW','HUMAN_REVIEW_REQUIRED','CHANGES_REQUESTED','COMPLETED','REJECTED')
      and submitted_by is not null and submit_date is not null)
);

create table public.submission_attempts (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete restrict,
  attempt_number integer not null,
  review_mode varchar(30) not null,
  submission_route varchar(20) not null,
  submitted_by uuid not null references public.profiles(id) on delete restrict,
  submit_date timestamptz not null default now(),
  questionnaire_version_id uuid not null references public.questionnaire_versions(id) on delete restrict,
  response_snapshot jsonb not null,
  declaration_snapshot jsonb,
  create_date timestamptz not null default now(),
  constraint submission_attempts_submission_number_key unique(submission_id,attempt_number),
  constraint submission_attempts_number_check check(attempt_number>0),
  constraint submission_attempts_review_mode_check check(review_mode in ('AUTOMATIC_ACCEPTANCE','HUMAN_REVIEW','AI_REVIEW')),
  constraint submission_attempts_route_check check(submission_route in ('CERTIFICATE','AFFIDAVIT')),
  constraint submission_attempts_response_snapshot_check check(jsonb_typeof(response_snapshot)='array')
);

create table public.submission_attempt_documents (
  attempt_id uuid not null references public.submission_attempts(id) on delete restrict,
  document_id uuid not null references public.documents(id) on delete restrict,
  document_version_id uuid not null references public.document_versions(id) on delete restrict,
  primary key(attempt_id,document_id),
  constraint submission_attempt_documents_version_key unique(attempt_id,document_version_id)
);

create table public.submission_reviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete restrict,
  attempt_id uuid not null references public.submission_attempts(id) on delete restrict,
  review_type varchar(20) not null,
  status varchar(20) not null default 'PENDING',
  outcome varchar(30),
  reviewer_id uuid references public.profiles(id) on delete restrict,
  summary text,
  provider varchar(100),
  model varchar(150),
  config_version varchar(50),
  rule_set_version varchar(50),
  retry_count integer not null default 0,
  create_date timestamptz not null default now(),
  start_date timestamptz,
  complete_date timestamptz,
  constraint submission_reviews_type_check check(review_type in ('AUTOMATIC','HUMAN','AI')),
  constraint submission_reviews_status_check check(status in ('PENDING','PROCESSING','COMPLETED','FAILED')),
  constraint submission_reviews_outcome_check check(outcome is null or outcome in ('COMPLETE','CHANGES_REQUESTED','REJECTED','ESCALATED','TECHNICAL_FAILURE')),
  constraint submission_reviews_retry_check check(retry_count between 0 and 3),
  constraint submission_reviews_human_actor_check check(review_type='HUMAN' or reviewer_id is null)
);

create table public.submission_review_findings (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.submission_reviews(id) on delete restrict,
  code varchar(100),
  category varchar(100) not null,
  severity varchar(20) not null,
  title varchar(255) not null,
  description text not null,
  source varchar(30) not null,
  questionnaire_question_id uuid references public.questionnaire_questions(id) on delete restrict,
  document_id uuid references public.documents(id) on delete restrict,
  resolution_status varchar(20) not null default 'OPEN',
  confidence varchar(20),
  fsp_visible boolean not null default false,
  create_date timestamptz not null default now(),
  constraint submission_review_findings_severity_check check(severity in ('INFO','WARNING','BLOCKING')),
  constraint submission_review_findings_source_check check(source in ('DETERMINISTIC_RULE','AI','HUMAN','SYSTEM')),
  constraint submission_review_findings_resolution_check check(resolution_status in ('OPEN','RESOLVED','ACCEPTED')),
  constraint submission_review_findings_confidence_check check(confidence is null or confidence in ('LOW','MEDIUM','HIGH'))
);

create table public.submission_status_history (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete restrict,
  from_status varchar(30),
  to_status varchar(30) not null,
  actor_id uuid references public.profiles(id) on delete restrict,
  actor_type varchar(20) not null,
  review_id uuid references public.submission_reviews(id) on delete restrict,
  reason text,
  occurrence_date timestamptz not null default now(),
  constraint submission_status_history_actor_check check(actor_type in ('USER','SYSTEM','AI'))
);

create table public.ai_review_jobs (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete restrict,
  attempt_id uuid not null references public.submission_attempts(id) on delete restrict,
  review_id uuid not null references public.submission_reviews(id) on delete restrict,
  status varchar(20) not null default 'QUEUED',
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  available_date timestamptz not null default now(),
  locked_date timestamptz,
  worker_id text,
  error_category varchar(100),
  create_date timestamptz not null default now(),
  complete_date timestamptz,
  constraint ai_review_jobs_review_key unique(review_id),
  constraint ai_review_jobs_status_check check(status in ('QUEUED','PROCESSING','COMPLETED','FAILED','STALE')),
  constraint ai_review_jobs_attempts_check check(attempt_count between 0 and max_attempts and max_attempts between 1 and 5)
);

create table private.system_capabilities (
  capability text primary key,
  enabled boolean not null default false,
  update_date timestamptz not null default now()
);
insert into private.system_capabilities(capability,enabled) values('AI_REVIEW',false);
revoke all on private.system_capabilities from public,anon,authenticated;

create index submission_attempts_submission_idx on public.submission_attempts(submission_id,attempt_number desc);
create index submission_attempts_submitted_by_idx on public.submission_attempts(submitted_by);
create index submission_attempts_questionnaire_idx on public.submission_attempts(questionnaire_version_id);
create index submission_attempt_documents_document_idx on public.submission_attempt_documents(document_id);
create index submission_attempt_documents_version_idx on public.submission_attempt_documents(document_version_id);
create index submission_reviews_submission_idx on public.submission_reviews(submission_id,create_date desc);
create index submission_reviews_attempt_idx on public.submission_reviews(attempt_id);
create index submission_reviews_reviewer_idx on public.submission_reviews(reviewer_id) where reviewer_id is not null;
create index submission_reviews_pending_idx on public.submission_reviews(review_type,status,create_date) where status in ('PENDING','PROCESSING','FAILED');
create index submission_review_findings_review_idx on public.submission_review_findings(review_id,severity);
create index submission_review_findings_question_idx on public.submission_review_findings(questionnaire_question_id) where questionnaire_question_id is not null;
create index submission_review_findings_document_idx on public.submission_review_findings(document_id) where document_id is not null;
create index submission_status_history_submission_idx on public.submission_status_history(submission_id,occurrence_date,id);
create index submission_status_history_actor_idx on public.submission_status_history(actor_id) where actor_id is not null;
create index submission_status_history_review_idx on public.submission_status_history(review_id) where review_id is not null;
create index ai_review_jobs_ready_idx on public.ai_review_jobs(available_date,create_date) where status='QUEUED';
create index ai_review_jobs_submission_idx on public.ai_review_jobs(submission_id,create_date desc);
create index ai_review_jobs_attempt_idx on public.ai_review_jobs(attempt_id);
create index submissions_review_queue_idx on public.submissions(status,submission_period_id,submit_date desc)
  where status in ('UNDER_REVIEW','HUMAN_REVIEW_REQUIRED');
create index submissions_review_mode_idx on public.submissions(review_mode,submission_period_id);

alter table public.submission_attempts enable row level security;
alter table public.submission_attempts force row level security;
alter table public.submission_attempt_documents enable row level security;
alter table public.submission_attempt_documents force row level security;
alter table public.submission_reviews enable row level security;
alter table public.submission_reviews force row level security;
alter table public.submission_review_findings enable row level security;
alter table public.submission_review_findings force row level security;
alter table public.submission_status_history enable row level security;
alter table public.submission_status_history force row level security;
alter table public.ai_review_jobs enable row level security;
alter table public.ai_review_jobs force row level security;

revoke all on public.submission_attempts,public.submission_attempt_documents,public.submission_reviews,
  public.submission_review_findings,public.submission_status_history,public.ai_review_jobs from public,anon,authenticated;
grant select on public.submission_status_history to authenticated;

create policy submission_status_history_read on public.submission_status_history for select to authenticated using (
  exists(select 1 from public.submissions s where s.id=submission_id)
);

-- Establish a durable baseline for pre-Prompt-11 submissions without inventing prior events.
insert into public.submission_status_history(submission_id,from_status,to_status,actor_id,actor_type,reason,occurrence_date)
select s.id,null,s.status,s.submitted_by,case when s.submitted_by is null then 'SYSTEM' else 'USER' end,
  'Status at review-workflow migration',coalesce(s.submit_date,s.start_date,s.create_date)
from public.submissions s;

insert into public.submission_attempts(submission_id,attempt_number,review_mode,submission_route,submitted_by,submit_date,
  questionnaire_version_id,response_snapshot,declaration_snapshot)
select s.id,1,'HUMAN_REVIEW',s.submission_route,s.submitted_by,s.submit_date,sp.questionnaire_version_id,
  coalesce((select jsonb_agg(jsonb_build_object('questionnaire_question_id',sr.questionnaire_question_id,'text_value',sr.text_value,
    'numeric_value',sr.numeric_value,'date_value',sr.date_value,'boolean_value',sr.boolean_value,'selected_option_id',sr.selected_option_id,
    'selected_option_ids',coalesce((select jsonb_agg(sro.value_set_option_id order by sro.value_set_option_id) from public.submission_response_options sro where sro.response_id=sr.id),'[]'::jsonb)) order by sr.questionnaire_question_id)
    from public.submission_responses sr where sr.submission_id=s.id),'[]'::jsonb),
  (select jsonb_build_object('template_id',sd.declaration_template_id,'declarant_user_id',sd.declarant_user_id,'declarant_name',sd.declarant_name,'accepted_date',sd.accepted_date)
    from public.submission_declarations sd where sd.submission_id=s.id)
from public.submissions s join public.submission_periods sp on sp.id=s.submission_period_id
where s.status in ('SUBMITTED','UNDER_REVIEW','COMPLETED','REJECTED') and s.submission_route is not null and s.submitted_by is not null and s.submit_date is not null;

insert into public.submission_attempt_documents(attempt_id,document_id,document_version_id)
select sa.id,d.id,d.current_version_id from public.submission_attempts sa join public.documents d on d.submission_id=sa.submission_id
where d.current_version_id is not null and d.status='ACTIVE';

insert into public.submission_reviews(submission_id,attempt_id,review_type,status,outcome,reviewer_id,summary,start_date,complete_date)
select s.id,sa.id,'HUMAN',case when s.status in ('COMPLETED','REJECTED') then 'COMPLETED' else 'PENDING' end,
  case when s.status='COMPLETED' then 'COMPLETE' when s.status='REJECTED' then 'REJECTED' end,null,
  'Migrated from the pre-review workflow',s.submit_date,case when s.status in ('COMPLETED','REJECTED') then s.update_date end
from public.submissions s join public.submission_attempts sa on sa.submission_id=s.id and sa.attempt_number=1
where s.status in ('SUBMITTED','UNDER_REVIEW','COMPLETED','REJECTED');

create or replace function private.has_tenant_review_access(target_tenant_id uuid,target_user_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select target_user_id is not null and exists(
    select 1 from public.tenant_memberships tm join public.tenants t on t.id=tm.tenant_id
    where tm.tenant_id=target_tenant_id and tm.user_id=target_user_id and tm.status='ACTIVE'
      and tm.role in ('ADMIN','REVIEWER') and t.active and t.status='ACTIVE'
  );
$$;

create or replace function private.ai_review_available()
returns boolean language sql stable security definer set search_path='' as $$
  select coalesce((select enabled from private.system_capabilities where capability='AI_REVIEW'),false);
$$;

create or replace function private.can_view_review_submission(target_submission_id uuid,target_user_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select target_user_id is not null and exists(
    select 1 from public.submissions s join public.tenant_fsps tf on tf.id=s.tenant_fsp_id
    join public.fsp_users fu on fu.fsp_id=tf.fsp_id
    where s.id=target_submission_id and fu.user_id=target_user_id and fu.status='ACTIVE'
  );
$$;

create or replace function private.transition_submission(
  target_submission_id uuid,target_to_status text,target_actor_id uuid,target_actor_type text,
  target_review_id uuid default null,target_reason text default null
)
returns void language plpgsql security definer set search_path='' as $$
declare current_status text;
begin
  select status into current_status from public.submissions where id=target_submission_id for update;
  if not found then raise exception 'Submission unavailable' using errcode='P0002'; end if;
  if current_status=target_to_status then return; end if;
  if not (
    (current_status='IN_PROGRESS' and target_to_status='SUBMITTED') or
    (current_status='CHANGES_REQUESTED' and target_to_status='IN_PROGRESS') or
    (current_status='SUBMITTED' and target_to_status in ('COMPLETED','UNDER_REVIEW','HUMAN_REVIEW_REQUIRED')) or
    (current_status in ('UNDER_REVIEW','HUMAN_REVIEW_REQUIRED') and target_to_status in ('COMPLETED','CHANGES_REQUESTED','REJECTED')) or
    (current_status='HUMAN_REVIEW_REQUIRED' and target_to_status='SUBMITTED')
  ) then raise exception 'Invalid submission status transition' using errcode='55000'; end if;
  if target_actor_type not in ('USER','SYSTEM','AI') or (target_actor_type='USER' and target_actor_id is null) then
    raise exception 'Invalid transition actor' using errcode='22023';
  end if;
  update public.submissions set status=target_to_status,
    submitted_by=case when target_to_status='IN_PROGRESS' then null when target_to_status='SUBMITTED' then target_actor_id else submitted_by end,
    submit_date=case when target_to_status='IN_PROGRESS' then null when target_to_status='SUBMITTED' then now() else submit_date end
  where id=target_submission_id;
  insert into public.submission_status_history(submission_id,from_status,to_status,actor_id,actor_type,review_id,reason)
    values(target_submission_id,current_status,target_to_status,target_actor_id,target_actor_type,target_review_id,nullif(btrim(target_reason),''));
end; $$;

create or replace function private.list_tenant_settings_periods_v2_impl(target_tenant_id uuid)
returns table(period_id uuid,period_name text,period_year integer,stored_status text,display_status text,open_date date,close_date date,
  questionnaire_version_id uuid,questionnaire_name text,questionnaire_version integer,review_mode text,ai_review_available boolean,submission_count bigint)
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.is_active_tenant_admin(target_tenant_id,auth.uid()) then raise exception 'Tenant administration denied' using errcode='42501'; end if;
  return query select sp.id,sp.name::text,sp.year,sp.status::text,
    (case when sp.status='DRAFT' then 'DRAFT' when sp.status in ('CLOSED','ARCHIVED') or sp.close_date<current_date then 'CLOSED'
      when sp.open_date>current_date then 'UPCOMING' else 'OPEN' end)::text,sp.open_date,sp.close_date,sp.questionnaire_version_id,
    q.name::text,qv.version_number,sp.review_mode::text,private.ai_review_available(),count(s.id)::bigint
  from public.submission_periods sp join public.questionnaire_versions qv on qv.id=sp.questionnaire_version_id
  join public.questionnaires q on q.id=qv.questionnaire_id left join public.submissions s on s.submission_period_id=sp.id
  where sp.tenant_id=target_tenant_id group by sp.id,q.name,qv.version_number order by sp.open_date desc,sp.id;
end; $$;

create or replace function private.create_tenant_submission_period_v2_impl(target_tenant_id uuid,target_name text,target_year integer,
  target_open_date date,target_close_date date,target_questionnaire_version_id uuid,target_status text,target_review_mode text)
returns table(period_id uuid) language plpgsql security definer set search_path='' as $$
declare actor_id uuid:=auth.uid(); created public.submission_periods;
begin
  perform 1 from public.tenants where id=target_tenant_id for update;
  if not found or actor_id is null or not private.is_active_tenant_admin(target_tenant_id,actor_id) then raise exception 'Tenant administration denied' using errcode='42501'; end if;
  if btrim(target_name)='' or length(btrim(target_name))>255 or target_year not between 2000 and 2200 or target_open_date>=target_close_date
    or target_status not in ('DRAFT','OPEN') or target_review_mode not in ('AUTOMATIC_ACCEPTANCE','HUMAN_REVIEW','AI_REVIEW') then raise exception 'Invalid submission period' using errcode='22023'; end if;
  if target_review_mode='AI_REVIEW' and not private.ai_review_available() then raise exception 'AI Review is not operationally available' using errcode='55000'; end if;
  if not private.validate_period_questionnaire(target_tenant_id,target_questionnaire_version_id) then raise exception 'Questionnaire version unavailable' using errcode='22023'; end if;
  if target_status='OPEN' and exists(select 1 from public.submission_periods sp where sp.tenant_id=target_tenant_id and sp.status='OPEN'
    and daterange(sp.open_date,sp.close_date,'[]')&&daterange(target_open_date,target_close_date,'[]')) then raise exception 'Submission periods may not overlap' using errcode='23505'; end if;
  insert into public.submission_periods(tenant_id,questionnaire_version_id,name,year,open_date,close_date,status,review_mode)
    values(target_tenant_id,target_questionnaire_version_id,btrim(target_name),target_year,target_open_date,target_close_date,target_status,target_review_mode) returning * into created;
  insert into public.audit_events(tenant_id,actor_user_id,event_type,entity_type,entity_id,metadata)
    values(target_tenant_id,actor_id,'SUBMISSION_PERIOD_CREATED','SUBMISSION_PERIOD',created.id,jsonb_build_object('status',target_status,'year',target_year,'review_mode',target_review_mode));
  return query select created.id;
end; $$;

create or replace function private.update_tenant_submission_period_v2_impl(target_period_id uuid,target_name text,target_year integer,
  target_open_date date,target_close_date date,target_questionnaire_version_id uuid,target_status text,target_review_mode text)
returns void language plpgsql security definer set search_path='' as $$
declare actor_id uuid:=auth.uid(); row_data public.submission_periods; submissions_exist boolean;
begin
  select * into row_data from public.submission_periods where id=target_period_id;
  if not found then raise exception 'Submission period unavailable' using errcode='P0002'; end if;
  perform 1 from public.tenants where id=row_data.tenant_id for update;
  if actor_id is null or not private.is_active_tenant_admin(row_data.tenant_id,actor_id) then raise exception 'Submission period unavailable' using errcode='42501'; end if;
  select * into row_data from public.submission_periods where id=target_period_id for update;
  select exists(select 1 from public.submissions where submission_period_id=target_period_id) into submissions_exist;
  if btrim(target_name)='' or length(btrim(target_name))>255 or target_year not between 2000 and 2200 or target_open_date>=target_close_date
    or target_status not in ('DRAFT','OPEN','CLOSED') or target_review_mode not in ('AUTOMATIC_ACCEPTANCE','HUMAN_REVIEW','AI_REVIEW') then raise exception 'Invalid submission period' using errcode='22023'; end if;
  if target_review_mode='AI_REVIEW' and not private.ai_review_available() then raise exception 'AI Review is not operationally available' using errcode='55000'; end if;
  if row_data.status in ('CLOSED','ARCHIVED') then raise exception 'Historical submission periods are read-only' using errcode='55000'; end if;
  if submissions_exist and target_questionnaire_version_id<>row_data.questionnaire_version_id then raise exception 'Questionnaire version cannot change after submissions exist' using errcode='55000'; end if;
  if row_data.status='OPEN' and (target_year<>row_data.year or target_open_date<>row_data.open_date or target_questionnaire_version_id<>row_data.questionnaire_version_id or target_status='DRAFT') then raise exception 'Open period fields are protected' using errcode='55000'; end if;
  if not private.validate_period_questionnaire(row_data.tenant_id,target_questionnaire_version_id) then raise exception 'Questionnaire version unavailable' using errcode='22023'; end if;
  if target_status='OPEN' and exists(select 1 from public.submission_periods sp where sp.tenant_id=row_data.tenant_id and sp.id<>target_period_id and sp.status='OPEN'
    and daterange(sp.open_date,sp.close_date,'[]')&&daterange(target_open_date,target_close_date,'[]')) then raise exception 'Submission periods may not overlap' using errcode='23505'; end if;
  update public.submission_periods set name=btrim(target_name),year=target_year,open_date=target_open_date,close_date=target_close_date,
    questionnaire_version_id=target_questionnaire_version_id,status=target_status,review_mode=target_review_mode where id=target_period_id;
  insert into public.audit_events(tenant_id,actor_user_id,event_type,entity_type,entity_id,metadata)
    values(row_data.tenant_id,actor_id,'SUBMISSION_PERIOD_UPDATED','SUBMISSION_PERIOD',row_data.id,
      jsonb_build_object('status',target_status,'review_mode',target_review_mode,'previous_review_mode',row_data.review_mode,
        'existing_submissions_unchanged',submissions_exist,'questionnaire_changed',target_questionnaire_version_id<>row_data.questionnaire_version_id));
end; $$;

create or replace function private.list_tenant_review_submissions_impl(target_tenant_id uuid,target_today date,target_period_id uuid,
  search_query text,work_filter text,review_mode_filter text,route_filter text,sort_field text,sort_direction text,page_number integer,page_size integer)
returns table(submission_id uuid,tenant_fsp_id uuid,fsp_id uuid,fsp_number text,registered_name text,trade_name text,broker_reference text,
  period_id uuid,period_name text,period_year integer,submission_status text,submission_route text,review_mode text,review_status text,
  start_date timestamptz,submit_date timestamptz,total_count bigint)
language plpgsql stable security definer set search_path='' as $$
declare selected_period uuid:=target_period_id; escaped_search text;
begin
  if auth.uid() is null or not private.has_active_tenant_access(target_tenant_id,auth.uid()) then raise exception 'Insurer access denied' using errcode='42501'; end if;
  if work_filter not in ('NEEDS_REVIEW','AI_ESCALATED','CHANGES_REQUESTED','COMPLETE','REJECTED','ALL')
    or review_mode_filter not in ('ALL','AUTOMATIC_ACCEPTANCE','HUMAN_REVIEW','AI_REVIEW') or route_filter not in ('ALL','CERTIFICATE','AFFIDAVIT')
    or sort_field not in ('submit_date','fsp','status') or sort_direction not in ('asc','desc') or page_number<1 or page_size not in (10,25,50) then
    raise exception 'Invalid submission filters' using errcode='22023'; end if;
  if selected_period is null then select sp.id into selected_period from public.submission_periods sp where sp.tenant_id=target_tenant_id
    and sp.status='OPEN' and sp.open_date<=target_today and sp.close_date>=target_today order by sp.close_date,sp.id limit 1;
  elsif not exists(select 1 from public.submission_periods sp where sp.id=selected_period and sp.tenant_id=target_tenant_id) then raise exception 'Submission period unavailable' using errcode='P0002'; end if;
  if selected_period is null then return; end if;
  escaped_search:=replace(replace(replace(btrim(search_query),'\','\\'),'%','\%'),'_','\_');
  return query with rows as (
    select s.id,tf.id as relationship_id,f.id as global_fsp_id,f.fsp_number::text,f.registered_name::text,f.trade_name::text,
      tf.broker_reference::text,sp.id as selected_period_id,sp.name::text,sp.year,s.status::text as submission_status,
      s.submission_route::text as submission_route,s.review_mode::text as review_mode,
      (select sr.status::text from public.submission_reviews sr join public.submission_attempts sa on sa.id=sr.attempt_id
        where sr.submission_id=s.id order by sa.attempt_number desc,sr.create_date desc limit 1) as review_status,s.start_date,s.submit_date
    from public.submissions s join public.submission_periods sp on sp.id=s.submission_period_id
    join public.tenant_fsps tf on tf.id=s.tenant_fsp_id join public.fsps f on f.id=tf.fsp_id
    where sp.tenant_id=target_tenant_id and sp.id=selected_period
      and (work_filter='ALL' or (work_filter='NEEDS_REVIEW' and s.status in ('UNDER_REVIEW','HUMAN_REVIEW_REQUIRED'))
        or (work_filter='AI_ESCALATED' and s.status='HUMAN_REVIEW_REQUIRED') or (work_filter='CHANGES_REQUESTED' and s.status='CHANGES_REQUESTED')
        or (work_filter='COMPLETE' and s.status='COMPLETED') or (work_filter='REJECTED' and s.status='REJECTED'))
      and (review_mode_filter='ALL' or s.review_mode=review_mode_filter) and (route_filter='ALL' or s.submission_route=route_filter)
      and (escaped_search='' or f.registered_name ilike '%'||escaped_search||'%' escape '\' or coalesce(f.trade_name,'') ilike '%'||escaped_search||'%' escape '\'
        or f.fsp_number ilike '%'||escaped_search||'%' escape '\' or coalesce(tf.broker_reference,'') ilike '%'||escaped_search||'%' escape '\')
  ) select r.*,count(*) over()::bigint from rows r order by
    case when sort_field='submit_date' and sort_direction='asc' then coalesce(r.submit_date,r.start_date) end asc nulls last,
    case when sort_field='submit_date' and sort_direction='desc' then coalesce(r.submit_date,r.start_date) end desc nulls last,
    case when sort_field='fsp' and sort_direction='asc' then lower(coalesce(r.trade_name,r.registered_name)) end asc,
    case when sort_field='fsp' and sort_direction='desc' then lower(coalesce(r.trade_name,r.registered_name)) end desc,
    case when sort_field='status' and sort_direction='asc' then r.submission_status end asc,
    case when sort_field='status' and sort_direction='desc' then r.submission_status end desc,r.id
  limit page_size offset((page_number-1)*page_size);
end; $$;

create or replace function private.get_tenant_review_dashboard_impl(target_tenant_id uuid,target_today date)
returns table(total_fsps bigint,submitted_fsps bigint,outstanding_fsps bigint,needs_review_submissions bigint,completed_submissions bigint)
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.has_active_tenant_access(target_tenant_id,auth.uid()) then raise exception 'Insurer access denied' using errcode='42501'; end if;
  return query with cp as (select id from public.submission_periods where tenant_id=target_tenant_id and status='OPEN' and open_date<=target_today and close_date>=target_today order by close_date,id limit 1),
  portfolio as (select tf.id,s.status from public.tenant_fsps tf left join cp on true left join public.submissions s on s.tenant_fsp_id=tf.id and s.submission_period_id=cp.id where tf.tenant_id=target_tenant_id and tf.status='ACTIVE')
  select count(*)::bigint,count(*) filter(where status in ('SUBMITTED','UNDER_REVIEW','HUMAN_REVIEW_REQUIRED','CHANGES_REQUESTED','COMPLETED','REJECTED'))::bigint,
    count(*) filter(where status is null or status in ('NOT_STARTED','IN_PROGRESS','CHANGES_REQUESTED'))::bigint,
    count(*) filter(where status in ('UNDER_REVIEW','HUMAN_REVIEW_REQUIRED'))::bigint,count(*) filter(where status='COMPLETED')::bigint from portfolio;
end; $$;

create or replace function private.claim_ai_review_job_impl(target_worker_id text)
returns table(job_id uuid,submission_id uuid,attempt_id uuid,review_id uuid,attempt_count integer,max_attempts integer)
language plpgsql security definer set search_path='' as $$
declare picked public.ai_review_jobs;
begin
  if current_user not in ('service_role','postgres') then raise exception 'Worker access denied' using errcode='42501'; end if;
  if length(btrim(coalesce(target_worker_id,'')))<3 then raise exception 'Worker identity required' using errcode='22023'; end if;
  select * into picked from public.ai_review_jobs j where j.status='QUEUED' and j.available_date<=now()
    order by j.available_date,j.create_date for update skip locked limit 1;
  if not found then return; end if;
  if not exists(select 1 from public.submission_attempts sa join public.submissions s on s.id=sa.submission_id
    where sa.id=picked.attempt_id and s.id=picked.submission_id and s.status='SUBMITTED'
      and sa.attempt_number=(select max(sa2.attempt_number) from public.submission_attempts sa2 where sa2.submission_id=s.id)) then
    update public.ai_review_jobs set status='STALE',complete_date=now(),error_category='STALE_ATTEMPT' where id=picked.id;
    return;
  end if;
  update public.ai_review_jobs j set status='PROCESSING',attempt_count=j.attempt_count+1,locked_date=now(),worker_id=btrim(target_worker_id)
    where j.id=picked.id returning * into picked;
  update public.submission_reviews set status='PROCESSING',start_date=coalesce(start_date,now()),retry_count=picked.attempt_count-1 where id=picked.review_id;
  insert into public.audit_events(tenant_id,fsp_id,submission_id,event_type,entity_type,entity_id,metadata)
    select sp.tenant_id,tf.fsp_id,s.id,'AI_REVIEW_STARTED','SUBMISSION_REVIEW',picked.review_id,jsonb_build_object('attempt_id',picked.attempt_id,'attempt_count',picked.attempt_count)
    from public.submissions s join public.submission_periods sp on sp.id=s.submission_period_id join public.tenant_fsps tf on tf.id=s.tenant_fsp_id where s.id=picked.submission_id;
  return query select picked.id,picked.submission_id,picked.attempt_id,picked.review_id,picked.attempt_count,picked.max_attempts;
end; $$;

create or replace function private.get_ai_review_context_impl(target_job_id uuid)
returns table(job_id uuid,submission_id uuid,attempt_id uuid,review_id uuid,review_mode text,submission_route text,
  questionnaire_version_id uuid,response_snapshot jsonb,declaration_snapshot jsonb,document_snapshot jsonb)
language plpgsql stable security definer set search_path='' as $$
begin
  if current_user not in ('service_role','postgres') then raise exception 'Worker access denied' using errcode='42501'; end if;
  return query select j.id,j.submission_id,j.attempt_id,j.review_id,sa.review_mode::text,sa.submission_route::text,
    sa.questionnaire_version_id,sa.response_snapshot,sa.declaration_snapshot,
    coalesce((select jsonb_agg(jsonb_build_object('document_id',sad.document_id,'document_version_id',sad.document_version_id,
      'document_type',d.document_type,'mime_type',dv.mime_type,'size_bytes',dv.size_bytes,'sha256',dv.sha256,'storage_path',dv.storage_path)
      order by sad.document_id) from public.submission_attempt_documents sad join public.documents d on d.id=sad.document_id
      join public.document_versions dv on dv.id=sad.document_version_id where sad.attempt_id=sa.id),'[]'::jsonb)
  from public.ai_review_jobs j join public.submission_attempts sa on sa.id=j.attempt_id
  where j.id=target_job_id and j.status='PROCESSING';
end; $$;

create or replace function private.apply_ai_review_result_impl(
  target_job_id uuid,target_summary text,target_recommendation text,target_confidence text,target_findings jsonb,
  target_provider text,target_model text,target_config_version text,target_rule_set_version text
)
returns table(submission_status text,review_outcome text)
language plpgsql security definer set search_path='' as $$
declare j public.ai_review_jobs; s public.submissions; blocking boolean; unresolved boolean; result_status text; result_outcome text; tenant_id uuid; fsp_id uuid;
begin
  if current_user not in ('service_role','postgres') then raise exception 'Worker access denied' using errcode='42501'; end if;
  select * into j from public.ai_review_jobs where id=target_job_id for update;
  if not found then raise exception 'AI review job unavailable' using errcode='P0002'; end if;
  if j.status='COMPLETED' then select status into result_status from public.submissions where id=j.submission_id; return query select result_status,(select outcome from public.submission_reviews where id=j.review_id); return; end if;
  if j.status<>'PROCESSING' then raise exception 'AI review job is not processing' using errcode='55000'; end if;
  select * into s from public.submissions where id=j.submission_id for update;
  if s.status<>'SUBMITTED' or not exists(select 1 from public.submission_attempts sa where sa.id=j.attempt_id and sa.submission_id=s.id
      and sa.attempt_number=(select max(sa2.attempt_number) from public.submission_attempts sa2 where sa2.submission_id=s.id)) then
    update public.ai_review_jobs set status='STALE',complete_date=now(),error_category='STALE_ATTEMPT' where id=j.id;
    return query select s.status::text,'STALE'::text;
    return;
  end if;
  if target_recommendation not in ('COMPLETE','ESCALATE') or target_confidence not in ('LOW','MEDIUM','HIGH')
    or jsonb_typeof(target_findings)<>'array' or length(btrim(coalesce(target_summary,'')))<2
    or length(target_summary)>2000 then raise exception 'Invalid AI review result' using errcode='22023'; end if;
  if exists(select 1 from jsonb_array_elements(target_findings) f where
    coalesce(f->>'severity','') not in ('INFO','WARNING','BLOCKING') or coalesce(f->>'source','') not in ('DETERMINISTIC_RULE','AI','SYSTEM')
    or length(btrim(coalesce(f->>'title','')))<2 or length(btrim(coalesce(f->>'description','')))<2) then
    raise exception 'Invalid AI review findings' using errcode='22023';
  end if;
  delete from public.submission_review_findings where review_id=j.review_id;
  insert into public.submission_review_findings(review_id,code,category,severity,title,description,source,questionnaire_question_id,document_id,confidence,fsp_visible)
  select j.review_id,nullif(f->>'code',''),coalesce(nullif(f->>'category',''),'AI_REVIEW'),f->>'severity',left(f->>'title',255),f->>'description',f->>'source',
    case when coalesce(f->>'questionnaireQuestionId','')~'^[0-9a-f-]{36}$' then (f->>'questionnaireQuestionId')::uuid end,
    case when coalesce(f->>'documentId','')~'^[0-9a-f-]{36}$' then (f->>'documentId')::uuid end,
    case when f->>'confidence' in ('LOW','MEDIUM','HIGH') then f->>'confidence' end,false
  from jsonb_array_elements(target_findings) f;
  select exists(select 1 from public.submission_review_findings where review_id=j.review_id and severity='BLOCKING'),
    exists(select 1 from jsonb_array_elements(target_findings) f where lower(coalesce(f->>'unresolved','false'))='true') into blocking,unresolved;
  if target_recommendation='COMPLETE' and target_confidence='HIGH' and not blocking and not unresolved then result_status:='COMPLETED';result_outcome:='COMPLETE';
  else result_status:='HUMAN_REVIEW_REQUIRED';result_outcome:='ESCALATED'; end if;
  update public.submission_reviews set status='COMPLETED',outcome=result_outcome,summary=btrim(target_summary),provider=nullif(btrim(target_provider),''),
    model=nullif(btrim(target_model),''),config_version=target_config_version,rule_set_version=target_rule_set_version,complete_date=now() where id=j.review_id;
  update public.ai_review_jobs set status='COMPLETED',complete_date=now(),error_category=null where id=j.id;
  perform private.transition_submission(s.id,result_status,null,'AI',j.review_id,case when result_status='COMPLETED' then 'AI Review completed cleanly' else 'AI Review escalated to a human' end);
  select sp.tenant_id,tf.fsp_id into tenant_id,fsp_id from public.submission_periods sp join public.tenant_fsps tf on tf.id=s.tenant_fsp_id where sp.id=s.submission_period_id;
  insert into public.audit_events(tenant_id,fsp_id,submission_id,event_type,entity_type,entity_id,metadata)
    values(tenant_id,fsp_id,s.id,case when result_status='COMPLETED' then 'AI_REVIEW_COMPLETED' else 'AI_REVIEW_ESCALATED' end,
      'SUBMISSION_REVIEW',j.review_id,jsonb_build_object('attempt_id',j.attempt_id,'provider',target_provider,'model',target_model,'confidence',target_confidence));
  return query select result_status,result_outcome;
end; $$;

create or replace function private.fail_ai_review_job_impl(target_job_id uuid,target_error_category text)
returns table(job_status text,submission_status text)
language plpgsql security definer set search_path='' as $$
declare j public.ai_review_jobs; s public.submissions; next_available timestamptz; tenant_id uuid; fsp_id uuid;
begin
  if current_user not in ('service_role','postgres') then raise exception 'Worker access denied' using errcode='42501'; end if;
  select * into j from public.ai_review_jobs where id=target_job_id for update;
  if not found then raise exception 'AI review job unavailable' using errcode='P0002'; end if;
  select * into s from public.submissions where id=j.submission_id for update;
  if j.status<>'PROCESSING' then return query select j.status::text,s.status::text; return; end if;
  if j.attempt_count<j.max_attempts and s.status='SUBMITTED' then
    next_available:=now()+make_interval(secs=>least(300,30*(2^(j.attempt_count-1))::integer));
    update public.ai_review_jobs set status='QUEUED',available_date=next_available,locked_date=null,worker_id=null,error_category=left(target_error_category,100) where id=j.id;
    update public.submission_reviews set status='PENDING',retry_count=j.attempt_count where id=j.review_id;
    return query select 'QUEUED'::text,s.status::text; return;
  end if;
  update public.ai_review_jobs set status='FAILED',complete_date=now(),error_category=left(target_error_category,100) where id=j.id;
  update public.submission_reviews set status='FAILED',outcome='TECHNICAL_FAILURE',summary='AI processing could not be completed. Human review is required.',retry_count=j.attempt_count,complete_date=now() where id=j.review_id;
  insert into public.submission_review_findings(review_id,code,category,severity,title,description,source,fsp_visible)
    values(j.review_id,'AI_TECHNICAL_FAILURE','PROCESSING','WARNING','AI review could not be completed','The automated review encountered a technical problem and was escalated for human review.','SYSTEM',false);
  if s.status='SUBMITTED' then perform private.transition_submission(s.id,'HUMAN_REVIEW_REQUIRED',null,'SYSTEM',j.review_id,'AI technical failure'); end if;
  select sp.tenant_id,tf.fsp_id into tenant_id,fsp_id from public.submission_periods sp join public.tenant_fsps tf on tf.id=s.tenant_fsp_id where sp.id=s.submission_period_id;
  insert into public.audit_events(tenant_id,fsp_id,submission_id,event_type,entity_type,entity_id,metadata)
    values(tenant_id,fsp_id,s.id,'AI_REVIEW_FAILED','SUBMISSION_REVIEW',j.review_id,jsonb_build_object('attempt_id',j.attempt_id,'error_category',left(target_error_category,100),'attempt_count',j.attempt_count));
  return query select 'FAILED'::text,'HUMAN_REVIEW_REQUIRED'::text;
end; $$;

create or replace function private.decide_submission_review_impl(
  target_submission_id uuid,target_decision text,target_summary text,target_expected_status text
)
returns table(review_id uuid,submission_status text)
language plpgsql security definer set search_path='' as $$
declare actor_id uuid:=auth.uid(); s public.submissions; context_row record; current_attempt uuid; active_review public.submission_reviews; created_review uuid; next_status text;
begin
  select * into s from public.submissions where id=target_submission_id for update;
  if not found then raise exception 'Submission unavailable' using errcode='P0002'; end if;
  select sp.tenant_id,tf.fsp_id into context_row from public.submission_periods sp join public.tenant_fsps tf on tf.id=s.tenant_fsp_id where sp.id=s.submission_period_id;
  if actor_id is null or not private.has_tenant_review_access(context_row.tenant_id,actor_id) then raise exception 'Review access denied' using errcode='42501'; end if;
  if target_expected_status<>s.status or s.status not in ('UNDER_REVIEW','HUMAN_REVIEW_REQUIRED') then raise exception 'This submission has already been reviewed' using errcode='40001'; end if;
  if target_decision not in ('COMPLETE','CHANGES_REQUESTED','REJECTED') then raise exception 'Invalid review decision' using errcode='22023'; end if;
  if target_decision in ('CHANGES_REQUESTED','REJECTED') and length(btrim(coalesce(target_summary,'')))<5 then raise exception 'A meaningful reason is required' using errcode='22023'; end if;
  if length(coalesce(target_summary,''))>4000 then raise exception 'Review summary is too long' using errcode='22023'; end if;
  select id into current_attempt from public.submission_attempts where submission_id=s.id order by attempt_number desc limit 1;
  if current_attempt is null then raise exception 'Submission attempt unavailable' using errcode='55000'; end if;
  select * into active_review from public.submission_reviews where attempt_id=current_attempt and review_type='HUMAN' and status='PENDING' order by create_date desc limit 1 for update;
  if found then
    update public.submission_reviews set status='COMPLETED',outcome=target_decision,reviewer_id=actor_id,
      summary=nullif(btrim(target_summary),''),start_date=coalesce(start_date,now()),complete_date=now() where id=active_review.id returning id into created_review;
  else
    insert into public.submission_reviews(submission_id,attempt_id,review_type,status,outcome,reviewer_id,summary,start_date,complete_date,config_version,rule_set_version)
      values(s.id,current_attempt,'HUMAN','COMPLETED',target_decision,actor_id,nullif(btrim(target_summary),''),now(),now(),'human-v1','submission-validation-v1') returning id into created_review;
  end if;
  if target_decision in ('CHANGES_REQUESTED','REJECTED') then
    insert into public.submission_review_findings(review_id,code,category,severity,title,description,source,fsp_visible)
      values(created_review,case when target_decision='CHANGES_REQUESTED' then 'CHANGES_REQUESTED' else 'REJECTION_REASON' end,
        'REVIEW_DECISION',case when target_decision='REJECTED' then 'BLOCKING' else 'WARNING' end,
        case when target_decision='CHANGES_REQUESTED' then 'Changes requested' else 'Submission rejected' end,btrim(target_summary),'HUMAN',true);
  end if;
  next_status:=case target_decision when 'COMPLETE' then 'COMPLETED' when 'CHANGES_REQUESTED' then 'CHANGES_REQUESTED' else 'REJECTED' end;
  perform private.transition_submission(s.id,next_status,actor_id,'USER',created_review,target_summary);
  insert into public.audit_events(tenant_id,fsp_id,submission_id,actor_user_id,event_type,entity_type,entity_id,metadata)
    values(context_row.tenant_id,context_row.fsp_id,s.id,actor_id,
      case target_decision when 'COMPLETE' then 'SUBMISSION_REVIEW_COMPLETED' when 'CHANGES_REQUESTED' then 'SUBMISSION_CHANGES_REQUESTED' else 'SUBMISSION_REJECTED' end,
      'SUBMISSION_REVIEW',created_review,jsonb_build_object('decision',target_decision,'attempt_id',current_attempt,'origin_review_mode',s.review_mode));
  return query select created_review,next_status;
end; $$;

create or replace function private.reopen_submission_for_changes_impl(target_submission_id uuid)
returns table(submission_id uuid,submission_status text)
language plpgsql security definer set search_path='' as $$
declare actor_id uuid:=auth.uid(); s public.submissions; tenant_id uuid; fsp_id uuid;
begin
  if actor_id is null or not private.can_mutate_submission(target_submission_id,actor_id) then raise exception 'Submission access denied' using errcode='42501'; end if;
  select * into s from public.submissions where id=target_submission_id for update;
  if s.status<>'CHANGES_REQUESTED' then raise exception 'Submission is not available for changes' using errcode='55000'; end if;
  select sp.tenant_id,tf.fsp_id into tenant_id,fsp_id from public.submission_periods sp join public.tenant_fsps tf on tf.id=s.tenant_fsp_id where sp.id=s.submission_period_id;
  perform private.transition_submission(s.id,'IN_PROGRESS',actor_id,'USER',null,'FSP reopened requested changes');
  insert into public.audit_events(tenant_id,fsp_id,submission_id,actor_user_id,event_type,entity_type,entity_id)
    values(tenant_id,fsp_id,s.id,actor_id,'SUBMISSION_CHANGES_STARTED','SUBMISSION',s.id);
  return query select s.id,'IN_PROGRESS'::text;
end; $$;

create or replace function private.get_tenant_submission_review_impl(target_tenant_id uuid,target_submission_id uuid)
returns table(review_mode text,submission_status text,attempt_number integer,review_id uuid,review_type text,review_status text,
  outcome text,reviewer_name text,summary text,provider text,model text,config_version text,rule_set_version text,
  retry_count integer,start_date timestamptz,complete_date timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.has_tenant_review_access(target_tenant_id,auth.uid()) then raise exception 'Review access denied' using errcode='42501'; end if;
  return query select s.review_mode::text,s.status::text,sa.attempt_number,sr.id,sr.review_type::text,sr.status::text,sr.outcome::text,
    nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),'')::text,sr.summary,sr.provider::text,sr.model::text,sr.config_version::text,
    sr.rule_set_version::text,sr.retry_count,sr.start_date,sr.complete_date
  from public.submissions s join public.submission_periods sp on sp.id=s.submission_period_id
  join public.submission_attempts sa on sa.submission_id=s.id
  left join public.submission_reviews sr on sr.attempt_id=sa.id
  left join public.profiles p on p.id=sr.reviewer_id
  where s.id=target_submission_id and sp.tenant_id=target_tenant_id
  order by sa.attempt_number desc,sr.create_date desc;
end; $$;

create or replace function private.list_tenant_submission_findings_impl(target_tenant_id uuid,target_submission_id uuid)
returns table(finding_id uuid,review_id uuid,attempt_number integer,code text,category text,severity text,title text,description text,
  source text,questionnaire_question_id uuid,document_id uuid,resolution_status text,confidence text,create_date timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.has_tenant_review_access(target_tenant_id,auth.uid()) then raise exception 'Review access denied' using errcode='42501'; end if;
  return query select f.id,f.review_id,sa.attempt_number,f.code::text,f.category::text,f.severity::text,f.title::text,f.description,
    f.source::text,f.questionnaire_question_id,f.document_id,f.resolution_status::text,f.confidence::text,f.create_date
  from public.submission_review_findings f join public.submission_reviews sr on sr.id=f.review_id
  join public.submission_attempts sa on sa.id=sr.attempt_id join public.submissions s on s.id=sr.submission_id
  join public.submission_periods sp on sp.id=s.submission_period_id
  where s.id=target_submission_id and sp.tenant_id=target_tenant_id order by sa.attempt_number desc,f.create_date,f.id;
end; $$;

create or replace function private.get_my_submission_feedback_impl(target_submission_id uuid)
returns table(submission_status text,review_mode text,summary text,finding_title text,finding_description text,questionnaire_question_id uuid,document_id uuid)
language plpgsql stable security definer set search_path='' as $$
declare actor_id uuid:=auth.uid(); s public.submissions;
begin
  if actor_id is null or not private.can_view_review_submission(target_submission_id,actor_id) then raise exception 'Submission access denied' using errcode='42501'; end if;
  select * into s from public.submissions where id=target_submission_id;
  return query select s.status::text,s.review_mode::text,sr.summary,f.title::text,f.description,f.questionnaire_question_id,f.document_id
  from public.submission_attempts sa join public.submission_reviews sr on sr.attempt_id=sa.id
  left join public.submission_review_findings f on f.review_id=sr.id and f.fsp_visible
  where sa.submission_id=s.id and (sr.outcome in ('CHANGES_REQUESTED','REJECTED') or f.fsp_visible)
  order by sa.attempt_number desc,sr.create_date desc,f.create_date;
end; $$;

create or replace function private.capture_submission_attempt(target_submission_id uuid,target_actor_id uuid,target_route text,target_review_mode text)
returns uuid language plpgsql security definer set search_path='' as $$
declare s public.submissions; period_row public.submission_periods; next_number integer; new_attempt_id uuid;
begin
  select * into s from public.submissions where id=target_submission_id for update;
  select * into period_row from public.submission_periods where id=s.submission_period_id;
  select coalesce(max(attempt_number),0)+1 into next_number from public.submission_attempts where submission_id=s.id;
  insert into public.submission_attempts(submission_id,attempt_number,review_mode,submission_route,submitted_by,submit_date,
    questionnaire_version_id,response_snapshot,declaration_snapshot)
  values(s.id,next_number,target_review_mode,target_route,target_actor_id,now(),period_row.questionnaire_version_id,
    coalesce((select jsonb_agg(jsonb_build_object('questionnaire_question_id',sr.questionnaire_question_id,'text_value',sr.text_value,
      'numeric_value',sr.numeric_value,'date_value',sr.date_value,'boolean_value',sr.boolean_value,'selected_option_id',sr.selected_option_id,
      'selected_option_ids',coalesce((select jsonb_agg(sro.value_set_option_id order by sro.value_set_option_id) from public.submission_response_options sro where sro.response_id=sr.id),'[]'::jsonb)) order by sr.questionnaire_question_id)
      from public.submission_responses sr where sr.submission_id=s.id),'[]'::jsonb),
    (select jsonb_build_object('template_id',sd.declaration_template_id,'declarant_user_id',sd.declarant_user_id,
      'declarant_name',sd.declarant_name,'accepted_date',sd.accepted_date) from public.submission_declarations sd where sd.submission_id=s.id))
  returning id into new_attempt_id;
  insert into public.submission_attempt_documents(attempt_id,document_id,document_version_id)
    select new_attempt_id,d.id,d.current_version_id from public.documents d
    where d.submission_id=s.id and d.status='ACTIVE' and d.current_version_id is not null;
  return new_attempt_id;
end; $$;

create or replace function private.submit_submission(target_submission_id uuid)
returns table(submission_id uuid,submission_status varchar,submit_date timestamptz)
language plpgsql security definer set search_path='' as $$
declare actor_id uuid:=auth.uid(); s public.submissions%rowtype; context_row record; q record;
  answer_present boolean; route varchar; effective_mode text; attempt_id uuid; review_id uuid;
begin
  if actor_id is null or not private.can_mutate_submission(target_submission_id,actor_id) then raise exception 'Submission access denied' using errcode='42501'; end if;
  select * into s from public.submissions where id=target_submission_id for update;
  if s.status in ('SUBMITTED','UNDER_REVIEW','HUMAN_REVIEW_REQUIRED','COMPLETED') then return query select s.id,s.status,s.submit_date; return; end if;
  if s.status not in ('IN_PROGRESS','CHANGES_REQUESTED') then raise exception 'Submission is not mutable' using errcode='55000'; end if;
  select sp.*,tf.fsp_id into context_row from public.submission_periods sp
    join public.tenant_fsps tf on tf.id=s.tenant_fsp_id and tf.tenant_id=sp.tenant_id where sp.id=s.submission_period_id;
  if context_row.status<>'OPEN' or (now() at time zone 'Africa/Johannesburg')::date not between context_row.open_date and context_row.close_date then
    raise exception 'Submission period is closed' using errcode='22023'; end if;
  for q in select qq.id,qq.required from public.questionnaire_questions qq where qq.questionnaire_version_id=context_row.questionnaire_version_id loop
    if private.question_is_visible(s.id,q.id) and (q.required or exists(select 1 from public.question_conditions qc where qc.questionnaire_question_id=q.id and qc.action='REQUIRE' and private.condition_matches(s.id,qc.source_questionnaire_question_id,qc.operator,qc.comparison_value))) then
      select exists(select 1 from public.submission_responses sr where sr.submission_id=s.id and sr.questionnaire_question_id=q.id
        and (num_nonnulls(sr.text_value,sr.numeric_value,sr.date_value,sr.boolean_value,sr.selected_option_id)>0
          or exists(select 1 from public.submission_response_options sro where sro.response_id=sr.id))) into answer_present;
      if not answer_present then raise exception 'Required questionnaire answers are incomplete' using errcode='22023'; end if;
    end if;
  end loop;
  route:=private.derive_submission_route(s.id);
  if route is null then raise exception 'Submission route cannot be determined' using errcode='22023'; end if;
  if route='CERTIFICATE' and not exists(select 1 from public.documents d join public.document_versions dv on dv.id=d.current_version_id
    join storage.objects o on o.bucket_id='compliance-documents' and o.name=dv.storage_path
    where d.submission_id=s.id and d.document_type='BBEEE_CERTIFICATE' and d.status='ACTIVE') then
    raise exception 'A current certificate is required' using errcode='22023'; end if;
  if route='AFFIDAVIT' and not exists(select 1 from public.submission_declarations sd join public.declaration_templates dt on dt.id=sd.declaration_template_id
    where sd.submission_id=s.id and dt.questionnaire_version_id=context_row.questionnaire_version_id and dt.active) then
    raise exception 'Declaration acknowledgement is required' using errcode='22023'; end if;

  effective_mode:=case when exists(select 1 from public.submission_attempts sa where sa.submission_id=s.id)
    then s.review_mode else context_row.review_mode end;
  if effective_mode='AI_REVIEW' and not private.ai_review_available() then
    raise exception 'AI Review is not operationally available' using errcode='55000';
  end if;
  update public.submissions set review_mode=effective_mode,submission_route=route where id=s.id;
  if s.status='CHANGES_REQUESTED' then perform private.transition_submission(s.id,'IN_PROGRESS',actor_id,'USER',null,'Resubmission prepared'); end if;
  perform private.transition_submission(s.id,'SUBMITTED',actor_id,'USER',null,case when exists(select 1 from public.submission_attempts sa where sa.submission_id=s.id) then 'Submission resubmitted' else 'Submission submitted' end);
  attempt_id:=private.capture_submission_attempt(s.id,actor_id,route,effective_mode);
  update public.submission_attempts set submit_date=(select submit_date from public.submissions where id=s.id) where id=attempt_id;

  if effective_mode='AUTOMATIC_ACCEPTANCE' then
    insert into public.submission_reviews(submission_id,attempt_id,review_type,status,outcome,summary,start_date,complete_date,config_version,rule_set_version)
      values(s.id,attempt_id,'AUTOMATIC','COMPLETED','COMPLETE','Completed automatically after successful application validation',now(),now(),'automatic-v1','submission-validation-v1') returning id into review_id;
    perform private.transition_submission(s.id,'COMPLETED',null,'SYSTEM',review_id,'Automatic Acceptance');
    insert into public.audit_events(tenant_id,fsp_id,submission_id,actor_user_id,event_type,entity_type,entity_id,metadata)
      values(context_row.tenant_id,context_row.fsp_id,s.id,null,'SUBMISSION_AUTO_COMPLETED','SUBMISSION_REVIEW',review_id,jsonb_build_object('review_mode',effective_mode,'attempt_id',attempt_id,'validation','PASSED'));
  elsif effective_mode='HUMAN_REVIEW' then
    insert into public.submission_reviews(submission_id,attempt_id,review_type,status,config_version,rule_set_version)
      values(s.id,attempt_id,'HUMAN','PENDING','human-v1','submission-validation-v1') returning id into review_id;
    perform private.transition_submission(s.id,'UNDER_REVIEW',null,'SYSTEM',review_id,'Human Review required');
  else
    insert into public.submission_reviews(submission_id,attempt_id,review_type,status,config_version,rule_set_version)
      values(s.id,attempt_id,'AI','PENDING','ai-review-v1','submission-validation-v1') returning id into review_id;
    insert into public.ai_review_jobs(submission_id,attempt_id,review_id) values(s.id,attempt_id,review_id);
    insert into public.audit_events(tenant_id,fsp_id,submission_id,event_type,entity_type,entity_id,metadata)
      values(context_row.tenant_id,context_row.fsp_id,s.id,'AI_REVIEW_QUEUED','SUBMISSION_REVIEW',review_id,jsonb_build_object('attempt_id',attempt_id));
  end if;
  insert into public.audit_events(tenant_id,fsp_id,submission_id,actor_user_id,event_type,entity_type,entity_id,metadata)
    values(context_row.tenant_id,context_row.fsp_id,s.id,actor_id,
      case when (select count(*) from public.submission_attempts sa where sa.submission_id=s.id)>1 then 'SUBMISSION_RESUBMITTED' else 'SUBMISSION_SUBMITTED' end,
      'SUBMISSION_ATTEMPT',attempt_id,jsonb_build_object('route',route,'review_mode',effective_mode));
  select * into s from public.submissions where id=s.id;
  return query select s.id,s.status,s.submit_date;
end; $$;

create or replace function private.retry_ai_review_impl(target_submission_id uuid)
returns table(review_id uuid,job_id uuid)
language plpgsql security definer set search_path='' as $$
declare actor_id uuid:=auth.uid(); s public.submissions; tenant_id uuid; fsp_id uuid; current_attempt uuid; prior public.submission_reviews; new_review uuid; new_job uuid;
begin
  select * into s from public.submissions where id=target_submission_id for update;
  if not found then raise exception 'Submission unavailable' using errcode='P0002'; end if;
  select sp.tenant_id,tf.fsp_id into tenant_id,fsp_id from public.submission_periods sp join public.tenant_fsps tf on tf.id=s.tenant_fsp_id where sp.id=s.submission_period_id;
  if actor_id is null or not private.has_tenant_review_access(tenant_id,actor_id) then raise exception 'Review access denied' using errcode='42501'; end if;
  if s.review_mode<>'AI_REVIEW' or s.status<>'HUMAN_REVIEW_REQUIRED' or not private.ai_review_available() then raise exception 'AI review cannot be retried' using errcode='55000'; end if;
  select id into current_attempt from public.submission_attempts where submission_id=s.id order by attempt_number desc limit 1;
  select * into prior from public.submission_reviews where attempt_id=current_attempt and review_type='AI' order by create_date desc limit 1;
  if not found or prior.status<>'FAILED' or prior.outcome<>'TECHNICAL_FAILURE' then raise exception 'AI review cannot be retried' using errcode='55000'; end if;
  perform private.transition_submission(s.id,'SUBMITTED',actor_id,'USER',prior.id,'AI Review retry requested');
  insert into public.submission_reviews(submission_id,attempt_id,review_type,status,config_version,rule_set_version)
    values(s.id,current_attempt,'AI','PENDING','ai-review-v1','submission-validation-v1') returning id into new_review;
  insert into public.ai_review_jobs(submission_id,attempt_id,review_id) values(s.id,current_attempt,new_review) returning id into new_job;
  insert into public.audit_events(tenant_id,fsp_id,submission_id,actor_user_id,event_type,entity_type,entity_id,metadata)
    values(tenant_id,fsp_id,s.id,actor_id,'AI_REVIEW_QUEUED','SUBMISSION_REVIEW',new_review,jsonb_build_object('retry_of_review_id',prior.id,'attempt_id',current_attempt));
  return query select new_review,new_job;
end; $$;

create function public.list_tenant_settings_periods_v2(target_tenant_id uuid)
returns table(period_id uuid,period_name text,period_year integer,stored_status text,display_status text,open_date date,close_date date,
  questionnaire_version_id uuid,questionnaire_name text,questionnaire_version integer,review_mode text,ai_review_available boolean,submission_count bigint)
language sql stable security invoker set search_path='' as $$select * from private.list_tenant_settings_periods_v2_impl(target_tenant_id)$$;
create function public.create_tenant_submission_period_v2(target_tenant_id uuid,target_name text,target_year integer,target_open_date date,target_close_date date,target_questionnaire_version_id uuid,target_status text,target_review_mode text)
returns table(period_id uuid) language sql security invoker set search_path='' as $$select * from private.create_tenant_submission_period_v2_impl(target_tenant_id,target_name,target_year,target_open_date,target_close_date,target_questionnaire_version_id,target_status,target_review_mode)$$;
create function public.update_tenant_submission_period_v2(target_period_id uuid,target_name text,target_year integer,target_open_date date,target_close_date date,target_questionnaire_version_id uuid,target_status text,target_review_mode text)
returns void language sql security invoker set search_path='' as $$select private.update_tenant_submission_period_v2_impl(target_period_id,target_name,target_year,target_open_date,target_close_date,target_questionnaire_version_id,target_status,target_review_mode)$$;
create function public.list_tenant_review_submissions(target_tenant_id uuid,target_today date,target_period_id uuid,search_query text,work_filter text,review_mode_filter text,route_filter text,sort_field text,sort_direction text,page_number integer,page_size integer)
returns table(submission_id uuid,tenant_fsp_id uuid,fsp_id uuid,fsp_number text,registered_name text,trade_name text,broker_reference text,period_id uuid,period_name text,period_year integer,submission_status text,submission_route text,review_mode text,review_status text,start_date timestamptz,submit_date timestamptz,total_count bigint)
language sql stable security invoker set search_path='' as $$select * from private.list_tenant_review_submissions_impl(target_tenant_id,target_today,target_period_id,search_query,work_filter,review_mode_filter,route_filter,sort_field,sort_direction,page_number,page_size)$$;
create function public.get_tenant_submission_review(target_tenant_id uuid,target_submission_id uuid)
returns table(review_mode text,submission_status text,attempt_number integer,review_id uuid,review_type text,review_status text,outcome text,reviewer_name text,summary text,provider text,model text,config_version text,rule_set_version text,retry_count integer,start_date timestamptz,complete_date timestamptz)
language sql stable security invoker set search_path='' as $$select * from private.get_tenant_submission_review_impl(target_tenant_id,target_submission_id)$$;
create function public.list_tenant_submission_findings(target_tenant_id uuid,target_submission_id uuid)
returns table(finding_id uuid,review_id uuid,attempt_number integer,code text,category text,severity text,title text,description text,source text,questionnaire_question_id uuid,document_id uuid,resolution_status text,confidence text,create_date timestamptz)
language sql stable security invoker set search_path='' as $$select * from private.list_tenant_submission_findings_impl(target_tenant_id,target_submission_id)$$;
create function public.decide_submission_review(target_submission_id uuid,target_decision text,target_summary text,target_expected_status text)
returns table(review_id uuid,submission_status text) language sql security invoker set search_path='' as $$select * from private.decide_submission_review_impl(target_submission_id,target_decision,target_summary,target_expected_status)$$;
create function public.retry_ai_review(target_submission_id uuid)
returns table(review_id uuid,job_id uuid) language sql security invoker set search_path='' as $$select * from private.retry_ai_review_impl(target_submission_id)$$;
create function public.reopen_submission_for_changes(target_submission_id uuid)
returns table(submission_id uuid,submission_status text) language sql security invoker set search_path='' as $$select * from private.reopen_submission_for_changes_impl(target_submission_id)$$;
create function public.get_my_submission_feedback(target_submission_id uuid)
returns table(submission_status text,review_mode text,summary text,finding_title text,finding_description text,questionnaire_question_id uuid,document_id uuid)
language sql stable security invoker set search_path='' as $$select * from private.get_my_submission_feedback_impl(target_submission_id)$$;
create function public.get_tenant_review_dashboard(target_tenant_id uuid,target_today date)
returns table(total_fsps bigint,submitted_fsps bigint,outstanding_fsps bigint,needs_review_submissions bigint,completed_submissions bigint)
language sql stable security invoker set search_path='' as $$select * from private.get_tenant_review_dashboard_impl(target_tenant_id,target_today)$$;

create function public.claim_ai_review_job(target_worker_id text)
returns table(job_id uuid,submission_id uuid,attempt_id uuid,review_id uuid,attempt_count integer,max_attempts integer)
language sql security invoker set search_path='' as $$select * from private.claim_ai_review_job_impl(target_worker_id)$$;
create function public.get_ai_review_context(target_job_id uuid)
returns table(job_id uuid,submission_id uuid,attempt_id uuid,review_id uuid,review_mode text,submission_route text,questionnaire_version_id uuid,response_snapshot jsonb,declaration_snapshot jsonb,document_snapshot jsonb)
language sql stable security invoker set search_path='' as $$select * from private.get_ai_review_context_impl(target_job_id)$$;
create function public.apply_ai_review_result(target_job_id uuid,target_summary text,target_recommendation text,target_confidence text,target_findings jsonb,target_provider text,target_model text,target_config_version text,target_rule_set_version text)
returns table(submission_status text,review_outcome text) language sql security invoker set search_path='' as $$select * from private.apply_ai_review_result_impl(target_job_id,target_summary,target_recommendation,target_confidence,target_findings,target_provider,target_model,target_config_version,target_rule_set_version)$$;
create function public.fail_ai_review_job(target_job_id uuid,target_error_category text)
returns table(job_status text,submission_status text) language sql security invoker set search_path='' as $$select * from private.fail_ai_review_job_impl(target_job_id,target_error_category)$$;

revoke all on function public.list_tenant_settings_periods_v2(uuid),public.create_tenant_submission_period_v2(uuid,text,integer,date,date,uuid,text,text),
  public.update_tenant_submission_period_v2(uuid,text,integer,date,date,uuid,text,text),public.list_tenant_review_submissions(uuid,date,uuid,text,text,text,text,text,text,integer,integer),
  public.get_tenant_submission_review(uuid,uuid),public.list_tenant_submission_findings(uuid,uuid),public.decide_submission_review(uuid,text,text,text),
  public.retry_ai_review(uuid),public.reopen_submission_for_changes(uuid),public.get_my_submission_feedback(uuid),public.get_tenant_review_dashboard(uuid,date),
  public.claim_ai_review_job(text),public.get_ai_review_context(uuid),public.apply_ai_review_result(uuid,text,text,text,jsonb,text,text,text,text),public.fail_ai_review_job(uuid,text)
from public,anon;
grant execute on function public.list_tenant_settings_periods_v2(uuid),public.create_tenant_submission_period_v2(uuid,text,integer,date,date,uuid,text,text),
  public.update_tenant_submission_period_v2(uuid,text,integer,date,date,uuid,text,text),public.list_tenant_review_submissions(uuid,date,uuid,text,text,text,text,text,text,integer,integer),
  public.get_tenant_submission_review(uuid,uuid),public.list_tenant_submission_findings(uuid,uuid),public.decide_submission_review(uuid,text,text,text),
  public.retry_ai_review(uuid),public.reopen_submission_for_changes(uuid),public.get_my_submission_feedback(uuid),public.get_tenant_review_dashboard(uuid,date)
to authenticated;
revoke all on function public.claim_ai_review_job(text),public.get_ai_review_context(uuid),public.apply_ai_review_result(uuid,text,text,text,jsonb,text,text,text,text),public.fail_ai_review_job(uuid,text) from authenticated;
grant execute on function public.claim_ai_review_job(text),public.get_ai_review_context(uuid),public.apply_ai_review_result(uuid,text,text,text,jsonb,text,text,text,text),public.fail_ai_review_job(uuid,text) to service_role;

grant execute on function private.list_tenant_settings_periods_v2_impl(uuid),private.create_tenant_submission_period_v2_impl(uuid,text,integer,date,date,uuid,text,text),
  private.update_tenant_submission_period_v2_impl(uuid,text,integer,date,date,uuid,text,text),private.list_tenant_review_submissions_impl(uuid,date,uuid,text,text,text,text,text,text,integer,integer),
  private.get_tenant_submission_review_impl(uuid,uuid),private.list_tenant_submission_findings_impl(uuid,uuid),private.decide_submission_review_impl(uuid,text,text,text),
  private.retry_ai_review_impl(uuid),private.reopen_submission_for_changes_impl(uuid),private.get_my_submission_feedback_impl(uuid),private.get_tenant_review_dashboard_impl(uuid,date)
to authenticated;
grant execute on function private.claim_ai_review_job_impl(text),private.get_ai_review_context_impl(uuid),private.apply_ai_review_result_impl(uuid,text,text,text,jsonb,text,text,text,text),private.fail_ai_review_job_impl(uuid,text) to service_role;
revoke all on function private.has_tenant_review_access(uuid,uuid),private.ai_review_available(),private.can_view_review_submission(uuid,uuid),
  private.transition_submission(uuid,text,uuid,text,uuid,text),private.capture_submission_attempt(uuid,uuid,text,text),private.submit_submission(uuid),
  private.claim_ai_review_job_impl(text),private.get_ai_review_context_impl(uuid),private.apply_ai_review_result_impl(uuid,text,text,text,jsonb,text,text,text,text),private.fail_ai_review_job_impl(uuid,text)
from public,anon,authenticated;
grant execute on function private.submit_submission(uuid) to authenticated;

comment on table public.submission_attempts is 'Immutable submitted-state snapshots; each review targets one exact attempt.';
comment on table public.ai_review_jobs is 'Durable, idempotent, bounded-retry server-side AI review work. Never browser-triggered.';
comment on function public.decide_submission_review(uuid,text,text,text) is 'Atomic tenant-authorized human review decision with optimistic status validation.';
