begin;

create extension if not exists pgtap with schema extensions;
select extensions.no_plan();

select extensions.has_table('public','tenant_invitations','tenant invitation table exists');
select extensions.has_function('public','get_tenant_settings',array['uuid'],'organisation gateway exists');
select extensions.has_function('public','list_tenant_members',array['uuid'],'tenant member gateway exists');
select extensions.has_function('public','create_tenant_invitation',array['uuid','text','text','text'],'tenant invitation gateway exists');
select extensions.has_function('public','create_tenant_submission_period',array['uuid','text','integer','date','date','uuid','text'],'period creation gateway exists');
select extensions.has_function('public','search_fsps_for_tenant_link',array['uuid','text','integer'],'registry search gateway exists');
select extensions.has_function('public','link_tenant_fsp',array['uuid','uuid','text'],'relationship gateway exists');
select extensions.ok(not has_function_privilege('anon','public.update_tenant_organisation(uuid,text)','EXECUTE'),'anonymous cannot mutate organisations');
select extensions.ok(has_function_privilege('anon','public.get_tenant_invitation_context(text)','EXECUTE'),'anonymous can resolve minimum invitation context');
select extensions.ok(not has_table_privilege('authenticated','public.tenant_invitations','SELECT'),'invitation secrets are not directly selectable');

-- Tenant-specific questionnaire fixtures for scope checks.
insert into public.questionnaires(id,tenant_id,code,name,active)
values
  ('91111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','TENANT_B_ONLY','Tenant B Questionnaire',true),
  ('92111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','TENANT_A_DRAFT','Tenant A Draft Questionnaire',true);
insert into public.questionnaire_versions(id,questionnaire_id,version_number,status,published_date,published_by)
values
  ('91222222-2222-4222-8222-222222222222','91111111-1111-4111-8111-111111111111',1,'PUBLISHED',now(),'cccccccc-cccc-4ccc-8ccc-ccccccccccc7'),
  ('92222222-2222-4222-8222-222222222222','92111111-1111-4111-8111-111111111111',1,'DRAFT',null,null);

set local role authenticated;
set local request.jwt.claims='{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc5","role":"authenticated"}';
select extensions.is((select count(*) from public.get_tenant_settings('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1')),1::bigint,'Tenant A admin reads own organisation');
select extensions.is((select tenant_code from public.get_tenant_settings('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1')),'CAPE_HORIZON','stable tenant code is returned read-only');
select * from public.update_tenant_organisation('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','Cape Horizon Assurance Test');
select extensions.is((select tenant_name from public.get_tenant_settings('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1')),'Cape Horizon Assurance Test','admin updates allowlisted organisation name');
select extensions.throws_ok($$select * from public.get_tenant_settings('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2')$$,'42501',null,'Tenant A cannot read Tenant B settings gateway');
select extensions.is((select count(*) from public.tenants where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'),0::bigint,'Tenant A cannot directly read Tenant B organisation');
select extensions.is((select count(*) from public.list_tenant_members('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1')),3::bigint,'admin lists only own tenant users');
select extensions.throws_ok($$select * from public.list_tenant_members('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2')$$,'42501',null,'Tenant A cannot list Tenant B users');

select public.change_tenant_member_role('ad000000-0000-4000-8000-000000000002','ADMIN');
select extensions.is((select role from public.tenant_memberships where id='ad000000-0000-4000-8000-000000000002'),'ADMIN','allowed role promotion succeeds');
select extensions.throws_ok($$select public.change_tenant_member_role('ad000000-0000-4000-8000-000000000002','PLATFORM_ADMIN')$$,'22023',null,'platform administrator cannot be assigned');
select extensions.throws_ok($$select public.change_tenant_member_role('ad000000-0000-4000-8000-000000000002','SUPPORT')$$,'22023',null,'support authority cannot be assigned');
select public.revoke_tenant_member('ad000000-0000-4000-8000-000000000002');
select extensions.is((select status from public.tenant_memberships where id='ad000000-0000-4000-8000-000000000002'),'REVOKED','tenant membership is soft removed');
reset role;
select extensions.is((select count(*) from auth.users where id='cccccccc-cccc-4ccc-8ccc-ccccccccccc6'),1::bigint,'removing tenant access preserves Auth user');
select extensions.is((select count(*) from public.profiles where id='cccccccc-cccc-4ccc-8ccc-ccccccccccc6'),1::bigint,'removing tenant access preserves profile');

set local role authenticated;
set local request.jwt.claims='{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc7","role":"authenticated"}';
select extensions.throws_ok($$select public.change_tenant_member_role('ad000000-0000-4000-8000-000000000003','REVIEWER')$$,'55000',null,'final Tenant B admin cannot be demoted');
select extensions.throws_ok($$select public.revoke_tenant_member('ad000000-0000-4000-8000-000000000003')$$,'55000',null,'final Tenant B admin cannot be removed');
reset role;

set local role authenticated;
set local request.jwt.claims='{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc8","role":"authenticated"}';
select extensions.throws_ok($$select * from public.get_tenant_settings('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2')$$,'42501',null,'reviewer cannot access settings');
select extensions.throws_ok($$select * from public.create_tenant_invitation('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','new@example.test','REVIEWER',repeat('a',64))$$,'42501',null,'reviewer cannot invite tenant users');
reset role;

set local role authenticated;
set local request.jwt.claims='{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc5","role":"authenticated"}';
select extensions.is((select email from public.create_tenant_invitation('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','onboarding.user@example.test','REVIEWER',repeat('1',64))),'onboarding.user@example.test','admin creates secure invitation');
select extensions.throws_ok($$select * from public.create_tenant_invitation('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','onboarding.user@example.test','REVIEWER',repeat('2',64))$$,'23505',null,'duplicate pending invitation is prevented');
select extensions.throws_ok($$select * from public.create_tenant_invitation('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','other@example.test','PLATFORM_ADMIN',repeat('3',64))$$,'22023',null,'privileged role cannot be invited');
select extensions.throws_ok($$select * from public.create_tenant_invitation('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','other@example.test','REVIEWER',repeat('4',64))$$,'42501',null,'Tenant A cannot invite into Tenant B');
reset role;

set local role anon;
set local request.jwt.claims='{"role":"anon"}';
select extensions.is((select count(*) from public.get_tenant_invitation_context(repeat('1',64))),1::bigint,'valid invitation exposes minimum public context');
select extensions.is((select count(*) from public.get_tenant_invitation_context(repeat('f',64))),0::bigint,'unknown invitation is indistinguishable from unavailable');
reset role;

set local role authenticated;
set local request.jwt.claims='{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccc10","role":"authenticated"}';
select extensions.is((select tenant_id from public.accept_tenant_invitation(repeat('1',64))),'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid,'verified matching user accepts invitation');
select extensions.is((select count(*) from public.tenant_memberships where tenant_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' and user_id='cccccccc-cccc-4ccc-8ccc-cccccccccc10'),1::bigint,'acceptance creates exactly one membership');
select extensions.throws_ok($$select * from public.accept_tenant_invitation(repeat('1',64))$$,'P0002',null,'used invitation cannot be accepted twice');
reset role;

insert into public.tenant_invitations(tenant_id,email,email_normalized,role,token_hash,invited_by,invite_date,expiry_date)
values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','fsp.viewer@example.test','fsp.viewer@example.test','REVIEWER',repeat('5',64),'cccccccc-cccc-4ccc-8ccc-ccccccccccc5',now()-interval '8 days',now()-interval '1 day'),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','fsp.submitter@example.test','fsp.submitter@example.test','REVIEWER',repeat('6',64),'cccccccc-cccc-4ccc-8ccc-ccccccccccc5',now(),now()+interval '7 days');

set local role authenticated;
set local request.jwt.claims='{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc3","role":"authenticated"}';
select extensions.throws_ok($$select * from public.accept_tenant_invitation(repeat('5',64))$$,'P0002',null,'expired invitation is rejected');
select extensions.throws_ok($$select * from public.accept_tenant_invitation(repeat('6',64))$$,'42501',null,'authenticated identity must match invitation email');
reset role;

set local role authenticated;
set local request.jwt.claims='{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc5","role":"authenticated"}';
select extensions.is((select count(*) from public.list_manageable_questionnaire_versions('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1') where questionnaire_version_id='11222222-2222-4222-8222-222222222222'),1::bigint,'global published questionnaire is selectable');
select extensions.is((select count(*) from public.list_manageable_questionnaire_versions('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1') where questionnaire_version_id in ('91222222-2222-4222-8222-222222222222','92222222-2222-4222-8222-222222222222')),0::bigint,'other-tenant and draft questionnaire versions are excluded');
select extensions.ok((select period_id from public.create_tenant_submission_period('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','2027 Draft',2027,'2027-01-01','2027-03-31','11222222-2222-4222-8222-222222222222','DRAFT')) is not null,'valid draft period can be created');
reset role;

-- Replace the generated period assertion with structural checks that do not depend on UUID generation.
set local role authenticated;
set local request.jwt.claims='{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc5","role":"authenticated"}';
select extensions.is((select count(*) from public.list_tenant_settings_periods('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1') where period_name='2027 Draft'),1::bigint,'valid draft period is listed');
select extensions.throws_ok($$select * from public.create_tenant_submission_period('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','Bad dates',2027,'2027-04-01','2027-04-01','11222222-2222-4222-8222-222222222222','DRAFT')$$,'22023',null,'invalid date range is rejected');
select extensions.throws_ok($$select * from public.create_tenant_submission_period('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','Wrong tenant questionnaire',2027,'2027-04-01','2027-05-01','91222222-2222-4222-8222-222222222222','DRAFT')$$,'22023',null,'other-tenant questionnaire is rejected');
select extensions.throws_ok($$select * from public.create_tenant_submission_period('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','Draft questionnaire',2027,'2027-04-01','2027-05-01','92222222-2222-4222-8222-222222222222','DRAFT')$$,'22023',null,'draft questionnaire version is rejected');
select extensions.throws_ok($$select public.update_tenant_submission_period('af000000-0000-4000-8000-000000000001','Historical reinterpretation',2026,'2026-08-01','2026-12-01','91222222-2222-4222-8222-222222222222','OPEN')$$,'55000',null,'questionnaire cannot change after submissions exist');
select extensions.throws_ok($$select public.delete_tenant_submission_period('af000000-0000-4000-8000-000000000001')$$,'55000',null,'period with submissions cannot be deleted');
select public.delete_tenant_submission_period((select period_id from public.list_tenant_settings_periods('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1') where period_name='2027 Draft'));
select extensions.is((select count(*) from public.list_tenant_settings_periods('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1') where period_name='2027 Draft'),0::bigint,'unused draft period may be deleted');

select extensions.is((select fsp_number from public.search_fsps_for_tenant_link('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','54567',10) limit 1),'54567','admin searches safe global FSP projection');
select extensions.is((select tenant_fsp_id from public.link_tenant_fsp('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb004','CHA-GB-004')) is not null,true,'admin links existing global FSP');
select extensions.is((select broker_reference from public.list_tenant_fsp_relationships('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','54567',1,25)),'CHA-GB-004','broker reference remains tenant-specific');
select extensions.throws_ok($$select * from public.link_tenant_fsp('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb004','DUPLICATE')$$,'23505',null,'duplicate relationship is prevented');
select extensions.is((select count(*) from public.fsp_users where fsp_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb004'),0::bigint,'linking an FSP does not create FSP user access');
select public.update_tenant_fsp_relationship((select tenant_fsp_id from public.list_tenant_fsp_relationships('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','54567',1,25)),'CHA-GB-UPDATED');
select extensions.is((select broker_reference from public.list_tenant_fsp_relationships('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','54567',1,25)),'CHA-GB-UPDATED','broker reference update succeeds');
select extensions.throws_ok($$select public.update_tenant_fsp_relationship('ae000000-0000-4000-8000-000000000004','CROSS-TENANT')$$,'42501',null,'Tenant A cannot modify Tenant B shared-FSP relationship');
select public.delink_tenant_fsp('ae000000-0000-4000-8000-000000000003');
select extensions.is((select count(*) from public.submissions where tenant_fsp_id='ae000000-0000-4000-8000-000000000003'),1::bigint,'delinking preserves historical submissions');
select extensions.is((select relationship_status from public.list_tenant_fsp_relationships('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','53456',1,25)),'DELINKED','relationship is soft delinked');
select extensions.is((select relationship_status from public.link_tenant_fsp('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb003','CHA-UM-RELINKED')),'ACTIVE','relink reuses historical relationship');
select extensions.is((select count(*) from public.tenant_fsps where fsp_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb003'),2::bigint,'one global FSP remains shared across two tenants');
select extensions.ok((select count(*)>=8 from public.audit_events where tenant_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' and event_type in ('TENANT_ORGANISATION_UPDATED','TENANT_MEMBER_ROLE_CHANGED','TENANT_MEMBERSHIP_REMOVED','TENANT_USER_INVITED','TENANT_INVITATION_ACCEPTED','SUBMISSION_PERIOD_CREATED','SUBMISSION_PERIOD_DELETED','TENANT_FSP_LINKED','TENANT_FSP_UPDATED','TENANT_FSP_DELINKED','TENANT_FSP_RELINKED')),'tenant administration operations are audited');
reset role;

select * from extensions.finish();
rollback;
