begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(15);

insert into public.fsp_users (fsp_id, user_id, role, status)
values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb003', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2', 'SUBMITTER', 'ACTIVE');

set local role authenticated;
set local request.jwt.claims = '{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc2","role":"authenticated"}';

select extensions.lives_ok($$select * from public.save_submission_response('be000000-0000-4000-8000-000000000002','11500000-0000-4000-8000-000000000001',to_jsonb('ffffffff-0000-4000-8000-000000000002'::text))$$,'certificate revenue route can be selected');
select extensions.lives_ok($$select * from public.save_submission_response('be000000-0000-4000-8000-000000000002','11500000-0000-4000-8000-000000000004','51.25'::jsonb)$$,'black ownership percentage can be saved');
select extensions.lives_ok($$select * from public.save_submission_response('be000000-0000-4000-8000-000000000002','11500000-0000-4000-8000-000000000005','30.5'::jsonb)$$,'black female ownership percentage can be saved');
select extensions.is((select submission_route from public.submissions where id='be000000-0000-4000-8000-000000000002'),'CERTIFICATE','trusted route rules derive the certificate path');
select extensions.lives_ok($$select * from public.prepare_certificate_upload('be000000-0000-4000-8000-000000000002','certificate.pdf','application/pdf',1024,repeat('a',64))$$,'authorized submitter can prepare immutable certificate metadata');
select extensions.matches((select storage_path from public.document_versions dv join public.documents d on d.id=dv.document_id where d.submission_id='be000000-0000-4000-8000-000000000002' and dv.original_filename='certificate.pdf'),'^tenant/[0-9a-f-]{36}/fsp/[0-9a-f-]{36}/submission/[0-9a-f-]{36}/[0-9a-f-]{36}$','certificate path is bound to tenant, FSP, submission, and version');
select extensions.lives_ok($$insert into storage.objects(bucket_id,name,owner) select 'compliance-documents',dv.storage_path,auth.uid() from public.document_versions dv join public.documents d on d.id=dv.document_id where d.submission_id='be000000-0000-4000-8000-000000000002' and dv.original_filename='certificate.pdf'$$,'authorized submitter can create the prepared private object');
select extensions.throws_ok($$insert into storage.objects(bucket_id,name,owner) values('compliance-documents','tenant/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/fsp/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb003/submission/be000000-0000-4000-8000-000000000002/eeeeeeee-0000-4000-8000-000000000099',auth.uid())$$,null,null,'mutable submission still rejects an unprepared object path');
select extensions.lives_ok($$select * from public.finalize_certificate_upload((select dv.id from public.document_versions dv join public.documents d on d.id=dv.document_id where d.submission_id='be000000-0000-4000-8000-000000000002' and dv.original_filename='certificate.pdf'))$$,'trusted finalization activates an uploaded version');
select extensions.is((select status from public.documents where submission_id='be000000-0000-4000-8000-000000000002' and document_type='BBEEE_CERTIFICATE'),'ACTIVE','certificate document becomes active');
select extensions.lives_ok($$select * from public.submit_submission('be000000-0000-4000-8000-000000000002')$$,'complete certificate submission passes final validation');
select extensions.is((select status from public.submissions where id='be000000-0000-4000-8000-000000000002'),'SUBMITTED','certificate submission becomes immutable');
select extensions.is((select count(*) from public.audit_events where submission_id='be000000-0000-4000-8000-000000000002' and event_type='SUBMISSION_SUBMITTED'),1::bigint,'certificate finalization writes one submission audit event');
select extensions.throws_ok($$select * from public.prepare_certificate_upload('be000000-0000-4000-8000-000000000002','replacement.pdf','application/pdf',1024,repeat('b',64))$$,null,null,'submitted certificate metadata cannot be replaced');
select extensions.throws_ok($$insert into storage.objects(bucket_id,name,owner) values('compliance-documents','tenant/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/fsp/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb003/submission/be000000-0000-4000-8000-000000000002/eeeeeeee-0000-4000-8000-000000000001',auth.uid())$$,null,null,'submitted certificate object path cannot accept new writes');

reset role;
select * from extensions.finish();
rollback;
