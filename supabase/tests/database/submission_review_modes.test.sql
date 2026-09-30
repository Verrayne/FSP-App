begin;

create extension if not exists pgtap with schema extensions;
select extensions.no_plan();

select extensions.has_table('public','submission_attempts','immutable submission attempts exist');
select extensions.has_table('public','submission_reviews','review records exist');
select extensions.has_table('public','submission_review_findings','structured findings exist');
select extensions.has_table('public','submission_status_history','status history exists');
select extensions.has_table('public','ai_review_jobs','durable AI jobs exist');
select extensions.has_function('public','decide_submission_review',array['uuid','text','text','text'],'human review decision gateway exists');
select extensions.has_function('public','claim_ai_review_job',array['text'],'AI worker claim gateway exists');
select extensions.ok(not has_table_privilege('authenticated','public.ai_review_jobs','SELECT'),'AI jobs are not exposed to browsers');
select extensions.ok(not has_function_privilege('authenticated','public.claim_ai_review_job(text)','EXECUTE'),'browser users cannot claim AI work');
select extensions.ok(has_function_privilege('service_role','public.claim_ai_review_job(text)','EXECUTE'),'service role can claim AI work');
select extensions.is((select review_mode from public.submission_periods where id='af000000-0000-4000-8000-000000000001'),'HUMAN_REVIEW','existing periods migrate conservatively to human review');
select extensions.is((select review_mode from public.submissions where id='be000000-0000-4000-8000-000000000003'),'HUMAN_REVIEW','existing submissions retain a review-mode snapshot');

set local role authenticated;
set local request.jwt.claims='{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc5","role":"authenticated"}';
select extensions.throws_ok(
  $$select * from public.create_tenant_submission_period_v2('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','AI unavailable',2028,'2028-01-01','2028-02-01','11222222-2222-4222-8222-222222222222','DRAFT','AI_REVIEW')$$,
  '55000',null,'AI review cannot be selected until its production capability is enabled'
);
select extensions.is(
  (select review_mode from public.create_tenant_submission_period_v2('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','Automatic fixture',2028,'2028-01-01','2028-02-01','11222222-2222-4222-8222-222222222222','DRAFT','AUTOMATIC_ACCEPTANCE')),
  'AUTOMATIC_ACCEPTANCE','tenant administrator can configure automatic acceptance'
);
select extensions.throws_ok(
  $$select * from public.get_tenant_submission_review('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','be000000-0000-4000-8000-000000000003')$$,
  '42501',null,'cross-tenant review reads are denied'
);
reset role;

-- Use the seeded submitted record to exercise the atomic human decision and stale-status guard.
update public.submissions set status='UNDER_REVIEW' where id='be000000-0000-4000-8000-000000000003';
set local role authenticated;
set local request.jwt.claims='{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc8","role":"authenticated"}';
select extensions.is(
  (select submission_status from public.decide_submission_review('be000000-0000-4000-8000-000000000003','CHANGES_REQUESTED','Please provide a current certificate.','UNDER_REVIEW')),
  'CHANGES_REQUESTED','tenant reviewer can request changes with a reason'
);
select extensions.throws_ok(
  $$select * from public.decide_submission_review('be000000-0000-4000-8000-000000000003','COMPLETE','','UNDER_REVIEW')$$,
  '40001',null,'a stale reviewer tab cannot overwrite an existing decision'
);
select extensions.is(
  (select count(*) from public.submission_review_findings where review_id in (select id from public.submission_reviews where submission_id='be000000-0000-4000-8000-000000000003') and fsp_visible),
  1::bigint,'change reasons are stored as FSP-visible structured findings'
);
reset role;

select extensions.is((select count(*) from public.submission_status_history where submission_id='be000000-0000-4000-8000-000000000003' and to_status='CHANGES_REQUESTED'),1::bigint,'review transitions append status history');
select extensions.is((select count(*) from public.audit_events where submission_id='be000000-0000-4000-8000-000000000003' and event_type='SUBMISSION_CHANGES_REQUESTED'),1::bigint,'review decision is audited');

select * from extensions.finish();
rollback;
