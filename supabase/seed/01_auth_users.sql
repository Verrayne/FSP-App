-- Development-only Auth identities. Never use these credentials in staging or production.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1', 'authenticated', 'authenticated', 'fsp.admin@example.test', extensions.crypt('LocalDevOnly!123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Ayanda","last_name":"Dlamini"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2', 'authenticated', 'authenticated', 'fsp.submitter@example.test', extensions.crypt('LocalDevOnly!123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Pieter","last_name":"Jacobs"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 'authenticated', 'authenticated', 'fsp.viewer@example.test', extensions.crypt('LocalDevOnly!123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Lerato","last_name":"Mokoena"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc4', 'authenticated', 'authenticated', 'fsp.multi@example.test', extensions.crypt('LocalDevOnly!123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Thabo","last_name":"Naidoo"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc5', 'authenticated', 'authenticated', 'tenant.a.admin@example.test', extensions.crypt('LocalDevOnly!123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Zanele","last_name":"Khumalo"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc6', 'authenticated', 'authenticated', 'tenant.a.reviewer@example.test', extensions.crypt('LocalDevOnly!123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Mia","last_name":"Botha"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc7', 'authenticated', 'authenticated', 'tenant.b.admin@example.test', extensions.crypt('LocalDevOnly!123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Sibusiso","last_name":"Mthembu"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc8', 'authenticated', 'authenticated', 'tenant.b.reviewer@example.test', extensions.crypt('LocalDevOnly!123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Emma","last_name":"Fourie"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc9', 'authenticated', 'authenticated', 'tenant.multi@example.test', extensions.crypt('LocalDevOnly!123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Neo","last_name":"Pillay"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-cccc-4ccc-8ccc-cccccccccc10', 'authenticated', 'authenticated', 'onboarding.user@example.test', extensions.crypt('LocalDevOnly!123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Kamo","last_name":"Molefe"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-cccc-4ccc-8ccc-cccccccccc11', 'authenticated', 'authenticated', 'platform.admin@example.test', extensions.crypt('LocalDevOnly!123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"System","last_name":"Administrator"}', now(), now(), '', '', '', '')
on conflict (id) do nothing;

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select
  u.email,
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
  'email',
  now(),
  now(),
  now()
from auth.users u
where u.email like '%.example.test'
on conflict (provider_id, provider) do nothing;

update public.profiles
set job_title = case id
  when 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1' then 'FSP Compliance Administrator'
  when 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2' then 'Compliance Submitter'
  when 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3' then 'Compliance Viewer'
  when 'cccccccc-cccc-4ccc-8ccc-ccccccccccc4' then 'Shared Compliance Consultant'
  when 'cccccccc-cccc-4ccc-8ccc-ccccccccccc5' then 'Tenant Administrator'
  when 'cccccccc-cccc-4ccc-8ccc-ccccccccccc6' then 'Submission Reviewer'
  when 'cccccccc-cccc-4ccc-8ccc-ccccccccccc7' then 'Tenant Administrator'
  when 'cccccccc-cccc-4ccc-8ccc-ccccccccccc8' then 'Submission Reviewer'
  when 'cccccccc-cccc-4ccc-8ccc-ccccccccccc9' then 'Multi-Insurer Compliance User'
  when 'cccccccc-cccc-4ccc-8ccc-cccccccccc10' then 'Onboarding Test User'
  when 'cccccccc-cccc-4ccc-8ccc-cccccccccc11' then 'Platform Administrator'
end
where id::text like 'cccccccc-cccc-4ccc-8ccc-%';
