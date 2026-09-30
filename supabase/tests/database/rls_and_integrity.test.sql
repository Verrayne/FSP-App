begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(51);

set local role anon;
select extensions.throws_ok('select * from public.profiles', null, null, 'anonymous cannot read profiles');
select extensions.throws_ok('select * from public.contacts', null, null, 'anonymous cannot read FSP contacts');
select extensions.throws_ok('select * from public.fsp_users', null, null, 'anonymous cannot read FSP memberships');
select extensions.throws_ok('select * from public.submissions', null, null, 'anonymous cannot read submissions');
select extensions.throws_ok('select * from public.submission_responses', null, null, 'anonymous cannot read responses');
select extensions.throws_ok('select * from public.documents', null, null, 'anonymous cannot read documents');
select extensions.throws_ok('select * from public.audit_events', null, null, 'anonymous cannot read audit events');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc1","role":"authenticated"}';
select extensions.is((select count(*) from public.fsps where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001'), 1::bigint, 'FSP A administrator can read FSP A');
select extensions.is((select count(*) from public.fsps where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002'), 0::bigint, 'FSP A administrator cannot read FSP B');
select extensions.is((select count(*) from public.submissions), 1::bigint, 'FSP A administrator sees only FSP A submissions');
select extensions.is((select count(*) from public.tenant_fsps where fsp_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001' and status = 'ACTIVE'), 1::bigint, 'FSP A dashboard resolves its active tenant relationship');
select extensions.is((select count(*) from public.submissions s join public.submission_periods sp on sp.id = s.submission_period_id where s.tenant_fsp_id = 'ae000000-0000-4000-8000-000000000001' and sp.tenant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'), 1::bigint, 'FSP A dashboard resolves its tenant-scoped current submission');
select extensions.is((select count(*) from public.submissions where tenant_fsp_id = 'ae000000-0000-4000-8000-000000000002'), 0::bigint, 'FSP A dashboard cannot retrieve the unrelated FSP B submission');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc3","role":"authenticated"}';
select extensions.is((select count(*) from public.fsps where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002'), 1::bigint, 'FSP B user can read FSP B');
select extensions.is((select count(*) from public.fsps where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001'), 0::bigint, 'FSP B user cannot read FSP A');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc4","role":"authenticated"}';
select extensions.is((select count(*) from public.fsps), 2::bigint, 'multi-FSP user can read both memberships');
select extensions.is((select count(*) from public.fsps where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb003'), 0::bigint, 'multi-FSP user cannot read unrelated shared FSP');
select extensions.is((select count(*) from public.tenant_fsps where fsp_id in ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002')), 2::bigint, 'multi-FSP dashboard can resolve both authorized reporting relationships');
select extensions.is((select count(*) from public.submissions where tenant_fsp_id in ('ae000000-0000-4000-8000-000000000001', 'ae000000-0000-4000-8000-000000000002')), 2::bigint, 'multi-FSP dashboard can retrieve only its two authorized FSP submissions');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc5","role":"authenticated"}';
select extensions.is((select count(*) from public.tenants where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'), 1::bigint, 'Tenant A administrator can read Tenant A');
select extensions.is((select count(*) from public.tenants where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'), 0::bigint, 'Tenant A administrator cannot read Tenant B');
select extensions.is((select count(*) from public.submissions), 2::bigint, 'Tenant A administrator sees two Tenant A submissions');
select extensions.is((select count(*) from public.submissions where id = 'be000000-0000-4000-8000-000000000004'), 0::bigint, 'Tenant A cannot read Tenant B submission for shared FSP');
select extensions.is((select count(*) from public.submissions where id = 'be000000-0000-4000-8000-000000000002'), 1::bigint, 'Tenant A can read its submission for shared FSP');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc7","role":"authenticated"}';
select extensions.is((select count(*) from public.submissions where id = 'be000000-0000-4000-8000-000000000002'), 0::bigint, 'Tenant B cannot read Tenant A submission for shared FSP');
select extensions.is((select count(*) from public.submissions where id = 'be000000-0000-4000-8000-000000000004'), 1::bigint, 'Tenant B can read its submission for shared FSP');
select extensions.is((select count(*) from public.audit_events), 1::bigint, 'Tenant B sees only its tenant audit event');
select extensions.is((select count(*) from public.submission_responses), 3::bigint, 'Tenant B sees only responses for Tenant B submissions');
reset role;

select extensions.is((select count(*) from public.questionnaire_questions where questionnaire_version_id = '11222222-2222-4222-8222-222222222222'), 13::bigint, 'published questionnaire contains all versioned workflow questions');
select extensions.is((select count(*) from public.questionnaire_sections where questionnaire_version_id = '11222222-2222-4222-8222-222222222222'), 4::bigint, 'published questionnaire resolves four sections');
select extensions.is((select count(*) from public.submission_responses sr join public.submissions s on s.id = sr.submission_id join public.submission_periods sp on sp.id = s.submission_period_id join public.questionnaire_questions qq on qq.id = sr.questionnaire_question_id where qq.questionnaire_version_id <> sp.questionnaire_version_id), 0::bigint, 'all responses belong to the exact period questionnaire version');
select extensions.is((select count(*) from public.submission_response_options where response_id = 'bf000000-0000-4000-8000-000000000005'), 2::bigint, 'multi-select response stores two relational options');

select extensions.throws_ok($$insert into public.fsps (fsp_number, registered_name) values ('51234', 'Duplicate')$$, null, null, 'duplicate FSP number is rejected');
select extensions.throws_ok($$insert into public.fsp_users (fsp_id, user_id, role) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1', 'VIEWER')$$, null, null, 'duplicate FSP membership is rejected');
select extensions.throws_ok($$insert into public.submissions (submission_period_id, tenant_fsp_id) values ('af000000-0000-4000-8000-000000000001', 'ae000000-0000-4000-8000-000000000002')$$, null, null, 'cross-tenant submission relationship is rejected');
select extensions.throws_ok($$insert into public.submission_responses (submission_id, questionnaire_question_id) values ('be000000-0000-4000-8000-000000000001', gen_random_uuid())$$, null, null, 'response outside the period questionnaire is rejected');
select extensions.throws_ok($$update public.audit_events set event_type = 'CHANGED' where id = 'ca000000-0000-4000-8000-000000000001'$$, null, null, 'audit events cannot be updated');
select extensions.throws_ok($$delete from public.questionnaire_versions where id = '11222222-2222-4222-8222-222222222222'$$, null, null, 'published questionnaire version with history cannot be deleted');

insert into public.documents (id, submission_id, document_type, status, created_by)
values ('da000000-0000-4000-8000-000000000001', 'be000000-0000-4000-8000-000000000001', 'BBEEE_CERTIFICATE', 'ACTIVE', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1');
insert into public.document_versions (id, document_id, storage_path, original_filename, mime_type, size_bytes, sha256, uploaded_by)
values ('db000000-0000-4000-8000-000000000001', 'da000000-0000-4000-8000-000000000001', 'tenant/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/fsp/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001/submission/be000000-0000-4000-8000-000000000001/dc000000-0000-4000-8000-000000000001', 'certificate.pdf', 'application/pdf', 1024, repeat('a', 64), 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1');
update public.documents set current_version_id = 'db000000-0000-4000-8000-000000000001' where id = 'da000000-0000-4000-8000-000000000001';
insert into storage.objects (id, bucket_id, name, owner)
values ('dc000000-0000-4000-8000-000000000001', 'compliance-documents', 'tenant/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/fsp/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001/submission/be000000-0000-4000-8000-000000000001/dc000000-0000-4000-8000-000000000001', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1');

select extensions.is((select public from storage.buckets where id = 'compliance-documents'), false, 'compliance document bucket is private');

set local role authenticated;
set local request.jwt.claims = '{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc2","role":"authenticated"}';
select * from public.start_submission('af000000-0000-4000-8000-000000000001', 'ae000000-0000-4000-8000-000000000001');
select * from public.save_submission_response('be000000-0000-4000-8000-000000000001', '11500000-0000-4000-8000-000000000001', to_jsonb('ffffffff-0000-4000-8000-000000000002'::text));
select * from public.prepare_certificate_upload('be000000-0000-4000-8000-000000000001', 'certificate.pdf', 'application/pdf', 1024, repeat('a', 64));
select extensions.lives_ok($$insert into storage.objects (bucket_id, name, owner) select 'compliance-documents', dv.storage_path, auth.uid() from public.document_versions dv join public.documents d on d.id = dv.document_id where d.submission_id = 'be000000-0000-4000-8000-000000000001' and dv.original_filename = 'certificate.pdf'$$, 'FSP submitter can upload a trusted prepared versioned object for an accessible submission');
select extensions.throws_ok($$insert into storage.objects (bucket_id, name, owner) values ('compliance-documents', 'tenant/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/fsp/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001/submission/be000000-0000-4000-8000-000000000001/dc000000-0000-4000-8000-000000000099', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2')$$, null, null, 'FSP submitter cannot invent an unprepared object path');
select extensions.throws_ok($$insert into storage.objects (bucket_id, name, owner) values ('compliance-documents', 'tenant/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2/fsp/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb003/submission/be000000-0000-4000-8000-000000000004/dc000000-0000-4000-8000-000000000003', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2')$$, null, null, 'FSP submitter cannot upload to an unrelated submission');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc4","role":"authenticated"}';
select extensions.throws_ok($$insert into storage.objects (bucket_id, name, owner) values ('compliance-documents', 'tenant/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/fsp/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001/submission/be000000-0000-4000-8000-000000000001/dc000000-0000-4000-8000-000000000004', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc4')$$, null, null, 'FSP viewer cannot upload compliance objects');
select extensions.throws_ok($$insert into public.submissions (submission_period_id, tenant_fsp_id) values ('af000000-0000-4000-8000-000000000001', 'ae000000-0000-4000-8000-000000000001')$$, null, null, 'FSP viewer dashboard access does not grant submission write permission');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc6","role":"authenticated"}';
select extensions.throws_ok($$insert into storage.objects (bucket_id, name, owner) values ('compliance-documents', 'tenant/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/fsp/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb003/submission/be000000-0000-4000-8000-000000000002/dc000000-0000-4000-8000-000000000005', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc6')$$, null, null, 'Tenant reviewer cannot upload on behalf of an FSP');
select extensions.throws_ok($$insert into storage.objects (bucket_id, name, owner) values ('compliance-documents', 'tenant/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2/fsp/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb003/submission/be000000-0000-4000-8000-000000000004/dc000000-0000-4000-8000-000000000006', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc6')$$, null, null, 'Tenant A reviewer cannot upload to Tenant B shared-FSP submission');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc1","role":"authenticated"}';
select extensions.is((select count(*) from storage.objects where id = 'dc000000-0000-4000-8000-000000000001'), 1::bigint, 'FSP A administrator can read its metadata-backed object');
select extensions.is_empty(
  $$update storage.objects
    set name = storage.objects.name
    where id = 'dc000000-0000-4000-8000-000000000001'
    returning 1$$,
  'objects cannot be overwritten because no UPDATE policy exists'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc3","role":"authenticated"}';
select extensions.is((select count(*) from storage.objects where id = 'dc000000-0000-4000-8000-000000000001'), 0::bigint, 'FSP B user cannot read FSP A object');
reset role;

insert into public.fsp_users (fsp_id, user_id, role, status)
values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb003', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2', 'SUBMITTER', 'ACTIVE');

set local role authenticated;
set local request.jwt.claims = '{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc2","role":"authenticated"}';
select extensions.is((select count(*) from public.submissions where tenant_fsp_id = 'ae000000-0000-4000-8000-000000000003' and id = 'be000000-0000-4000-8000-000000000002'), 1::bigint, 'shared-FSP dashboard resolves only Tenant A data when Tenant A relationship is selected');
select extensions.is((select count(*) from public.submissions where tenant_fsp_id = 'ae000000-0000-4000-8000-000000000004' and id = 'be000000-0000-4000-8000-000000000004'), 1::bigint, 'shared-FSP dashboard resolves only Tenant B data when Tenant B relationship is selected');
reset role;

select * from extensions.finish();
rollback;
