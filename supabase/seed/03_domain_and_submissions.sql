insert into public.tenants (id, code, name)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'CAPE_HORIZON', 'Cape Horizon Assurance'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'UMOYA_MUTUAL', 'Umoya Mutual Insurance')
on conflict (id) do nothing;

insert into public.fsps (id, fsp_number, registered_name, trade_name, registration_number, fsp_type, status, status_effective_date, source, source_last_check_date)
values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001', '51234', 'Karoo Oak Financial Services (Pty) Ltd', 'Karoo Oak', '2018/123456/07', 'FINANCIAL_ADVISER', 'AUTHORISED', '2019-04-01', 'DEVELOPMENT_SEED', now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002', '52345', 'Highveld Compass Brokers (Pty) Ltd', 'Highveld Compass', '2019/234567/07', 'INSURANCE_BROKER', 'AUTHORISED', '2020-02-15', 'DEVELOPMENT_SEED', now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb003', '53456', 'Ubuntu Meridian Advisory (Pty) Ltd', 'Ubuntu Meridian', '2020/345678/07', 'FINANCIAL_ADVISER', 'AUTHORISED', '2021-06-10', 'DEVELOPMENT_SEED', now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb004', '54567', 'Garden Route Beacon Brokers CC', 'Beacon Brokers', '2008/123456/23', 'INSURANCE_BROKER', 'AUTHORISED', '2010-09-20', 'DEVELOPMENT_SEED', now())
on conflict (id) do nothing;

insert into public.addresses (id, fsp_id, address_type, line_1, suburb, city, province, postal_code, "primary")
values
  ('ab000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001', 'BUSINESS', '18 Market Street', 'City Bowl', 'Cape Town', 'Western Cape', '8001', true),
  ('ab000000-0000-4000-8000-000000000002', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002', 'BUSINESS', '42 Acacia Avenue', 'Menlyn', 'Pretoria', 'Gauteng', '0181', true),
  ('ab000000-0000-4000-8000-000000000003', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb003', 'BUSINESS', '7 Meridian Road', 'Umhlanga Ridge', 'Umhlanga', 'KwaZulu-Natal', '4319', true)
on conflict (id) do nothing;

insert into public.contacts (id, fsp_id, first_name, last_name, job_title, email, contact_number, "primary")
values
  ('ac000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001', 'Ayanda', 'Dlamini', 'Compliance Officer', 'compliance@karoo-oak.example.test', '+27 21 555 0101', true),
  ('ac000000-0000-4000-8000-000000000002', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002', 'Lerato', 'Mokoena', 'Operations Manager', 'operations@highveld-compass.example.test', '+27 12 555 0202', true),
  ('ac000000-0000-4000-8000-000000000003', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb003', 'Nandi', 'Zulu', 'Compliance Manager', 'compliance@ubuntu-meridian.example.test', '+27 31 555 0303', true)
on conflict (id) do nothing;

insert into public.fsp_users (id, fsp_id, user_id, role, status, "primary", verified_date, verified_by)
values
  ('fd000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1', 'ADMIN', 'ACTIVE', true, now(), 'cccccccc-cccc-4ccc-8ccc-ccccccccccc5'),
  ('fd000000-0000-4000-8000-000000000002', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2', 'SUBMITTER', 'ACTIVE', false, now(), 'cccccccc-cccc-4ccc-8ccc-ccccccccccc5'),
  ('fd000000-0000-4000-8000-000000000003', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 'VIEWER', 'ACTIVE', true, now(), 'cccccccc-cccc-4ccc-8ccc-ccccccccccc7'),
  ('fd000000-0000-4000-8000-000000000004', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc4', 'VIEWER', 'ACTIVE', false, now(), 'cccccccc-cccc-4ccc-8ccc-ccccccccccc5'),
  ('fd000000-0000-4000-8000-000000000005', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc4', 'VIEWER', 'ACTIVE', false, now(), 'cccccccc-cccc-4ccc-8ccc-ccccccccccc7')
on conflict (id) do nothing;

insert into public.tenant_memberships (id, tenant_id, user_id, role, status)
values
  ('ad000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc5', 'ADMIN', 'ACTIVE'),
  ('ad000000-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc6', 'REVIEWER', 'ACTIVE'),
  ('ad000000-0000-4000-8000-000000000003', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc7', 'ADMIN', 'ACTIVE'),
  ('ad000000-0000-4000-8000-000000000004', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc8', 'REVIEWER', 'ACTIVE'),
  ('ad000000-0000-4000-8000-000000000005', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc9', 'ADMIN', 'ACTIVE'),
  ('ad000000-0000-4000-8000-000000000006', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc9', 'REVIEWER', 'ACTIVE')
on conflict (id) do nothing;

insert into public.tenant_fsps (id, tenant_id, fsp_id, broker_reference)
values
  ('ae000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001', 'CHA-KO-001'),
  ('ae000000-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002', 'UMO-HC-001'),
  ('ae000000-0000-4000-8000-000000000003', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb003', 'CHA-UM-002'),
  ('ae000000-0000-4000-8000-000000000004', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb003', 'UMO-UM-002')
on conflict (id) do nothing;

insert into public.submission_periods (id, tenant_id, questionnaire_version_id, name, year, open_date, close_date, status)
values
  ('af000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11222222-2222-4222-8222-222222222222', '2026 Annual B-BBEE Submission', 2026, '2026-08-01', '2026-10-31', 'OPEN'),
  ('af000000-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '11222222-2222-4222-8222-222222222222', '2026 Annual B-BBEE Submission', 2026, '2026-08-15', '2026-11-15', 'OPEN')
on conflict (id) do nothing;

insert into public.submissions (id, submission_period_id, tenant_fsp_id, status, submission_route, started_by, start_date, submitted_by, submit_date)
values
  ('be000000-0000-4000-8000-000000000001', 'af000000-0000-4000-8000-000000000001', 'ae000000-0000-4000-8000-000000000001', 'NOT_STARTED', null, null, null, null, null),
  ('be000000-0000-4000-8000-000000000002', 'af000000-0000-4000-8000-000000000001', 'ae000000-0000-4000-8000-000000000003', 'IN_PROGRESS', 'AFFIDAVIT', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc6', '2026-08-20 09:00:00+02', null, null),
  ('be000000-0000-4000-8000-000000000003', 'af000000-0000-4000-8000-000000000002', 'ae000000-0000-4000-8000-000000000002', 'SUBMITTED', 'CERTIFICATE', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', '2026-08-22 10:00:00+02', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', '2026-09-01 14:00:00+02'),
  ('be000000-0000-4000-8000-000000000004', 'af000000-0000-4000-8000-000000000002', 'ae000000-0000-4000-8000-000000000004', 'COMPLETED', 'CERTIFICATE', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc8', '2026-08-18 08:30:00+02', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc8', '2026-08-28 16:00:00+02')
on conflict (id) do nothing;

insert into public.submission_responses (id, submission_id, questionnaire_question_id, selected_option_id, date_value, numeric_value, answered_by, answered_date)
values
  ('bf000000-0000-4000-8000-000000000001', 'be000000-0000-4000-8000-000000000002', '11500000-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', null, null, 'cccccccc-cccc-4ccc-8ccc-ccccccccccc6', now()),
  ('bf000000-0000-4000-8000-000000000002', 'be000000-0000-4000-8000-000000000002', '11500000-0000-4000-8000-000000000002', null, '2026-02-28', null, 'cccccccc-cccc-4ccc-8ccc-ccccccccccc6', now()),
  ('bf000000-0000-4000-8000-000000000003', 'be000000-0000-4000-8000-000000000003', '11500000-0000-4000-8000-000000000003', 'ffffffff-0000-4000-8000-000000000012', null, null, 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', now()),
  ('bf000000-0000-4000-8000-000000000004', 'be000000-0000-4000-8000-000000000003', '11500000-0000-4000-8000-000000000004', null, null, 51.2500, 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', now()),
  ('bf000000-0000-4000-8000-000000000005', 'be000000-0000-4000-8000-000000000004', '11500000-0000-4000-8000-000000000006', null, null, null, 'cccccccc-cccc-4ccc-8ccc-ccccccccccc8', now())
on conflict (id) do nothing;

insert into public.submission_response_options (response_id, value_set_option_id)
values
  ('bf000000-0000-4000-8000-000000000005', 'ffffffff-0000-4000-8000-000000000021'),
  ('bf000000-0000-4000-8000-000000000005', 'ffffffff-0000-4000-8000-000000000022')
on conflict do nothing;

insert into public.audit_events (id, tenant_id, fsp_id, submission_id, actor_user_id, event_type, entity_type, entity_id, metadata, occurrence_date)
values
  ('ca000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb003', 'be000000-0000-4000-8000-000000000002', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc6', 'SUBMISSION_STARTED', 'SUBMISSION', 'be000000-0000-4000-8000-000000000002', '{"source":"development_seed"}', '2026-08-20 09:00:00+02'),
  ('ca000000-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb003', 'be000000-0000-4000-8000-000000000004', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc8', 'SUBMISSION_SUBMITTED', 'SUBMISSION', 'be000000-0000-4000-8000-000000000004', '{"source":"development_seed"}', '2026-08-28 16:00:00+02')
on conflict (id) do nothing;

-- Representative notification inbox and delivery states for local testing.
insert into public.notification_events (
  id,event_type,idempotency_key,tenant_id,fsp_id,submission_id,recipient_user_id,actor_id,status,processed_date,occurrence_date,create_date
)
values
  ('d1000000-0000-4000-8000-000000000001','SUBMISSION_SUBMITTED','seed:notification:submitted','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001','be000000-0000-4000-8000-000000000001','cccccccc-cccc-4ccc-8ccc-ccccccccccc1','cccccccc-cccc-4ccc-8ccc-ccccccccccc1','PROCESSED',now()-interval '2 hours',now()-interval '2 hours',now()-interval '2 hours'),
  ('d1000000-0000-4000-8000-000000000002','CHANGES_REQUESTED','seed:notification:changes','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001','be000000-0000-4000-8000-000000000001',null,'cccccccc-cccc-4ccc-8ccc-ccccccccccc6','PROCESSED',now()-interval '1 day',now()-interval '1 day',now()-interval '1 day'),
  ('d1000000-0000-4000-8000-000000000003','HUMAN_REVIEW_REQUIRED','seed:notification:review','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001','be000000-0000-4000-8000-000000000001',null,null,'PROCESSED',now()-interval '3 days',now()-interval '3 days',now()-interval '3 days')
on conflict(id) do nothing;

-- Platform administration is a distinct global authority and has no tenant or
-- FSP membership.
insert into public.platform_memberships(id,user_id,role,status)
values('d4000000-0000-4000-8000-000000000001','cccccccc-cccc-4ccc-8ccc-cccccccccc11','PLATFORM_ADMIN','ACTIVE')
on conflict(user_id) do update set role=excluded.role,status=excluded.status;

insert into public.notifications (
  id,event_id,user_id,title,body,action_path,category,priority,tenant_id,fsp_id,submission_id,read_date,create_date
)
values
  ('d2000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','cccccccc-cccc-4ccc-8ccc-ccccccccccc1','Submission received','Your B-BBEE submission was submitted successfully.','/app/submissions/be000000-0000-4000-8000-000000000001','SUBMISSION_UPDATES','NORMAL','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001','be000000-0000-4000-8000-000000000001',null,now()-interval '2 hours'),
  ('d2000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000002','cccccccc-cccc-4ccc-8ccc-ccccccccccc1','Changes requested','The insurer requested changes to your B-BBEE submission.','/app/submissions/be000000-0000-4000-8000-000000000001','SUBMISSION_UPDATES','HIGH','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001','be000000-0000-4000-8000-000000000001',now()-interval '20 hours',now()-interval '1 day'),
  ('d2000000-0000-4000-8000-000000000003','d1000000-0000-4000-8000-000000000003','cccccccc-cccc-4ccc-8ccc-ccccccccccc6','Submission ready for review','A B-BBEE submission is ready for human review.','/admin/submissions/be000000-0000-4000-8000-000000000001','REVIEW_ASSIGNMENTS','NORMAL','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001','be000000-0000-4000-8000-000000000001',null,now()-interval '3 days')
on conflict(id) do nothing;

insert into public.notification_deliveries (
  id,event_id,notification_id,user_id,recipient_address,status,provider,provider_message_id,attempt_count,sent_date,failed_date,last_error_code,create_date,update_date
)
values
  ('d3000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001','cccccccc-cccc-4ccc-8ccc-ccccccccccc1','fsp.admin@example.test','SENT','LOCAL_CAPTURE','seed-submitted',1,now()-interval '2 hours',null,null,now()-interval '2 hours',now()-interval '2 hours'),
  ('d3000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000002','d2000000-0000-4000-8000-000000000002','cccccccc-cccc-4ccc-8ccc-ccccccccccc1','fsp.admin@example.test','FAILED','LOCAL_CAPTURE',null,3,null,now()-interval '23 hours','EMAIL_PROVIDER_503',now()-interval '1 day',now()-interval '23 hours'),
  ('d3000000-0000-4000-8000-000000000003','d1000000-0000-4000-8000-000000000003','d2000000-0000-4000-8000-000000000003','cccccccc-cccc-4ccc-8ccc-ccccccccccc6','tenant.a.reviewer@example.test','PENDING',null,null,0,null,null,null,now()-interval '3 days',now()-interval '3 days')
on conflict(id) do nothing;
