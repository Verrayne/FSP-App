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
  if effective_mode='AI_REVIEW' and not private.ai_review_available() then raise exception 'AI Review is not operationally available' using errcode='55000'; end if;
  update public.submissions set review_mode=effective_mode,submission_route=route where id=s.id;
  if s.status='CHANGES_REQUESTED' then perform private.transition_submission(s.id,'IN_PROGRESS',actor_id,'USER',null,'Resubmission prepared'); end if;
  perform private.transition_submission(s.id,'SUBMITTED',actor_id,'USER',null,case when exists(select 1 from public.submission_attempts sa where sa.submission_id=s.id) then 'Submission resubmitted' else 'Submission submitted' end);
  attempt_id:=private.capture_submission_attempt(s.id,actor_id,route,effective_mode);
  update public.submission_attempts set submit_date=(select sub.submit_date from public.submissions sub where sub.id=s.id) where id=attempt_id;

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
  select * into s from public.submissions sub where sub.id=s.id;
  return query select s.id,s.status,s.submit_date;
end; $$;
