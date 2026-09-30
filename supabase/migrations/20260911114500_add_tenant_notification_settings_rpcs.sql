create or replace function private.get_tenant_notification_settings_impl(target_tenant_id uuid)
returns table(tenant_id uuid,notify_admin_review_required boolean,notify_admin_ai_events boolean,reminder_offsets integer[],reminder_send_hour smallint,timezone text)
language plpgsql stable security definer set search_path='' as $$
declare actor_id uuid:=auth.uid();
begin
  if actor_id is null or not private.is_active_tenant_admin(target_tenant_id,actor_id) then raise exception 'Tenant administrator access required' using errcode='42501'; end if;
  return query select target_tenant_id,coalesce(s.notify_admin_review_required,true),coalesce(s.notify_admin_ai_events,true),coalesce(s.reminder_offsets,array[30,14,7,1]),coalesce(s.reminder_send_hour,8::smallint),coalesce(s.timezone,'Africa/Johannesburg')::text
    from (select 1) seed left join public.tenant_notification_settings s on s.tenant_id=target_tenant_id;
end; $$;

create or replace function private.update_tenant_notification_settings_impl(target_tenant_id uuid,target_notify_admin_review_required boolean,target_notify_admin_ai_events boolean,target_reminder_offsets integer[])
returns void language plpgsql security definer set search_path='' as $$
declare actor_id uuid:=auth.uid(); normalized integer[];
begin
  if actor_id is null or not private.is_active_tenant_admin(target_tenant_id,actor_id) then raise exception 'Tenant administrator access required' using errcode='42501'; end if;
  select array_agg(value order by value desc) into normalized from (select distinct unnest(target_reminder_offsets) value) valueset;
  if normalized is null or not (normalized <@ array[1,2,3,7,14,21,30,60,90]) then raise exception 'Invalid reminder offsets' using errcode='22023'; end if;
  insert into public.tenant_notification_settings(tenant_id,notify_admin_review_required,notify_admin_ai_events,reminder_offsets)
  values(target_tenant_id,target_notify_admin_review_required,target_notify_admin_ai_events,normalized)
  on conflict(tenant_id) do update set notify_admin_review_required=excluded.notify_admin_review_required,notify_admin_ai_events=excluded.notify_admin_ai_events,reminder_offsets=excluded.reminder_offsets;
end; $$;

create function public.get_tenant_notification_settings(target_tenant_id uuid)
returns table(tenant_id uuid,notify_admin_review_required boolean,notify_admin_ai_events boolean,reminder_offsets integer[],reminder_send_hour smallint,timezone text)
language sql stable security invoker set search_path='' as $$select * from private.get_tenant_notification_settings_impl(target_tenant_id)$$;
create function public.update_tenant_notification_settings(target_tenant_id uuid,target_notify_admin_review_required boolean,target_notify_admin_ai_events boolean,target_reminder_offsets integer[])
returns void language sql security invoker set search_path='' as $$select private.update_tenant_notification_settings_impl(target_tenant_id,target_notify_admin_review_required,target_notify_admin_ai_events,target_reminder_offsets)$$;

revoke all on function private.get_tenant_notification_settings_impl(uuid),private.update_tenant_notification_settings_impl(uuid,boolean,boolean,integer[]) from public,anon,authenticated;
grant execute on function private.get_tenant_notification_settings_impl(uuid),private.update_tenant_notification_settings_impl(uuid,boolean,boolean,integer[]) to authenticated;
revoke all on function public.get_tenant_notification_settings(uuid),public.update_tenant_notification_settings(uuid,boolean,boolean,integer[]) from public,anon;
grant execute on function public.get_tenant_notification_settings(uuid),public.update_tenant_notification_settings(uuid,boolean,boolean,integer[]) to authenticated;
