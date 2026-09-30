create or replace function private.enforce_notification_delivery_policy()
returns trigger language plpgsql security definer set search_path='' as $$
declare source_event public.notification_events%rowtype;
begin
  select * into source_event from public.notification_events where id=new.event_id;
  -- Starting work is intentionally an in-app acknowledgement only.
  if source_event.event_type='SUBMISSION_STARTED' then return null; end if;
  -- FSP viewers receive completed outcomes in-app but are not email recipients.
  if source_event.event_type='SUBMISSION_COMPLETED' and exists(
    select 1 from public.fsp_users fu where fu.fsp_id=source_event.fsp_id and fu.user_id=new.user_id and fu.status='ACTIVE' and fu.role='VIEWER'
  ) and not exists(
    select 1 from public.fsp_users fu where fu.fsp_id=source_event.fsp_id and fu.user_id=new.user_id and fu.status='ACTIVE' and fu.role in ('ADMIN','SUBMITTER')
  ) then return null; end if;
  return new;
end; $$;
revoke all on function private.enforce_notification_delivery_policy() from public,anon,authenticated;
create trigger enforce_notification_delivery_policy before insert on public.notification_deliveries for each row execute function private.enforce_notification_delivery_policy();
