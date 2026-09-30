begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(34);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
(
  '00000000-0000-0000-0000-000000000000',
  'dddddddd-dddd-4ddd-8ddd-ddddddddddd2', 'authenticated', 'authenticated',
  'onboarding-a@example.test', extensions.crypt('TransactionOnly!123', extensions.gen_salt('bf')),
  now(), '{"provider":"email","providers":["email"]}',
  '{"first_name":"Onboarding","last_name":"Alpha"}', now(), now(), '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000',
  'dddddddd-dddd-4ddd-8ddd-ddddddddddd3', 'authenticated', 'authenticated',
  'onboarding-b@example.test', extensions.crypt('TransactionOnly!123', extensions.gen_salt('bf')),
  now(), '{"provider":"email","providers":["email"]}',
  '{"first_name":"Onboarding","last_name":"Beta"}', now(), now(), '', '', '', ''
);

set local role anon;
select extensions.throws_ok(
  $$select * from public.search_fsps_for_onboarding('Karoo', 10, 0)$$,
  null, null, 'anonymous users cannot search the onboarding registry'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"dddddddd-dddd-4ddd-8ddd-ddddddddddd2","role":"authenticated"}';
select extensions.is(
  (select onboarding_state from public.get_my_fsp_onboarding_state()),
  'NO_FSP', 'a user without membership or request starts in NO_FSP'
);
select extensions.is(
  (select count(*) from public.search_fsps_for_onboarding('Karoo Oak', 10, 0)),
  1::bigint, 'an onboarding user can search the constrained registry projection'
);
select extensions.throws_ok(
  $$select * from public.search_fsps_for_onboarding('K', 10, 0)$$,
  '22023', null, 'search enforces a minimum input length in the database'
);
select extensions.is(
  (select city from public.get_fsp_for_onboarding('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001')),
  'Cape Town', 'onboarding detail exposes the permitted primary address projection'
);
select extensions.is(
  (select outcome from public.request_fsp_link('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb003')),
  'CREATED', 'a user can create their own pending FSP link request'
);
select extensions.is(
  (select count(*) from public.fsp_link_requests where user_id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2' and status = 'PENDING'),
  1::bigint, 'request creation stores exactly one pending row'
);
select extensions.is(
  (select outcome from public.request_fsp_link('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb003')),
  'EXISTING_PENDING', 'repeated request creation returns the existing pending request'
);
select extensions.is(
  (select count(*) from public.fsp_link_requests where user_id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2' and fsp_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb003'),
  1::bigint, 'duplicate submission does not create another request'
);
select extensions.is(
  (select count(*) from public.fsp_link_requests),
  1::bigint, 'the requester can read their own request and no other request'
);
select extensions.throws_ok(
  $$insert into public.fsp_link_requests (fsp_id, user_id) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd3')$$,
  null, null, 'the browser role cannot create a request for another user directly'
);
select extensions.throws_ok(
  $$insert into public.fsp_users (fsp_id, user_id, role, status) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb003', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2', 'ADMIN', 'ACTIVE')$$,
  null, null, 'the browser role cannot create an FSP membership directly'
);
select extensions.throws_ok(
  $$update public.fsp_link_requests set status = 'APPROVED' where user_id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2'$$,
  null, null, 'the requester cannot approve a request with a direct update'
);
reset role;

select set_config(
  'app.onboarding_test_request_a',
  (select id::text from public.fsp_link_requests where user_id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2'),
  true
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc1","role":"authenticated"}';
select extensions.throws_ok(
  $$select * from public.approve_fsp_link_request(current_setting('app.onboarding_test_request_a')::uuid)$$,
  '42501', null, 'ordinary authenticated users cannot approve requests'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"dddddddd-dddd-4ddd-8ddd-ddddddddddd2","role":"authenticated"}';
select extensions.throws_ok(
  $$select * from public.approve_fsp_link_request(current_setting('app.onboarding_test_request_a')::uuid)$$,
  '42501', null, 'requesters cannot approve themselves'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"dddddddd-dddd-4ddd-8ddd-ddddddddddd3","role":"authenticated"}';
select extensions.is(
  (select count(*) from public.fsp_link_requests),
  0::bigint, 'another user cannot read the first user''s private request'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc6","role":"authenticated"}';
select extensions.lives_ok(
  $$select * from public.approve_fsp_link_request(current_setting('app.onboarding_test_request_a')::uuid)$$,
  'an authorised mapped-tenant reviewer can approve a pending request'
);
reset role;

select extensions.is(
  (select status from public.fsp_link_requests where user_id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2'),
  'APPROVED', 'approval updates the request state'
);
select extensions.is(
  (select status from public.fsp_users where user_id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2'),
  'ACTIVE', 'approval creates an active membership atomically'
);
select extensions.is(
  (select role from public.fsp_users where user_id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2'),
  'ADMIN', 'the first active FSP member receives the trusted ADMIN role'
);
select extensions.is(
  (select count(*) from public.audit_events where actor_user_id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2' and event_type = 'FSP_LINK_REQUESTED'),
  1::bigint, 'request creation writes an audit event'
);
select extensions.is(
  (select count(*) from public.audit_events where actor_user_id = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc6' and event_type = 'FSP_LINK_APPROVED'),
  1::bigint, 'approval writes an approval audit event'
);
select extensions.is(
  (select count(*) from public.audit_events where actor_user_id = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc6' and event_type = 'FSP_MEMBERSHIP_CREATED'),
  1::bigint, 'approval writes a membership audit event'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc6","role":"authenticated"}';
select extensions.throws_ok(
  $$select * from public.approve_fsp_link_request(current_setting('app.onboarding_test_request_a')::uuid)$$,
  '23505', null, 'a completed request cannot be approved again'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"dddddddd-dddd-4ddd-8ddd-ddddddddddd2","role":"authenticated"}';
select extensions.is(
  (select onboarding_state from public.get_my_fsp_onboarding_state()),
  'ACTIVE', 'approved users resolve to ACTIVE without recreating their account'
);
select extensions.is(
  (select count(*) from public.get_my_fsp_memberships()),
  1::bigint, 'approved users retrieve only their active memberships'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc4","role":"authenticated"}';
select extensions.is(
  (select count(*) from public.get_my_fsp_memberships()),
  2::bigint, 'a multi-FSP user retrieves both permitted contexts'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"dddddddd-dddd-4ddd-8ddd-ddddddddddd3","role":"authenticated"}';
select extensions.is(
  (select outcome from public.request_fsp_link('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001')),
  'CREATED', 'a second user can create an independent request'
);
reset role;

select set_config(
  'app.onboarding_test_request_b',
  (select id::text from public.fsp_link_requests where user_id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd3'),
  true
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc6","role":"authenticated"}';
select extensions.lives_ok(
  $$select * from public.reject_fsp_link_request(current_setting('app.onboarding_test_request_b')::uuid, 'Relationship could not be verified')$$,
  'an authorised mapped-tenant reviewer can reject a request'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"dddddddd-dddd-4ddd-8ddd-ddddddddddd3","role":"authenticated"}';
select extensions.is(
  (select onboarding_state from public.get_my_fsp_onboarding_state()),
  'REJECTED', 'a rejected user resolves to the rejected onboarding state'
);
select extensions.is(
  (select rejection_reason from public.get_my_fsp_onboarding_state()),
  'Relationship could not be verified', 'the requester can see the user-facing rejection reason'
);
select extensions.is(
  (select outcome from public.request_fsp_link('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001')),
  'CREATED', 'a rejected user may create a new pending request'
);
reset role;

update public.fsps set active = false where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb004';
set local role authenticated;
set local request.jwt.claims = '{"sub":"dddddddd-dddd-4ddd-8ddd-ddddddddddd3","role":"authenticated"}';
select extensions.throws_ok(
  $$select * from public.request_fsp_link('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb004')$$,
  '22023', null, 'inactive registry records cannot be requested'
);
select extensions.is(
  (select claimable from public.search_fsps_for_onboarding('54567', 10, 0)),
  false, 'inactive registry records remain visible but are marked ineligible'
);
reset role;

select * from extensions.finish();
rollback;
