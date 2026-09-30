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
