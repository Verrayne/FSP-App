create or replace function private.list_my_notifications_impl(page_number integer,page_size integer,unread_only boolean)
returns table(notification_id uuid,event_type text,title text,body text,action_path text,category text,priority text,tenant_id uuid,fsp_id uuid,submission_id uuid,read_date timestamptz,create_date timestamptz,total_count bigint)
language plpgsql stable security definer set search_path='' as $$
declare current_actor_id uuid:=auth.uid(); safe_page int:=greatest(coalesce(page_number,1),1); safe_size int:=least(greatest(coalesce(page_size,25),1),100);
begin
  if current_actor_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  return query select n.id,e.event_type::text,n.title::text,n.body::text,n.action_path::text,n.category::text,n.priority::text,n.tenant_id,n.fsp_id,n.submission_id,n.read_date,n.create_date,count(*) over()
    from public.notifications n join public.notification_events e on e.id=n.event_id
    where n.user_id=current_actor_id and (not coalesce(unread_only,false) or n.read_date is null)
    order by n.create_date desc,n.id desc offset (safe_page-1)*safe_size limit safe_size;
end; $$;
revoke all on function private.list_my_notifications_impl(integer,integer,boolean) from public,anon;
grant execute on function private.list_my_notifications_impl(integer,integer,boolean) to authenticated;
