begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(14);

select extensions.ok(
  not has_function_privilege('public', 'private.claim_notification_events_impl(text,integer)', 'EXECUTE'),
  'PUBLIC cannot execute the notification event worker implementation'
);
select extensions.ok(
  not has_function_privilege('public', 'private.get_notification_delivery_context_impl(uuid,text)', 'EXECUTE'),
  'PUBLIC cannot execute the notification delivery context implementation'
);
select extensions.ok(
  not has_function_privilege('public', 'private.claim_ai_review_job_impl(text)', 'EXECUTE'),
  'PUBLIC cannot execute the AI worker implementation'
);
select extensions.ok(
  not has_function_privilege('public', 'private.refresh_fsp_registry_import(uuid)', 'EXECUTE'),
  'PUBLIC cannot execute the private registry refresh implementation'
);
select extensions.ok(
  not has_function_privilege('anon', 'private.claim_notification_events_impl(text,integer)', 'EXECUTE'),
  'anonymous users cannot execute private notification workers'
);
select extensions.ok(
  not has_function_privilege('authenticated', 'private.claim_notification_events_impl(text,integer)', 'EXECUTE'),
  'authenticated users cannot execute private notification workers'
);
select extensions.ok(
  not has_function_privilege('authenticated', 'public.claim_notification_events(text,integer)', 'EXECUTE'),
  'authenticated users cannot execute the public notification worker gateway'
);
select extensions.ok(
  has_function_privilege('service_role', 'public.claim_notification_events(text,integer)', 'EXECUTE'),
  'service role retains the notification worker gateway'
);
select extensions.ok(
  has_function_privilege('authenticated', 'public.list_my_notifications(integer,integer,boolean)', 'EXECUTE'),
  'authenticated users retain the scoped notification inbox gateway'
);
select extensions.ok(
  not has_function_privilege('public', 'public.list_my_notifications(integer,integer,boolean)', 'EXECUTE'),
  'PUBLIC cannot execute the scoped notification inbox gateway'
);
select extensions.ok(
  has_function_privilege('anon', 'public.get_tenant_invitation_context(text)', 'EXECUTE'),
  'anonymous users retain the intentionally public invitation context gateway'
);
select extensions.ok(
  has_function_privilege('anon', 'private.get_tenant_invitation_context_impl(text)', 'EXECUTE'),
  'anonymous invitation context gateway can still reach its private implementation'
);
select extensions.ok(
  has_function_privilege('anon', 'public.get_fsp_invitation_context(text)', 'EXECUTE'),
  'anonymous users retain the intended FSP invitation context gateway'
);
select extensions.ok(
  has_function_privilege('anon', 'private.get_fsp_invitation_context(text)', 'EXECUTE'),
  'anonymous FSP invitation context gateway can still reach its private implementation'
);

select * from extensions.finish();
rollback;
