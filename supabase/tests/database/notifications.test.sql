begin;

create extension if not exists pgtap with schema extensions;
select extensions.no_plan();

select extensions.has_table('public','notification_events','notification outbox exists');
select extensions.has_table('public','notifications','notification inbox exists');
select extensions.has_table('public','notification_deliveries','email delivery queue exists');
select extensions.has_table('public','notification_preferences','user preferences exist');
select extensions.has_function('public','list_my_notifications',array['integer','integer','boolean'],'inbox gateway exists');
select extensions.has_function('public','claim_notification_events',array['text','integer'],'event claim gateway exists');
select extensions.ok(not has_table_privilege('authenticated','public.notification_events','SELECT'),'browser cannot inspect the outbox');
select extensions.ok(not has_table_privilege('authenticated','public.notification_deliveries','SELECT'),'browser cannot inspect recipient delivery data');
select extensions.ok(not has_table_privilege('authenticated','public.notifications','UPDATE'),'browser cannot forge notification read state');

select private.publish_notification_event(
  'SUBMISSION_SUBMITTED','pgtap:notification:event',null,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001',null,
  'cccccccc-cccc-4ccc-8ccc-ccccccccccc1','cccccccc-cccc-4ccc-8ccc-ccccccccccc1','{}'::jsonb
);
select private.publish_notification_event(
  'SUBMISSION_SUBMITTED','pgtap:notification:event',null,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001',null,
  'cccccccc-cccc-4ccc-8ccc-ccccccccccc1','cccccccc-cccc-4ccc-8ccc-ccccccccccc1','{}'::jsonb
);
select extensions.is((select count(*) from public.notification_events where idempotency_key='pgtap:notification:event'),1::bigint,'event publication is idempotent');
select extensions.is((select count(*) from private.claim_notification_events_impl('pgtap-worker',20) where event_id=(select id from public.notification_events where idempotency_key='pgtap:notification:event')),1::bigint,'worker claims an event once');
select extensions.is(private.materialize_notification_event_impl((select id from public.notification_events where idempotency_key='pgtap:notification:event'),'pgtap-worker'),1,'event creates one recipient notification');
select extensions.is((select count(*) from public.notification_deliveries where event_id=(select id from public.notification_events where idempotency_key='pgtap:notification:event')),1::bigint,'enabled email preference creates one delivery');

set local role authenticated;
set local request.jwt.claims='{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc1","role":"authenticated"}';
select extensions.is((select count(*) from public.list_my_notifications(1,25,false) where event_type='SUBMISSION_SUBMITTED'),1::bigint,'recipient can list their notification');
select extensions.is(public.get_my_notification_unread_count(),1::bigint,'unread count is server-computed');
select extensions.is(public.mark_all_notifications_read(),1::bigint,'recipient can mark their notifications read');
select extensions.is(public.get_my_notification_unread_count(),0::bigint,'read notification leaves unread count');
select extensions.lives_ok($$select public.set_my_notification_preference('SUBMISSION_UPDATES',false)$$,'recipient can opt out of optional email');
select extensions.is((select email_enabled from public.get_my_notification_preferences() where category='SUBMISSION_UPDATES'),false,'preference default can be changed');
select extensions.throws_ok($$select * from public.mark_notification_read(gen_random_uuid())$$,'P0002',null,'another or missing notification cannot be marked read');
reset role;

select * from extensions.finish();
rollback;
