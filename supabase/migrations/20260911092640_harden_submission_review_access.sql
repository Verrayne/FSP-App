-- Make the default-deny intent explicit for internal review tables. Browser-facing
-- access is provided only by scoped RPC projections.
create policy submission_attempts_no_browser_access on public.submission_attempts
for all to authenticated using (false) with check (false);
create policy submission_attempt_documents_no_browser_access on public.submission_attempt_documents
for all to authenticated using (false) with check (false);
create policy submission_reviews_no_browser_access on public.submission_reviews
for all to authenticated using (false) with check (false);
create policy submission_review_findings_no_browser_access on public.submission_review_findings
for all to authenticated using (false) with check (false);
create policy ai_review_jobs_no_browser_access on public.ai_review_jobs
for all to authenticated using (false) with check (false);

-- Pre-review-mode submitted records received pending human reviews during the
-- foundation migration. Put them into the same actionable state as new human
-- submissions so they appear in the default review queue.
with transitioned as (
  update public.submissions s
  set status='UNDER_REVIEW',update_date=now()
  where s.status='SUBMITTED' and s.review_mode='HUMAN_REVIEW'
    and exists(select 1 from public.submission_reviews sr where sr.submission_id=s.id and sr.review_type='HUMAN' and sr.status='PENDING')
  returning s.id
)
insert into public.submission_status_history(submission_id,from_status,to_status,actor_type,reason)
select id,'SUBMITTED','UNDER_REVIEW','SYSTEM','Existing submission migrated to the human review queue'
from transitioned;
