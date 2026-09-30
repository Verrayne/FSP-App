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
