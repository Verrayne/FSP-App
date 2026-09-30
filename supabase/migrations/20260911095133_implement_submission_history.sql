-- Prompt 12: immutable submission history projections. The Prompt 11 attempt,
-- review and status tables remain the sole sources of truth.

create index audit_events_submission_history_idx
  on public.audit_events(submission_id,occurrence_date desc,id desc)
  where submission_id is not null;

-- Internal history tables are exposed only through the bounded projections below.
revoke select on public.audit_events,public.submission_status_history from authenticated;
drop policy if exists audit_events_select_authorized on public.audit_events;
drop policy if exists submission_status_history_read on public.submission_status_history;
create policy audit_events_no_direct_read on public.audit_events for select to authenticated using(false);
create policy submission_status_history_no_direct_read on public.submission_status_history for select to authenticated using(false);

create or replace function private.require_fsp_submission_history_access(
  target_fsp_id uuid,target_submission_id uuid
) returns void language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists(
    select 1 from public.submissions s
    join public.tenant_fsps tf on tf.id=s.tenant_fsp_id
    join public.fsp_users fu on fu.fsp_id=tf.fsp_id
    where s.id=target_submission_id and tf.fsp_id=target_fsp_id
      and fu.user_id=auth.uid() and fu.status='ACTIVE'
  ) then raise exception 'Submission unavailable' using errcode='42501'; end if;
end; $$;

create or replace function private.require_tenant_submission_history_access(
  target_tenant_id uuid,target_submission_id uuid
) returns void language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.has_tenant_review_access(target_tenant_id,auth.uid())
    or not exists(
      select 1 from public.submissions s join public.submission_periods sp on sp.id=s.submission_period_id
      where s.id=target_submission_id and sp.tenant_id=target_tenant_id
    ) then raise exception 'Submission unavailable' using errcode='42501'; end if;
end; $$;

create or replace function private.list_my_fsp_submission_history_impl(
  target_fsp_id uuid,target_period_id uuid default null,target_status text default null
) returns table(
  submission_id uuid,tenant_id uuid,tenant_name text,period_id uuid,period_name text,period_year integer,
  submission_status text,submission_route text,review_mode text,start_date timestamptz,submit_date timestamptz,
  completed_date timestamptz
) language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.fsp_users fu where fu.fsp_id=target_fsp_id and fu.user_id=auth.uid() and fu.status='ACTIVE')
    then raise exception 'FSP access denied' using errcode='42501'; end if;
  if target_status is not null and target_status<>'ALL' and target_status not in (
    'NOT_STARTED','IN_PROGRESS','SUBMITTED','UNDER_REVIEW','HUMAN_REVIEW_REQUIRED','CHANGES_REQUESTED','COMPLETED','REJECTED'
  ) then raise exception 'Invalid status filter' using errcode='22023'; end if;
  return query
  select s.id,t.id,t.name::text,sp.id,sp.name::text,sp.year,s.status::text,s.submission_route::text,
    s.review_mode::text,s.start_date,s.submit_date,
    (select max(sh.occurrence_date) from public.submission_status_history sh where sh.submission_id=s.id and sh.to_status='COMPLETED')
  from public.submissions s
  join public.submission_periods sp on sp.id=s.submission_period_id
  join public.tenants t on t.id=sp.tenant_id
  join public.tenant_fsps tf on tf.id=s.tenant_fsp_id and tf.fsp_id=target_fsp_id
  where (target_period_id is null or sp.id=target_period_id)
    and (target_status is null or target_status='ALL' or s.status=target_status)
  order by sp.year desc,sp.open_date desc,coalesce(s.submit_date,s.start_date,s.create_date) desc,s.id;
end; $$;

create or replace function private.list_submission_attempt_history(
  target_submission_id uuid
) returns table(
  attempt_id uuid,attempt_number integer,review_mode text,submission_route text,submitted_by_name text,
  submit_date timestamptz,questionnaire_version_id uuid,questionnaire_name text,questionnaire_version integer,
  response_snapshot jsonb,declaration_snapshot jsonb,declaration_title text,declaration_text text,documents jsonb
) language sql stable security definer set search_path='' as $$
  select sa.id,sa.attempt_number,sa.review_mode::text,sa.submission_route::text,
    nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),'')::text,sa.submit_date,sa.questionnaire_version_id,
    q.name::text,qv.version_number,sa.response_snapshot,sa.declaration_snapshot,dt.title::text,dt.declaration_text::text,
    coalesce((select jsonb_agg(jsonb_build_object(
      'document_id',sad.document_id,'document_version_id',sad.document_version_id,
      'filename',dv.original_filename,'mime_type',dv.mime_type,'size_bytes',dv.size_bytes,'upload_date',dv.upload_date
    ) order by dv.upload_date,dv.id) from public.submission_attempt_documents sad
      join public.document_versions dv on dv.id=sad.document_version_id
      where sad.attempt_id=sa.id),'[]'::jsonb)
  from public.submission_attempts sa
  join public.questionnaire_versions qv on qv.id=sa.questionnaire_version_id
  join public.questionnaires q on q.id=qv.questionnaire_id
  left join public.profiles p on p.id=sa.submitted_by
  left join public.declaration_templates dt on dt.id=(sa.declaration_snapshot->>'template_id')::uuid
  where sa.submission_id=target_submission_id
  order by sa.attempt_number desc;
$$;

create or replace function private.list_fsp_submission_attempts_impl(target_fsp_id uuid,target_submission_id uuid)
returns table(
  attempt_id uuid,attempt_number integer,review_mode text,submission_route text,submitted_by_name text,
  submit_date timestamptz,questionnaire_version_id uuid,questionnaire_name text,questionnaire_version integer,
  response_snapshot jsonb,declaration_snapshot jsonb,declaration_title text,declaration_text text,documents jsonb
) language plpgsql stable security definer set search_path='' as $$
begin
  perform private.require_fsp_submission_history_access(target_fsp_id,target_submission_id);
  return query select * from private.list_submission_attempt_history(target_submission_id);
end; $$;

create or replace function private.list_tenant_submission_attempts_impl(target_tenant_id uuid,target_submission_id uuid)
returns table(
  attempt_id uuid,attempt_number integer,review_mode text,submission_route text,submitted_by_name text,
  submit_date timestamptz,questionnaire_version_id uuid,questionnaire_name text,questionnaire_version integer,
  response_snapshot jsonb,declaration_snapshot jsonb,declaration_title text,declaration_text text,documents jsonb
) language plpgsql stable security definer set search_path='' as $$
begin
  perform private.require_tenant_submission_history_access(target_tenant_id,target_submission_id);
  return query select * from private.list_submission_attempt_history(target_submission_id);
end; $$;

create or replace function private.list_fsp_submission_timeline_impl(target_fsp_id uuid,target_submission_id uuid)
returns table(history_id uuid,from_status text,to_status text,actor_type text,actor_label text,occurrence_date timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
  perform private.require_fsp_submission_history_access(target_fsp_id,target_submission_id);
  return query select sh.id,sh.from_status::text,sh.to_status::text,sh.actor_type::text,
    case when sh.actor_id is not null and exists(
      select 1 from public.fsp_users fu where fu.fsp_id=target_fsp_id and fu.user_id=sh.actor_id
    ) then coalesce(nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),''),'FSP user')
    when sh.actor_type='AI' then 'AI' when sh.actor_type='SYSTEM' then 'System' else 'Insurer' end::text,
    sh.occurrence_date
  from public.submission_status_history sh left join public.profiles p on p.id=sh.actor_id
  where sh.submission_id=target_submission_id order by sh.occurrence_date,sh.id;
end; $$;

create or replace function private.list_tenant_submission_timeline_impl(target_tenant_id uuid,target_submission_id uuid)
returns table(history_id uuid,from_status text,to_status text,actor_type text,actor_label text,reason text,occurrence_date timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
  perform private.require_tenant_submission_history_access(target_tenant_id,target_submission_id);
  return query select sh.id,sh.from_status::text,sh.to_status::text,sh.actor_type::text,
    case when sh.actor_type='AI' then 'AI' when sh.actor_type='SYSTEM' then 'System'
      else coalesce(nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),''),'User') end::text,
    sh.reason::text,sh.occurrence_date
  from public.submission_status_history sh left join public.profiles p on p.id=sh.actor_id
  where sh.submission_id=target_submission_id order by sh.occurrence_date,sh.id;
end; $$;

create or replace function private.list_tenant_submission_audit_impl(
  target_tenant_id uuid,target_submission_id uuid,page_number integer default 1,page_size integer default 25
) returns table(audit_id uuid,event_type text,event_label text,entity_label text,actor_label text,event_detail text,occurrence_date timestamptz,total_count bigint)
language plpgsql stable security definer set search_path='' as $$
begin
  perform private.require_tenant_submission_history_access(target_tenant_id,target_submission_id);
  if page_number<1 or page_size not between 1 and 50 then raise exception 'Invalid pagination' using errcode='22023'; end if;
  return query
  select ae.id,ae.event_type::text,
    case ae.event_type
      when 'SUBMISSION_SUBMITTED' then 'Submission submitted'
      when 'SUBMISSION_RESUBMITTED' then 'Submission resubmitted'
      when 'SUBMISSION_AUTO_COMPLETED' then 'Submission completed automatically'
      when 'SUBMISSION_REVIEW_DECIDED' then 'Review decision recorded'
      when 'SUBMISSION_REVIEW_COMPLETED' then 'Review completed'
      when 'AI_REVIEW_QUEUED' then 'AI review queued'
      when 'AI_REVIEW_COMPLETED' then 'AI review completed'
      when 'AI_REVIEW_FAILED' then 'AI review failed'
      when 'CERTIFICATE_UPLOADED' then 'Certificate uploaded'
      when 'CERTIFICATE_REPLACED' then 'Certificate replaced'
      when 'DECLARATION_ACCEPTED' then 'Declaration accepted'
      else initcap(replace(lower(ae.event_type),'_',' ')) end::text,
    initcap(replace(lower(ae.entity_type),'_',' '))::text,
    case when ae.actor_user_id is null then
      case when ae.event_type like 'AI_%' then 'AI' else 'System' end
      else coalesce(nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),''),'User') end::text,
    concat_ws(' · ',
      case when ae.metadata ? 'route' then 'Route: '||initcap(lower(ae.metadata->>'route')) end,
      case when ae.metadata ? 'review_mode' then 'Review: '||initcap(replace(lower(ae.metadata->>'review_mode'),'_',' ')) end,
      case when ae.metadata ? 'decision' then 'Decision: '||initcap(replace(lower(ae.metadata->>'decision'),'_',' ')) end
    )::text,
    ae.occurrence_date,count(*) over()
  from public.audit_events ae left join public.profiles p on p.id=ae.actor_user_id
  where ae.submission_id=target_submission_id and ae.tenant_id=target_tenant_id
  order by ae.occurrence_date desc,ae.id desc
  limit page_size offset (page_number-1)*page_size;
end; $$;

create or replace function private.authorize_fsp_attempt_document_impl(
  target_fsp_id uuid,target_submission_id uuid,target_attempt_id uuid,target_document_version_id uuid
) returns boolean language plpgsql stable security definer set search_path='' as $$
begin
  perform private.require_fsp_submission_history_access(target_fsp_id,target_submission_id);
  return exists(select 1 from public.submission_attempts sa join public.submission_attempt_documents sad on sad.attempt_id=sa.id
    where sa.id=target_attempt_id and sa.submission_id=target_submission_id and sad.document_version_id=target_document_version_id);
end; $$;

create or replace function private.authorize_tenant_attempt_document_impl(
  target_tenant_id uuid,target_submission_id uuid,target_attempt_id uuid,target_document_version_id uuid
) returns boolean language plpgsql stable security definer set search_path='' as $$
begin
  perform private.require_tenant_submission_history_access(target_tenant_id,target_submission_id);
  return exists(select 1 from public.submission_attempts sa join public.submission_attempt_documents sad on sad.attempt_id=sa.id
    where sa.id=target_attempt_id and sa.submission_id=target_submission_id and sad.document_version_id=target_document_version_id);
end; $$;

create function public.list_my_fsp_submission_history(target_fsp_id uuid,target_period_id uuid default null,target_status text default null)
returns table(submission_id uuid,tenant_id uuid,tenant_name text,period_id uuid,period_name text,period_year integer,submission_status text,submission_route text,review_mode text,start_date timestamptz,submit_date timestamptz,completed_date timestamptz)
language sql stable security invoker set search_path='' as $$select * from private.list_my_fsp_submission_history_impl(target_fsp_id,target_period_id,target_status)$$;
create function public.list_fsp_submission_attempts(target_fsp_id uuid,target_submission_id uuid)
returns table(attempt_id uuid,attempt_number integer,review_mode text,submission_route text,submitted_by_name text,submit_date timestamptz,questionnaire_version_id uuid,questionnaire_name text,questionnaire_version integer,response_snapshot jsonb,declaration_snapshot jsonb,declaration_title text,declaration_text text,documents jsonb)
language sql stable security invoker set search_path='' as $$select * from private.list_fsp_submission_attempts_impl(target_fsp_id,target_submission_id)$$;
create function public.list_tenant_submission_attempts(target_tenant_id uuid,target_submission_id uuid)
returns table(attempt_id uuid,attempt_number integer,review_mode text,submission_route text,submitted_by_name text,submit_date timestamptz,questionnaire_version_id uuid,questionnaire_name text,questionnaire_version integer,response_snapshot jsonb,declaration_snapshot jsonb,declaration_title text,declaration_text text,documents jsonb)
language sql stable security invoker set search_path='' as $$select * from private.list_tenant_submission_attempts_impl(target_tenant_id,target_submission_id)$$;
create function public.list_fsp_submission_timeline(target_fsp_id uuid,target_submission_id uuid)
returns table(history_id uuid,from_status text,to_status text,actor_type text,actor_label text,occurrence_date timestamptz)
language sql stable security invoker set search_path='' as $$select * from private.list_fsp_submission_timeline_impl(target_fsp_id,target_submission_id)$$;
create function public.list_tenant_submission_timeline(target_tenant_id uuid,target_submission_id uuid)
returns table(history_id uuid,from_status text,to_status text,actor_type text,actor_label text,reason text,occurrence_date timestamptz)
language sql stable security invoker set search_path='' as $$select * from private.list_tenant_submission_timeline_impl(target_tenant_id,target_submission_id)$$;
create function public.list_tenant_submission_audit(target_tenant_id uuid,target_submission_id uuid,page_number integer default 1,page_size integer default 25)
returns table(audit_id uuid,event_type text,event_label text,entity_label text,actor_label text,event_detail text,occurrence_date timestamptz,total_count bigint)
language sql stable security invoker set search_path='' as $$select * from private.list_tenant_submission_audit_impl(target_tenant_id,target_submission_id,page_number,page_size)$$;
create function public.authorize_fsp_attempt_document(target_fsp_id uuid,target_submission_id uuid,target_attempt_id uuid,target_document_version_id uuid)
returns boolean language sql stable security invoker set search_path='' as $$select private.authorize_fsp_attempt_document_impl(target_fsp_id,target_submission_id,target_attempt_id,target_document_version_id)$$;
create function public.authorize_tenant_attempt_document(target_tenant_id uuid,target_submission_id uuid,target_attempt_id uuid,target_document_version_id uuid)
returns boolean language sql stable security invoker set search_path='' as $$select private.authorize_tenant_attempt_document_impl(target_tenant_id,target_submission_id,target_attempt_id,target_document_version_id)$$;

revoke all on function public.list_my_fsp_submission_history(uuid,uuid,text),public.list_fsp_submission_attempts(uuid,uuid),
  public.list_tenant_submission_attempts(uuid,uuid),public.list_fsp_submission_timeline(uuid,uuid),public.list_tenant_submission_timeline(uuid,uuid),
  public.list_tenant_submission_audit(uuid,uuid,integer,integer),public.authorize_fsp_attempt_document(uuid,uuid,uuid,uuid),
  public.authorize_tenant_attempt_document(uuid,uuid,uuid,uuid) from public,anon;
grant execute on function public.list_my_fsp_submission_history(uuid,uuid,text),public.list_fsp_submission_attempts(uuid,uuid),
  public.list_tenant_submission_attempts(uuid,uuid),public.list_fsp_submission_timeline(uuid,uuid),public.list_tenant_submission_timeline(uuid,uuid),
  public.list_tenant_submission_audit(uuid,uuid,integer,integer),public.authorize_fsp_attempt_document(uuid,uuid,uuid,uuid),
  public.authorize_tenant_attempt_document(uuid,uuid,uuid,uuid) to authenticated;

revoke all on function private.require_fsp_submission_history_access(uuid,uuid),private.require_tenant_submission_history_access(uuid,uuid),
  private.list_my_fsp_submission_history_impl(uuid,uuid,text),private.list_submission_attempt_history(uuid),
  private.list_fsp_submission_attempts_impl(uuid,uuid),private.list_tenant_submission_attempts_impl(uuid,uuid),
  private.list_fsp_submission_timeline_impl(uuid,uuid),private.list_tenant_submission_timeline_impl(uuid,uuid),
  private.list_tenant_submission_audit_impl(uuid,uuid,integer,integer),private.authorize_fsp_attempt_document_impl(uuid,uuid,uuid,uuid),
  private.authorize_tenant_attempt_document_impl(uuid,uuid,uuid,uuid) from public,anon,authenticated;

comment on function public.list_tenant_submission_audit(uuid,uuid,integer,integer) is
  'Bounded, tenant-authorized submission audit projection. Raw metadata is never returned.';
