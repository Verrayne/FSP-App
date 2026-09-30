begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(51);

select extensions.has_function('public','list_my_tenant_memberships',array[]::text[],'tenant context gateway exists');
select extensions.has_function('public','get_tenant_dashboard',array['uuid','date'],'dashboard gateway exists');
select extensions.has_function('public','list_tenant_fsps',array['uuid','date','text','text','text','text','text','text','integer','integer'],'portfolio gateway exists');
select extensions.has_function('public','list_tenant_submissions',array['uuid','date','uuid','text','text','text','text','text','integer','integer'],'submission queue gateway exists');
select extensions.has_function('public','get_tenant_submission_header',array['uuid','uuid'],'submission overview gateway exists');
select extensions.ok(not has_function_privilege('anon','public.get_tenant_dashboard(uuid,date)','EXECUTE'),'anonymous cannot execute dashboard gateway');

insert into public.documents(id,submission_id,document_type,status,created_by)
values('da000000-0000-4000-8000-000000000009','be000000-0000-4000-8000-000000000004','BBEEE_CERTIFICATE','ACTIVE','cccccccc-cccc-4ccc-8ccc-ccccccccccc8');
insert into public.document_versions(id,document_id,storage_path,original_filename,mime_type,size_bytes,sha256,uploaded_by)
values('db000000-0000-4000-8000-000000000009','da000000-0000-4000-8000-000000000009','tenant/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2/fsp/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb003/submission/be000000-0000-4000-8000-000000000004/dc000000-0000-4000-8000-000000000009','tenant-b-certificate.pdf','application/pdf',1024,repeat('b',64),'cccccccc-cccc-4ccc-8ccc-ccccccccccc8');
update public.documents set current_version_id='db000000-0000-4000-8000-000000000009' where id='da000000-0000-4000-8000-000000000009';
insert into storage.objects(id,bucket_id,name,owner)
values('dc000000-0000-4000-8000-000000000009','compliance-documents','tenant/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2/fsp/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb003/submission/be000000-0000-4000-8000-000000000004/dc000000-0000-4000-8000-000000000009','cccccccc-cccc-4ccc-8ccc-ccccccccccc8');

set local role authenticated;
set local request.jwt.claims='{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc1","role":"authenticated"}';
select extensions.is((select count(*) from public.list_my_tenant_memberships()),0::bigint,'FSP-only user has no insurer context');
select extensions.throws_ok($$select * from public.get_tenant_dashboard('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','2026-09-11')$$,'42501',null,'FSP-only user cannot invoke insurer dashboard');
reset role;

set local role authenticated;
set local request.jwt.claims='{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc5","role":"authenticated"}';
select extensions.is((select count(*) from public.list_my_tenant_memberships()),1::bigint,'Tenant A administrator resolves one insurer context');
select extensions.is((select tenant_role from public.list_my_tenant_memberships()),'ADMIN','Tenant A role is scoped to its membership');
select extensions.is((select total_fsps from public.get_tenant_dashboard('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','2026-09-11')),2::bigint,'dashboard total counts active Tenant A relationships');
select extensions.is((select submitted_fsps from public.get_tenant_dashboard('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','2026-09-11')),0::bigint,'submitted metric uses submitted-or-later states in current period');
select extensions.is((select outstanding_fsps from public.get_tenant_dashboard('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','2026-09-11')),2::bigint,'outstanding metric includes not-started and in-progress FSPs');
select extensions.is((select count(*) from public.list_tenant_fsps('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','2026-09-11','','ALL','ALL','ALL','name','asc',1,25)),2::bigint,'Tenant A portfolio returns only its relationships');
select extensions.is((select count(*) from public.list_tenant_fsps('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','2026-09-11','Ubuntu','ALL','ALL','ALL','name','asc',1,25)),1::bigint,'portfolio searches trading names');
select extensions.is((select count(*) from public.list_tenant_fsps('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','2026-09-11','53456','ALL','ALL','ALL','name','asc',1,25)),1::bigint,'portfolio searches FSP numbers');
select extensions.is((select count(*) from public.list_tenant_fsps('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','2026-09-11','CHA-UM-002','ALL','ALL','ALL','name','asc',1,25)),1::bigint,'portfolio searches tenant-specific broker references');
select extensions.ok((select count(*) > 0 and bool_and(submission_status='IN_PROGRESS') from public.list_tenant_fsps('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','2026-09-11','','IN_PROGRESS','ALL','ALL','name','asc',1,25)),'portfolio filters current-period submission status');
select extensions.is((select count(*) from public.list_tenant_submissions('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','2026-09-11',null,'','ALL','ALL','submit_date','desc',1,25)),2::bigint,'Tenant A queue defaults to its current period');
select extensions.is((select count(*) from public.list_tenant_submissions('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','2026-09-11',null,'Ubuntu','ALL','AFFIDAVIT','fsp','asc',1,10)),1::bigint,'queue applies server search and route filter');
select extensions.is((select count(*) from public.get_tenant_submission_header('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','be000000-0000-4000-8000-000000000002')),1::bigint,'Tenant A reads its shared-FSP submission overview');
select extensions.is((select questionnaire_version from public.get_tenant_submission_header('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','be000000-0000-4000-8000-000000000002')),1,'overview preserves the exact period questionnaire version');
select extensions.is((select count(*) from public.get_tenant_submission_header('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','be000000-0000-4000-8000-000000000004')),0::bigint,'wrong-tenant shared-FSP overview is indistinguishable from not found');
select extensions.throws_ok($$select * from public.get_tenant_dashboard('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','2026-09-11')$$,'42501',null,'Tenant A cannot request Tenant B aggregates');
select extensions.throws_ok($$select * from public.list_tenant_fsps('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','2026-09-11','','ALL','ALL','ALL','name','asc',1,25)$$,'42501',null,'Tenant A cannot request Tenant B portfolio');
select extensions.throws_ok($$select * from public.list_tenant_submissions('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','2026-09-11',null,'','ALL','ALL','submit_date','desc',1,25)$$,'42501',null,'Tenant A cannot request Tenant B queue');
select extensions.is((select count(*) from public.tenants where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'),0::bigint,'Tenant A cannot directly read Tenant B tenant row');
select extensions.is((select count(*) from public.tenant_fsps where id='ae000000-0000-4000-8000-000000000004'),0::bigint,'Tenant A cannot directly read Tenant B shared-FSP relationship');
select extensions.is((select count(*) from public.submissions where id='be000000-0000-4000-8000-000000000004'),0::bigint,'Tenant A cannot directly read Tenant B shared-FSP submission');
select extensions.is((select count(*) from public.submission_responses where id='bf000000-0000-4000-8000-000000000005'),0::bigint,'Tenant A cannot directly read Tenant B response');
select extensions.is((select count(*) from public.documents where id='da000000-0000-4000-8000-000000000009'),0::bigint,'Tenant A cannot directly read Tenant B document metadata');
select extensions.is((select count(*) from public.document_versions where id='db000000-0000-4000-8000-000000000009'),0::bigint,'Tenant A cannot directly read Tenant B document version or path');
select extensions.is((select count(*) from storage.objects where id='dc000000-0000-4000-8000-000000000009'),0::bigint,'Tenant A cannot access Tenant B private Storage object');
select extensions.throws_ok($$select * from public.list_tenant_fsps('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','2026-09-11','','ALL','ALL','ALL','fsp_number;drop table fsps','asc',1,25)$$,'22023',null,'portfolio sort fields are allowlisted');
reset role;

set local role authenticated;
set local request.jwt.claims='{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc6","role":"authenticated"}';
select extensions.is((select count(*) from public.get_tenant_dashboard('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','2026-09-11')),1::bigint,'Tenant A reviewer has ordinary portal read access');
select extensions.is((select count(*) from public.get_tenant_submission_header('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','be000000-0000-4000-8000-000000000002')),1::bigint,'reviewer can inspect a tenant submission read-only');
reset role;

set local role authenticated;
set local request.jwt.claims='{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc7","role":"authenticated"}';
select extensions.is((select total_fsps from public.get_tenant_dashboard('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','2026-09-11')),2::bigint,'Tenant B administrator sees Tenant B metrics');
select extensions.is((select submitted_fsps from public.get_tenant_dashboard('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','2026-09-11')),2::bigint,'Tenant B submitted metric includes submitted and completed');
select extensions.is((select count(*) from public.get_tenant_submission_header('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','be000000-0000-4000-8000-000000000002')),0::bigint,'Tenant B cannot read Tenant A shared-FSP submission overview');
select extensions.is((select count(*) from public.documents where id='da000000-0000-4000-8000-000000000009'),1::bigint,'Tenant B can read its document metadata');
reset role;

set local role authenticated;
set local request.jwt.claims='{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc9","role":"authenticated"}';
select extensions.is((select count(*) from public.list_my_tenant_memberships()),2::bigint,'multi-tenant user resolves both authorised insurers');
select extensions.is((select tenant_role from public.list_my_tenant_memberships() where tenant_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),'ADMIN','multi-tenant user is Admin in Tenant A');
select extensions.is((select tenant_role from public.list_my_tenant_memberships() where tenant_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'),'REVIEWER','multi-tenant user is Reviewer in Tenant B');
reset role;

update public.tenant_memberships set status='REVOKED' where id='ad000000-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claims='{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc5","role":"authenticated"}';
select extensions.is((select count(*) from public.list_my_tenant_memberships()),0::bigint,'revocation removes tenant context without waiting for token expiry');
select extensions.is((select count(*) from public.submissions),0::bigint,'revocation removes protected tenant data in the same Auth session');
select extensions.throws_ok($$select * from public.get_tenant_dashboard('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','2026-09-11')$$,'42501',null,'revoked membership cannot invoke protected RPCs');
reset role;

update public.tenants set active=false,status='SUSPENDED' where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
set local role authenticated;
set local request.jwt.claims='{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc6","role":"authenticated"}';
select extensions.is((select count(*) from public.list_my_tenant_memberships()),0::bigint,'inactive tenant is excluded from available contexts');
select extensions.is((select count(*) from public.tenant_fsps),0::bigint,'inactive tenant blocks direct relationship reads for tenant users');
select extensions.is((select count(*) from public.submissions),0::bigint,'inactive tenant blocks direct submission reads for tenant users');
select extensions.throws_ok($$select * from public.get_tenant_dashboard('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','2026-09-11')$$,'42501',null,'inactive tenant blocks insurer RPC operation');
reset role;

set local role authenticated;
set local request.jwt.claims='{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc1","role":"authenticated"}';
select extensions.is((select count(*) from public.submissions where id='be000000-0000-4000-8000-000000000001'),1::bigint,'inactive tenant hardening preserves the independent FSP authorization path');
reset role;

select * from extensions.finish();
rollback;
