drop policy if exists notifications_read_own on public.notifications;
create policy notifications_read_own on public.notifications for select to authenticated using((select auth.uid())=user_id);
drop policy if exists notification_preferences_read_own on public.notification_preferences;
create policy notification_preferences_read_own on public.notification_preferences for select to authenticated using((select auth.uid())=user_id);

create policy notification_events_no_browser_access on public.notification_events for all to authenticated using(false) with check(false);
create policy notification_deliveries_no_browser_access on public.notification_deliveries for all to authenticated using(false) with check(false);
create policy tenant_notification_settings_no_browser_access on public.tenant_notification_settings for all to authenticated using(false) with check(false);

create index notification_events_tenant_idx on public.notification_events(tenant_id) where tenant_id is not null;
create index notification_events_fsp_idx on public.notification_events(fsp_id) where fsp_id is not null;
create index notification_events_recipient_idx on public.notification_events(recipient_user_id) where recipient_user_id is not null;
create index notification_events_actor_idx on public.notification_events(actor_id) where actor_id is not null;
create index notifications_tenant_idx on public.notifications(tenant_id) where tenant_id is not null;
create index notifications_fsp_idx on public.notifications(fsp_id) where fsp_id is not null;
create index notifications_submission_idx on public.notifications(submission_id) where submission_id is not null;
