begin;

create extension if not exists pgtap with schema extensions;
select extensions.no_plan();

select extensions.has_function('public','list_my_fsp_submission_history',array['uuid','uuid','text'],'FSP history list gateway exists');
select extensions.has_function('public','list_fsp_submission_attempts',array['uuid','uuid'],'FSP attempt gateway exists');
select extensions.has_function('public','list_tenant_submission_audit',array['uuid','uuid','integer','integer'],'tenant audit gateway exists');
select extensions.ok(not has_table_privilege('authenticated','public.submission_attempts','SELECT'),'attempts cannot be read directly');
select extensions.ok(not has_table_privilege('authenticated','public.submission_status_history','SELECT'),'status history cannot be read directly');
select extensions.ok(not has_table_privilege('authenticated','public.audit_events','SELECT'),'raw audit metadata cannot be read directly');

set local role authenticated;
set local request.jwt.claims='{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc1","role":"authenticated"}';
select extensions.is(
  (select count(*) from public.list_my_fsp_submission_history('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001',null,null)),
  1::bigint,'FSP history returns only the selected FSP submissions'
);
select extensions.is(
  (select count(*) from public.list_fsp_submission_attempts('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001','be000000-0000-4000-8000-000000000001')),
  1::bigint,'FSP can read its immutable attempt'
);
select extensions.is(
  (select count(*) from public.list_fsp_submission_timeline('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001','be000000-0000-4000-8000-000000000001')),
  2::bigint,'FSP can read its lifecycle timeline'
);
select extensions.throws_ok(
  $$select * from public.list_fsp_submission_attempts('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001','be000000-0000-4000-8000-000000000003')$$,
  '42501',null,'cross-FSP attempt IDOR is denied'
);
select extensions.is(
  public.authorize_fsp_attempt_document(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001','be000000-0000-4000-8000-000000000001',
    (select attempt_id from public.list_fsp_submission_attempts('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001','be000000-0000-4000-8000-000000000001') limit 1),
    'ffffffff-ffff-4fff-8fff-ffffffffffff'
  ),false,'a document version not attached to the selected attempt is denied'
);
reset role;

set local role authenticated;
set local request.jwt.claims='{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc5","role":"authenticated"}';
select extensions.is(
  (select count(*) from public.list_tenant_submission_attempts('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','be000000-0000-4000-8000-000000000001')),
  1::bigint,'tenant reviewer can read an in-tenant attempt'
);
select extensions.ok(
  (select count(*) from public.list_tenant_submission_audit('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','be000000-0000-4000-8000-000000000001',1,25))>0,
  'tenant reviewer receives the curated audit projection'
);
select extensions.throws_ok(
  $$select * from public.list_tenant_submission_audit('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','be000000-0000-4000-8000-000000000001',1,25)$$,
  '42501',null,'cross-tenant audit IDOR is denied'
);
reset role;

select extensions.throws_ok(
  $$update public.audit_events set event_type=event_type where submission_id='be000000-0000-4000-8000-000000000001'$$,
  '55000','Audit events are append-only','audit events remain append-only'
);

select * from extensions.finish();
rollback;
