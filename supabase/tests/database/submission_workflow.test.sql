begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(28);

set local role authenticated;
set local request.jwt.claims = '{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc1","role":"authenticated"}';
select extensions.lives_ok(
  $$select * from public.start_submission('af000000-0000-4000-8000-000000000001','ae000000-0000-4000-8000-000000000001')$$,
  'FSP administrator can start an authorized open-period submission'
);
select extensions.is(
  (select count(*) from public.submissions where submission_period_id='af000000-0000-4000-8000-000000000001' and tenant_fsp_id='ae000000-0000-4000-8000-000000000001'),
  1::bigint,
  'start is idempotent and preserves one submission per period relationship'
);
select extensions.is((select status from public.submissions where id='be000000-0000-4000-8000-000000000001'),'IN_PROGRESS','start transitions the seeded placeholder into the existing draft status');
select extensions.lives_ok(
  $$select * from public.save_submission_response('be000000-0000-4000-8000-000000000001','11500000-0000-4000-8000-000000000001',to_jsonb('ffffffff-0000-4000-8000-000000000001'::text))$$,
  'authorized administrator can save a valid response'
);
select extensions.is((select submission_route from public.submissions where id='be000000-0000-4000-8000-000000000001'),'AFFIDAVIT','trusted configured rules derive the affidavit route');
select extensions.is((select answered_by from public.submission_responses where submission_id='be000000-0000-4000-8000-000000000001' and questionnaire_question_id='11500000-0000-4000-8000-000000000001'),'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'::uuid,'answered_by is derived from the authenticated actor');
select extensions.throws_ok($$select * from public.submit_submission('be000000-0000-4000-8000-000000000001')$$,null,null,'trusted final validation rejects incomplete required answers');
select extensions.throws_ok($$update public.submissions set status='SUBMITTED' where id='be000000-0000-4000-8000-000000000001'$$,null,null,'ordinary user cannot directly set submission status');
select extensions.throws_ok(
  $$select * from public.save_submission_response('be000000-0000-4000-8000-000000000001',gen_random_uuid(),to_jsonb('x'::text))$$,
  null,null,'a question outside the assigned questionnaire is rejected'
);
select extensions.throws_ok(
  $$select * from public.save_submission_response('be000000-0000-4000-8000-000000000001','11500000-0000-4000-8000-000000000001',to_jsonb('ffffffff-0000-4000-8000-000000000011'::text))$$,
  null,null,'an option from another value set is rejected'
);
select extensions.throws_ok(
  $$select * from public.save_submission_response('be000000-0000-4000-8000-000000000003','11500000-0000-4000-8000-000000000001',to_jsonb('ffffffff-0000-4000-8000-000000000001'::text))$$,
  null,null,'FSP A cannot mutate FSP B submission'
);
select extensions.lives_ok($$select * from public.save_submission_response('be000000-0000-4000-8000-000000000001','11500000-0000-4000-8000-000000000002',to_jsonb('2026-02-28'::text))$$,'date response saves through its typed column');
select extensions.lives_ok($$select * from public.save_submission_response('be000000-0000-4000-8000-000000000001','11500000-0000-4000-8000-000000000004','51.25'::jsonb)$$,'percentage response saves through numeric storage');
select extensions.lives_ok($$select * from public.save_submission_response('be000000-0000-4000-8000-000000000001','11500000-0000-4000-8000-000000000005','30.5'::jsonb)$$,'second required percentage response saves');
select extensions.lives_ok($$select * from public.acknowledge_submission_declaration('be000000-0000-4000-8000-000000000001')$$,'authenticated submitter can explicitly acknowledge the configured declaration');
select extensions.is((select declarant_user_id from public.submission_declarations where submission_id='be000000-0000-4000-8000-000000000001'),'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'::uuid,'declarant identity is derived from the session');
reset role;
update public.submission_periods set close_date=current_date-1 where id='af000000-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claims = '{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc1","role":"authenticated"}';
select extensions.throws_ok($$select * from public.submit_submission('be000000-0000-4000-8000-000000000001')$$,null,null,'trusted server date prevents submission after period closure');
reset role;
update public.submission_periods set close_date='2026-10-31' where id='af000000-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claims = '{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc1","role":"authenticated"}';
select extensions.lives_ok($$select * from public.submit_submission('be000000-0000-4000-8000-000000000001')$$,'complete affidavit submission passes trusted final validation');
select extensions.is((select status from public.submissions where id='be000000-0000-4000-8000-000000000001'),'UNDER_REVIEW','final submission enters the configured human-review workflow atomically');
select extensions.is((select count(*) from public.audit_events where submission_id='be000000-0000-4000-8000-000000000001' and event_type='SUBMISSION_SUBMITTED'),1::bigint,'final submission creates one meaningful audit event');
select extensions.lives_ok($$select * from public.submit_submission('be000000-0000-4000-8000-000000000001')$$,'final submission is idempotent');
select extensions.is((select count(*) from public.audit_events where submission_id='be000000-0000-4000-8000-000000000001' and event_type='SUBMISSION_SUBMITTED'),1::bigint,'double submission does not duplicate its audit event');
select extensions.throws_ok($$select * from public.save_submission_response('be000000-0000-4000-8000-000000000001','11500000-0000-4000-8000-000000000002',to_jsonb('2026-03-31'::text))$$,null,null,'submitted responses are immutable');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc3","role":"authenticated"}';
select extensions.throws_ok(
  $$select * from public.start_submission('af000000-0000-4000-8000-000000000002','ae000000-0000-4000-8000-000000000002')$$,
  null,null,'viewer cannot start a submission'
);
select extensions.throws_ok($$select * from public.save_submission_response('be000000-0000-4000-8000-000000000003','11500000-0000-4000-8000-000000000001',to_jsonb('ffffffff-0000-4000-8000-000000000002'::text))$$,null,null,'viewer cannot edit a submission');
select extensions.throws_ok($$select * from public.prepare_certificate_upload('be000000-0000-4000-8000-000000000003','viewer.pdf','application/pdf',1024,repeat('a',64))$$,null,null,'viewer cannot prepare a document upload');
select extensions.throws_ok($$select * from public.acknowledge_submission_declaration('be000000-0000-4000-8000-000000000003')$$,null,null,'viewer cannot acknowledge a declaration');
select extensions.throws_ok($$select * from public.submit_submission('be000000-0000-4000-8000-000000000003')$$,null,null,'viewer cannot submit');
reset role;

select * from extensions.finish();
rollback;
