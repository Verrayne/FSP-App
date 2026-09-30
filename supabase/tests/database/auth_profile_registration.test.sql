begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(8);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values (
  '00000000-0000-0000-0000-000000000000',
  'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
  'authenticated',
  'authenticated',
  'prompt03-profile-test@example.test',
  extensions.crypt('TransactionOnly!123', extensions.gen_salt('bf')),
  null,
  '{"provider":"email","providers":["email"]}',
  '{"first_name":"  Nomsa  ","last_name":"  Molefe  ","contact_number":"  +27 82 555 0101  ","job_title":"  Compliance Officer  ","role":"ADMIN","fsp_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001"}',
  now(), now(), '', '', '', ''
);

select extensions.is(
  (select count(*) from public.profiles where id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1'),
  1::bigint,
  'Auth registration creates exactly one profile'
);
select extensions.is(
  (select jsonb_build_array(first_name, last_name, contact_number, job_title)
   from public.profiles where id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1'),
  '["Nomsa", "Molefe", "+27 82 555 0101", "Compliance Officer"]'::jsonb,
  'registration profile fields are trimmed and persisted'
);
select extensions.is(
  (select count(*) from public.fsp_users where user_id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1'),
  0::bigint,
  'registration metadata cannot create an FSP membership'
);
select extensions.is(
  (select count(*) from public.tenant_memberships where user_id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1'),
  0::bigint,
  'registration metadata cannot create a tenant membership'
);
select extensions.is(
  has_function_privilege('authenticated', 'private.create_profile_for_auth_user()', 'EXECUTE'),
  false,
  'the security-definer profile trigger function is not client-callable'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"dddddddd-dddd-4ddd-8ddd-ddddddddddd1","role":"authenticated"}';
select extensions.is(
  (select count(*) from public.profiles),
  1::bigint,
  'a registered user can read only their own profile'
);
update public.profiles set job_title = 'Senior Compliance Officer'
where id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1';
select extensions.is(
  (select job_title from public.profiles where id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1'),
  'Senior Compliance Officer',
  'a registered user can update an allowed field on their own profile'
);
update public.profiles set first_name = 'Compromised'
where id = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';
reset role;

select extensions.is(
  (select first_name from public.profiles where id = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'),
  'Ayanda',
  'a registered user cannot update another profile'
);

select * from extensions.finish();
rollback;
