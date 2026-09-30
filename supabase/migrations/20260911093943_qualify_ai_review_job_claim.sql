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
  return query select picked.id,picked.submission_id,picked.attempt_id,picked.review_id,picked.attempt_count,picked.max_attempts;
end; $$;
