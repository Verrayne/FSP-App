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

-- The full function was introduced immediately before this corrective migration.
-- Replace its pre-transition submit-field update while retaining the validated
-- submission body verbatim; transition_submission now changes status and its
-- constrained submit fields atomically.
do $$
declare definition text; corrected text;
begin
  select pg_get_functiondef('private.submit_submission(uuid)'::regprocedure) into definition;
  corrected:=replace(definition,
    'update public.submissions set review_mode=effective_mode,submission_route=route,submitted_by=actor_id,submit_date=now() where id=s.id;',
    'update public.submissions set review_mode=effective_mode,submission_route=route where id=s.id;');
  if corrected=definition then raise exception 'Expected submit transition definition was not found'; end if;
  execute corrected;
end; $$;
