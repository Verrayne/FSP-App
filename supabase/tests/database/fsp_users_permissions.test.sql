begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(12);

select extensions.has_table('public','fsp_invitations','application invitations have a dedicated table');
select extensions.has_column('public','fsp_invitations','token_hash','only the invitation digest is persisted');
select extensions.col_is_pk('public','fsp_invitations','id','invitations have a stable identifier');
select extensions.ok(not has_table_privilege('authenticated','public.fsp_invitations','SELECT'),'authenticated users cannot directly enumerate invitations');

set local role authenticated;
set local request.jwt.claims = '{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc1","role":"authenticated"}';
select extensions.is((select count(*) from public.list_fsp_members('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001')),3::bigint,'active FSP member can list only the selected FSP team');
select extensions.lives_ok($$select * from public.create_fsp_invitation('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001','NEW.USER@EXAMPLE.TEST','SUBMITTER',repeat('a',64))$$,'administrator can create an invitation');
select extensions.is((select email_normalized from public.fsp_invitations where token_hash=repeat('a',64)),'new.user@example.test','invitation email is normalized');
select extensions.is((select expiry_date-invite_date from public.fsp_invitations where token_hash=repeat('a',64)),interval '7 days','expiry is centrally fixed at seven days');
select extensions.throws_ok($$select * from public.create_fsp_invitation('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001','new.user@example.test','VIEWER',repeat('b',64))$$,'23505',null,'duplicate pending invitation is rejected');
select extensions.throws_ok($$select public.revoke_fsp_member('fd000000-0000-4000-8000-000000000001')$$,null,null,'final active administrator cannot be revoked');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc3","role":"authenticated"}';
select extensions.throws_ok($$select * from public.list_fsp_members('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001')$$,null,null,'cross-FSP membership enumeration is denied');
select extensions.throws_ok($$select * from public.create_fsp_invitation('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002','blocked@example.test','VIEWER',repeat('c',64))$$,null,null,'viewer cannot invite users');
reset role;

select * from extensions.finish();
rollback;
