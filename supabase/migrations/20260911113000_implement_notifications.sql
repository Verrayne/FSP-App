-- Prompt 13: durable notification outbox, user inbox, delivery queue and preferences.

create table public.notification_events (
  id uuid primary key default gen_random_uuid(),
  event_type varchar(60) not null,
  idempotency_key varchar(255) not null unique,
  tenant_id uuid references public.tenants(id) on delete restrict,
  fsp_id uuid references public.fsps(id) on delete restrict,
  submission_id uuid references public.submissions(id) on delete restrict,
  recipient_user_id uuid references public.profiles(id) on delete restrict,
  actor_id uuid references public.profiles(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb,
  status varchar(20) not null default 'PENDING',
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  available_date timestamptz not null default now(),
  locked_date timestamptz,
  worker_id varchar(120),
  processed_date timestamptz,
  failed_date timestamptz,
  last_error_code varchar(100),
  occurrence_date timestamptz not null default now(),
  create_date timestamptz not null default now(),
  constraint notification_events_type_check check (event_type in (
    'FSP_CLAIM_APPROVED','FSP_CLAIM_REJECTED','FSP_USER_INVITED','TENANT_USER_INVITED',
    'SUBMISSION_PERIOD_OPENED','SUBMISSION_STARTED','SUBMISSION_SUBMITTED','SUBMISSION_RESUBMITTED',
    'HUMAN_REVIEW_REQUIRED','CHANGES_REQUESTED','SUBMISSION_COMPLETED','SUBMISSION_REJECTED',
    'AI_REVIEW_ESCALATED','AI_REVIEW_FAILED','DEADLINE_REMINDER'
  )),
  constraint notification_events_metadata_object check (jsonb_typeof(metadata)='object'),
  constraint notification_events_status_check check (status in ('PENDING','PROCESSING','PROCESSED','FAILED')),
  constraint notification_events_attempt_check check (attempt_count between 0 and max_attempts and max_attempts between 1 and 5)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.notification_events(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  title varchar(200) not null,
  body varchar(1000) not null,
  action_path varchar(500),
  category varchar(40) not null,
  priority varchar(10) not null default 'NORMAL',
  tenant_id uuid references public.tenants(id) on delete restrict,
  fsp_id uuid references public.fsps(id) on delete restrict,
  submission_id uuid references public.submissions(id) on delete restrict,
  read_date timestamptz,
  create_date timestamptz not null default now(),
  constraint notifications_event_user_key unique(event_id,user_id),
  constraint notifications_category_check check(category in ('SUBMISSION_UPDATES','SUBMISSION_REMINDERS','REVIEW_ASSIGNMENTS','REVIEW_OUTCOMES','ACCOUNT')),
  constraint notifications_priority_check check(priority in ('NORMAL','HIGH')),
  constraint notifications_action_path_check check(action_path is null or (action_path ~ '^/(app|admin)(/|$)' and action_path !~ '^//'))
);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.notification_events(id) on delete restrict,
  notification_id uuid not null references public.notifications(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  recipient_address varchar(320) not null,
  channel varchar(20) not null default 'EMAIL',
  status varchar(20) not null default 'PENDING',
  provider varchar(40),
  provider_message_id varchar(255),
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  next_attempt_date timestamptz not null default now(),
  locked_date timestamptz,
  worker_id varchar(120),
  sent_date timestamptz,
  failed_date timestamptz,
  last_error_code varchar(100),
  requires_active_membership boolean not null default true,
  create_date timestamptz not null default now(),
  update_date timestamptz not null default now(),
  constraint notification_deliveries_event_user_channel_key unique(event_id,user_id,channel),
  constraint notification_deliveries_channel_check check(channel='EMAIL'),
  constraint notification_deliveries_status_check check(status in ('PENDING','PROCESSING','SENT','FAILED','CANCELLED')),
  constraint notification_deliveries_attempt_check check(attempt_count between 0 and max_attempts and max_attempts between 1 and 5)
);

create table public.notification_preferences (
  user_id uuid not null references public.profiles(id) on delete cascade,
  category varchar(40) not null,
  email_enabled boolean not null default true,
  create_date timestamptz not null default now(),
  update_date timestamptz not null default now(),
  primary key(user_id,category),
  constraint notification_preferences_category_check check(category in ('SUBMISSION_UPDATES','SUBMISSION_REMINDERS','REVIEW_ASSIGNMENTS','REVIEW_OUTCOMES'))
);

create table public.tenant_notification_settings (
  tenant_id uuid primary key references public.tenants(id) on delete restrict,
  notify_admin_review_required boolean not null default true,
  notify_admin_ai_events boolean not null default true,
  reminder_offsets integer[] not null default array[30,14,7,1],
  reminder_send_hour smallint not null default 8,
  timezone varchar(80) not null default 'Africa/Johannesburg',
  create_date timestamptz not null default now(),
  update_date timestamptz not null default now(),
  constraint tenant_notification_settings_hour_check check(reminder_send_hour between 0 and 23),
  constraint tenant_notification_settings_offsets_check check(reminder_offsets <@ array[1,2,3,7,14,21,30,60,90] and cardinality(reminder_offsets) between 1 and 9)
);

create index notification_events_pending_idx on public.notification_events(available_date,create_date) where status='PENDING';
create index notification_events_submission_idx on public.notification_events(submission_id) where submission_id is not null;
create index notifications_user_created_idx on public.notifications(user_id,create_date desc,id desc);
create index notifications_user_unread_idx on public.notifications(user_id,create_date desc) where read_date is null;
create index notifications_event_idx on public.notifications(event_id);
create index notification_deliveries_pending_idx on public.notification_deliveries(next_attempt_date,create_date) where status='PENDING';
create index notification_deliveries_notification_idx on public.notification_deliveries(notification_id);
create index notification_deliveries_user_idx on public.notification_deliveries(user_id);

create trigger notification_deliveries_set_update_date before update on public.notification_deliveries for each row execute function private.set_update_date();
create trigger notification_preferences_set_update_date before update on public.notification_preferences for each row execute function private.set_update_date();
create trigger tenant_notification_settings_set_update_date before update on public.tenant_notification_settings for each row execute function private.set_update_date();

alter table public.notification_events enable row level security;
alter table public.notification_events force row level security;
alter table public.notifications enable row level security;
alter table public.notifications force row level security;
alter table public.notification_deliveries enable row level security;
alter table public.notification_deliveries force row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_preferences force row level security;
alter table public.tenant_notification_settings enable row level security;
alter table public.tenant_notification_settings force row level security;

revoke all on public.notification_events,public.notifications,public.notification_deliveries,public.notification_preferences,public.tenant_notification_settings from public,anon,authenticated;
grant all on public.notification_events,public.notifications,public.notification_deliveries,public.notification_preferences,public.tenant_notification_settings to service_role;
grant select on public.notifications,public.notification_preferences to authenticated;
create policy notifications_read_own on public.notifications for select to authenticated using(auth.uid()=user_id);
create policy notification_preferences_read_own on public.notification_preferences for select to authenticated using(auth.uid()=user_id);

create or replace function private.publish_notification_event(
  target_event_type text,target_idempotency_key text,target_tenant_id uuid default null,target_fsp_id uuid default null,
  target_submission_id uuid default null,target_recipient_user_id uuid default null,target_actor_id uuid default null,target_metadata jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare result_id uuid;
begin
  insert into public.notification_events(event_type,idempotency_key,tenant_id,fsp_id,submission_id,recipient_user_id,actor_id,metadata)
  values(target_event_type,target_idempotency_key,target_tenant_id,target_fsp_id,target_submission_id,target_recipient_user_id,target_actor_id,coalesce(target_metadata,'{}'::jsonb))
  on conflict(idempotency_key) do update set idempotency_key=excluded.idempotency_key returning id into result_id;
  return result_id;
end; $$;
revoke all on function private.publish_notification_event(text,text,uuid,uuid,uuid,uuid,uuid,jsonb) from public,anon,authenticated;

create or replace function private.notify_submission_status() returns trigger language plpgsql security definer set search_path='' as $$
declare s public.submissions%rowtype; tf public.tenant_fsps%rowtype; kind text;
begin
  select * into s from public.submissions where id=new.submission_id;
  select * into tf from public.tenant_fsps where id=s.tenant_fsp_id;
  kind := case
    when new.to_status='SUBMITTED' and coalesce(new.reason,'') ilike '%resubmit%' then 'SUBMISSION_RESUBMITTED'
    when new.to_status='SUBMITTED' then 'SUBMISSION_SUBMITTED'
    when new.to_status='UNDER_REVIEW' then 'HUMAN_REVIEW_REQUIRED'
    when new.to_status='HUMAN_REVIEW_REQUIRED' and coalesce(new.reason,'') ilike '%technical failure%' then 'AI_REVIEW_FAILED'
    when new.to_status='HUMAN_REVIEW_REQUIRED' then 'AI_REVIEW_ESCALATED'
    when new.to_status='CHANGES_REQUESTED' then 'CHANGES_REQUESTED'
    when new.to_status='COMPLETED' then 'SUBMISSION_COMPLETED'
    when new.to_status='REJECTED' then 'SUBMISSION_REJECTED'
  end;
  if kind is not null then perform private.publish_notification_event(kind,'submission-status:'||new.id,tf.tenant_id,tf.fsp_id,s.id,null,new.actor_id,jsonb_build_object('history_id',new.id)); end if;
  return new;
end; $$;
revoke all on function private.notify_submission_status() from public,anon,authenticated;
create trigger publish_submission_status_notification after insert on public.submission_status_history for each row execute function private.notify_submission_status();

create or replace function private.notify_submission_started() returns trigger language plpgsql security definer set search_path='' as $$
declare tf public.tenant_fsps%rowtype;
begin
  if new.status='IN_PROGRESS' then
    select * into tf from public.tenant_fsps where id=new.tenant_fsp_id;
    perform private.publish_notification_event('SUBMISSION_STARTED','submission-started:'||new.id,tf.tenant_id,tf.fsp_id,new.id,new.started_by,new.started_by,'{}'::jsonb);
  end if;
  return new;
end; $$;
revoke all on function private.notify_submission_started() from public,anon,authenticated;
create trigger publish_submission_started_notification after insert on public.submissions for each row execute function private.notify_submission_started();

create or replace function private.notify_claim_result() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if old.status='PENDING' and new.status in ('APPROVED','REJECTED') then
    perform private.publish_notification_event(case when new.status='APPROVED' then 'FSP_CLAIM_APPROVED' else 'FSP_CLAIM_REJECTED' end,'fsp-claim:'||new.id||':'||new.status,null,new.fsp_id,null,new.user_id,new.reviewed_by,'{}'::jsonb);
  end if;
  return new;
end; $$;
revoke all on function private.notify_claim_result() from public,anon,authenticated;
create trigger publish_claim_result_notification after update of status on public.fsp_link_requests for each row execute function private.notify_claim_result();

create or replace function private.notify_period_opened() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.status='OPEN' and (tg_op='INSERT' or old.status is distinct from 'OPEN') then
    perform private.publish_notification_event('SUBMISSION_PERIOD_OPENED','period-opened:'||new.id,new.tenant_id,null,null,null,null,jsonb_build_object('period_id',new.id));
  end if;
  return new;
end; $$;
revoke all on function private.notify_period_opened() from public,anon,authenticated;
create trigger publish_period_opened_notification after insert or update of status on public.submission_periods for each row execute function private.notify_period_opened();

create or replace function private.notify_invitation_created() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_table_name='fsp_invitations' then
    perform private.publish_notification_event('FSP_USER_INVITED','fsp-invitation:'||new.id,null,new.fsp_id,null,null,new.invited_by,jsonb_build_object('invitation_id',new.id));
  else
    perform private.publish_notification_event('TENANT_USER_INVITED','tenant-invitation:'||new.id,new.tenant_id,null,null,null,new.invited_by,jsonb_build_object('invitation_id',new.id));
  end if;
  return new;
end; $$;
revoke all on function private.notify_invitation_created() from public,anon,authenticated;
create trigger publish_fsp_invitation_notification after insert on public.fsp_invitations for each row execute function private.notify_invitation_created();
create trigger publish_tenant_invitation_notification after insert on public.tenant_invitations for each row execute function private.notify_invitation_created();

create or replace function private.list_my_notifications_impl(page_number integer,page_size integer,unread_only boolean)
returns table(notification_id uuid,event_type text,title text,body text,action_path text,category text,priority text,tenant_id uuid,fsp_id uuid,submission_id uuid,read_date timestamptz,create_date timestamptz,total_count bigint)
language plpgsql stable security definer set search_path='' as $$
declare actor_id uuid:=auth.uid(); safe_page int:=greatest(coalesce(page_number,1),1); safe_size int:=least(greatest(coalesce(page_size,25),1),100);
begin
  if actor_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  return query select n.id,e.event_type::text,n.title::text,n.body::text,n.action_path::text,n.category::text,n.priority::text,n.tenant_id,n.fsp_id,n.submission_id,n.read_date,n.create_date,count(*) over()
    from public.notifications n join public.notification_events e on e.id=n.event_id
    where n.user_id=actor_id and (not coalesce(unread_only,false) or n.read_date is null)
    order by n.create_date desc,n.id desc offset (safe_page-1)*safe_size limit safe_size;
end; $$;

create or replace function private.get_my_notification_unread_count_impl() returns bigint language sql stable security definer set search_path='' as $$
  select case when auth.uid() is null then 0 else (select count(*) from public.notifications where user_id=auth.uid() and read_date is null) end;
$$;
create or replace function private.mark_notification_read_impl(target_notification_id uuid)
returns table(action_path text,tenant_id uuid,fsp_id uuid,submission_id uuid) language plpgsql security definer set search_path='' as $$
declare actor_id uuid:=auth.uid();
begin
  if actor_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  return query update public.notifications n set read_date=coalesce(n.read_date,now()) where n.id=target_notification_id and n.user_id=actor_id returning n.action_path::text,n.tenant_id,n.fsp_id,n.submission_id;
  if not found then raise exception 'Notification not found' using errcode='P0002'; end if;
end; $$;
create or replace function private.mark_all_notifications_read_impl() returns bigint language plpgsql security definer set search_path='' as $$
declare actor_id uuid:=auth.uid(); affected bigint;
begin if actor_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  update public.notifications set read_date=now() where user_id=actor_id and read_date is null; get diagnostics affected=row_count; return affected;
end; $$;
create or replace function private.get_my_notification_preferences_impl()
returns table(category text,email_enabled boolean) language sql stable security definer set search_path='' as $$
  select c.category,coalesce(p.email_enabled,true) from unnest(array['SUBMISSION_UPDATES','SUBMISSION_REMINDERS','REVIEW_ASSIGNMENTS','REVIEW_OUTCOMES']) c(category)
  left join public.notification_preferences p on p.user_id=auth.uid() and p.category=c.category where auth.uid() is not null order by c.category;
$$;
create or replace function private.set_my_notification_preference_impl(target_category text,target_email_enabled boolean) returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if target_category not in ('SUBMISSION_UPDATES','SUBMISSION_REMINDERS','REVIEW_ASSIGNMENTS','REVIEW_OUTCOMES') then raise exception 'Invalid category' using errcode='22023'; end if;
  insert into public.notification_preferences(user_id,category,email_enabled) values(auth.uid(),target_category,target_email_enabled)
  on conflict(user_id,category) do update set email_enabled=excluded.email_enabled;
end; $$;

create function public.list_my_notifications(page_number integer default 1,page_size integer default 25,unread_only boolean default false)
returns table(notification_id uuid,event_type text,title text,body text,action_path text,category text,priority text,tenant_id uuid,fsp_id uuid,submission_id uuid,read_date timestamptz,create_date timestamptz,total_count bigint)
language sql stable security invoker set search_path='' as $$select * from private.list_my_notifications_impl(page_number,page_size,unread_only)$$;
create function public.get_my_notification_unread_count() returns bigint language sql stable security invoker set search_path='' as $$select private.get_my_notification_unread_count_impl()$$;
create function public.mark_notification_read(target_notification_id uuid) returns table(action_path text,tenant_id uuid,fsp_id uuid,submission_id uuid) language sql security invoker set search_path='' as $$select * from private.mark_notification_read_impl(target_notification_id)$$;
create function public.mark_all_notifications_read() returns bigint language sql security invoker set search_path='' as $$select private.mark_all_notifications_read_impl()$$;
create function public.get_my_notification_preferences() returns table(category text,email_enabled boolean) language sql stable security invoker set search_path='' as $$select * from private.get_my_notification_preferences_impl()$$;
create function public.set_my_notification_preference(target_category text,target_email_enabled boolean) returns void language sql security invoker set search_path='' as $$select private.set_my_notification_preference_impl(target_category,target_email_enabled)$$;

revoke all on function private.list_my_notifications_impl(integer,integer,boolean),private.get_my_notification_unread_count_impl(),private.mark_notification_read_impl(uuid),private.mark_all_notifications_read_impl(),private.get_my_notification_preferences_impl(),private.set_my_notification_preference_impl(text,boolean) from public,anon,authenticated;
grant execute on function private.list_my_notifications_impl(integer,integer,boolean),private.get_my_notification_unread_count_impl(),private.mark_notification_read_impl(uuid),private.mark_all_notifications_read_impl(),private.get_my_notification_preferences_impl(),private.set_my_notification_preference_impl(text,boolean) to authenticated;
revoke all on function public.list_my_notifications(integer,integer,boolean),public.get_my_notification_unread_count(),public.mark_notification_read(uuid),public.mark_all_notifications_read(),public.get_my_notification_preferences(),public.set_my_notification_preference(text,boolean) from public,anon;
grant execute on function public.list_my_notifications(integer,integer,boolean),public.get_my_notification_unread_count(),public.mark_notification_read(uuid),public.mark_all_notifications_read(),public.get_my_notification_preferences(),public.set_my_notification_preference(text,boolean) to authenticated;

create or replace function private.claim_notification_events_impl(target_worker_id text,target_batch_size integer)
returns table(event_id uuid) language plpgsql security definer set search_path='' as $$
begin
  if current_user not in ('service_role','postgres') then raise exception 'Service role required' using errcode='42501'; end if;
  update public.notification_events set status='PENDING',worker_id=null,locked_date=null where status='PROCESSING' and locked_date<now()-interval '10 minutes';
  return query with picked as (select id from public.notification_events where status='PENDING' and available_date<=now() and attempt_count<max_attempts order by available_date,create_date for update skip locked limit least(greatest(coalesce(target_batch_size,20),1),100))
    update public.notification_events e set status='PROCESSING',worker_id=target_worker_id,locked_date=now(),attempt_count=attempt_count+1 from picked where e.id=picked.id returning e.id;
end; $$;

create or replace function private.materialize_notification_event_impl(target_event_id uuid,target_worker_id text) returns integer language plpgsql security definer set search_path='' as $$
declare e public.notification_events%rowtype; rec record; label text; message text; route text; cat text; importance text:='NORMAL'; wants_email boolean:=true; created_id uuid; made integer:=0;
begin
  if current_user not in ('service_role','postgres') then raise exception 'Service role required' using errcode='42501'; end if;
  select * into e from public.notification_events where id=target_event_id and status='PROCESSING' and worker_id=target_worker_id for update;
  if not found then raise exception 'Event is not claimed' using errcode='55000'; end if;
  if e.event_type in ('FSP_USER_INVITED','TENANT_USER_INVITED') then update public.notification_events set status='PROCESSED',processed_date=now(),worker_id=null,locked_date=null where id=e.id; return 0; end if;
  select case e.event_type
    when 'FSP_CLAIM_APPROVED' then 'FSP claim approved' when 'FSP_CLAIM_REJECTED' then 'FSP claim not approved'
    when 'SUBMISSION_PERIOD_OPENED' then 'Submission period opened' when 'SUBMISSION_STARTED' then 'Submission started'
    when 'SUBMISSION_SUBMITTED' then 'Submission received' when 'SUBMISSION_RESUBMITTED' then 'Resubmission received'
    when 'HUMAN_REVIEW_REQUIRED' then 'Submission ready for review' when 'CHANGES_REQUESTED' then 'Changes requested'
    when 'SUBMISSION_COMPLETED' then 'Submission completed' when 'SUBMISSION_REJECTED' then 'Submission rejected'
    when 'AI_REVIEW_ESCALATED' then 'AI review needs attention' when 'AI_REVIEW_FAILED' then 'AI review failed'
    when 'DEADLINE_REMINDER' then 'Submission deadline reminder' end,
    case e.event_type
    when 'FSP_CLAIM_APPROVED' then 'Your request to access this FSP has been approved.' when 'FSP_CLAIM_REJECTED' then 'Your request to access this FSP was not approved.'
    when 'SUBMISSION_PERIOD_OPENED' then 'A new B-BBEE submission period is open.' when 'SUBMISSION_STARTED' then 'Your B-BBEE submission has been started.'
    when 'SUBMISSION_SUBMITTED' then 'Your B-BBEE submission was submitted successfully.' when 'SUBMISSION_RESUBMITTED' then 'Your revised B-BBEE submission was submitted successfully.'
    when 'HUMAN_REVIEW_REQUIRED' then 'A B-BBEE submission is ready for human review.' when 'CHANGES_REQUESTED' then 'The insurer requested changes to your B-BBEE submission.'
    when 'SUBMISSION_COMPLETED' then 'Your B-BBEE submission review is complete.' when 'SUBMISSION_REJECTED' then 'Your B-BBEE submission was rejected.'
    when 'AI_REVIEW_ESCALATED' then 'Automated review escalated a submission for human review.' when 'AI_REVIEW_FAILED' then 'Automated review could not complete; human review is required.'
    when 'DEADLINE_REMINDER' then 'Your B-BBEE submission deadline is approaching.' end into label,message;
  if label is null then raise exception 'Unsupported notification event' using errcode='22023'; end if;
  cat:=case when e.event_type='DEADLINE_REMINDER' then 'SUBMISSION_REMINDERS' when e.event_type in ('HUMAN_REVIEW_REQUIRED','AI_REVIEW_ESCALATED','AI_REVIEW_FAILED') then 'REVIEW_ASSIGNMENTS' when e.event_type in ('SUBMISSION_COMPLETED','SUBMISSION_REJECTED') then 'REVIEW_OUTCOMES' when e.event_type like 'FSP_CLAIM_%' then 'ACCOUNT' else 'SUBMISSION_UPDATES' end;
  importance:=case when e.event_type in ('CHANGES_REQUESTED','SUBMISSION_REJECTED','AI_REVIEW_FAILED','DEADLINE_REMINDER') then 'HIGH' else 'NORMAL' end;
  route:=case when e.event_type like 'FSP_CLAIM_%' then '/app' when e.event_type in ('HUMAN_REVIEW_REQUIRED','AI_REVIEW_ESCALATED','AI_REVIEW_FAILED') then '/admin/submissions/'||e.submission_id when e.submission_id is not null then '/app/submissions/'||e.submission_id when e.event_type='SUBMISSION_PERIOD_OPENED' then '/app/dashboard' else '/app' end;
  for rec in
    select distinct candidate.user_id,au.email::text as email from (
      select e.recipient_user_id as user_id where e.recipient_user_id is not null
      union all select e.actor_id where e.event_type in ('SUBMISSION_STARTED','SUBMISSION_SUBMITTED','SUBMISSION_RESUBMITTED') and e.actor_id is not null
      union all select tm.user_id from public.tenant_memberships tm left join public.tenant_notification_settings ns on ns.tenant_id=tm.tenant_id
        where tm.tenant_id=e.tenant_id and tm.status='ACTIVE' and (tm.role='REVIEWER' or (tm.role='ADMIN' and case when e.event_type in ('AI_REVIEW_ESCALATED','AI_REVIEW_FAILED') then coalesce(ns.notify_admin_ai_events,true) else coalesce(ns.notify_admin_review_required,true) end)) and e.event_type in ('HUMAN_REVIEW_REQUIRED','AI_REVIEW_ESCALATED','AI_REVIEW_FAILED')
      union all select fu.user_id from public.fsp_users fu where fu.fsp_id=e.fsp_id and fu.status='ACTIVE' and ((e.event_type in ('CHANGES_REQUESTED','SUBMISSION_REJECTED','DEADLINE_REMINDER','SUBMISSION_PERIOD_OPENED') and fu.role in ('ADMIN','SUBMITTER')) or (e.event_type='SUBMISSION_COMPLETED' and fu.role in ('ADMIN','SUBMITTER','VIEWER')))
      union all select fu.user_id from public.tenant_fsps tf join public.fsp_users fu on fu.fsp_id=tf.fsp_id where e.event_type='SUBMISSION_PERIOD_OPENED' and tf.tenant_id=e.tenant_id and tf.status='ACTIVE' and fu.status='ACTIVE' and fu.role in ('ADMIN','SUBMITTER')
    ) candidate join auth.users au on au.id=candidate.user_id where candidate.user_id is not null
  loop
    insert into public.notifications(event_id,user_id,title,body,action_path,category,priority,tenant_id,fsp_id,submission_id)
      values(e.id,rec.user_id,label,message,route,cat,importance,e.tenant_id,e.fsp_id,e.submission_id) on conflict(event_id,user_id) do update set event_id=excluded.event_id returning id into created_id;
    made:=made+1;
    wants_email:=cat='ACCOUNT' or e.event_type in ('CHANGES_REQUESTED','SUBMISSION_REJECTED','AI_REVIEW_FAILED') or coalesce((select p.email_enabled from public.notification_preferences p where p.user_id=rec.user_id and p.category=cat),true);
    if wants_email and rec.email is not null then
      insert into public.notification_deliveries(event_id,notification_id,user_id,recipient_address,requires_active_membership)
      values(e.id,created_id,rec.user_id,rec.email,cat<>'ACCOUNT') on conflict(event_id,user_id,channel) do nothing;
    end if;
  end loop;
  update public.notification_events set status='PROCESSED',processed_date=now(),worker_id=null,locked_date=null,last_error_code=null where id=e.id;
  return made;
end; $$;

create or replace function private.fail_notification_event_impl(target_event_id uuid,target_worker_id text,target_error_code text) returns void language plpgsql security definer set search_path='' as $$
begin
 if current_user not in ('service_role','postgres') then raise exception 'Service role required' using errcode='42501'; end if;
 update public.notification_events set status=case when attempt_count>=max_attempts then 'FAILED' else 'PENDING' end,available_date=case when attempt_count>=max_attempts then available_date else now()+make_interval(secs=>least(300,30*attempt_count)) end,failed_date=case when attempt_count>=max_attempts then now() end,last_error_code=left(regexp_replace(coalesce(target_error_code,'UNKNOWN'),'[^A-Z0-9_]','','g'),100),worker_id=null,locked_date=null where id=target_event_id and status='PROCESSING' and worker_id=target_worker_id;
end; $$;

create or replace function private.claim_notification_deliveries_impl(target_worker_id text,target_batch_size integer)
returns table(delivery_id uuid) language plpgsql security definer set search_path='' as $$
begin
 if current_user not in ('service_role','postgres') then raise exception 'Service role required' using errcode='42501'; end if;
 update public.notification_deliveries set status='PENDING',worker_id=null,locked_date=null where status='PROCESSING' and locked_date<now()-interval '10 minutes';
 return query with picked as (select id from public.notification_deliveries where status='PENDING' and next_attempt_date<=now() and attempt_count<max_attempts order by next_attempt_date,create_date for update skip locked limit least(greatest(coalesce(target_batch_size,20),1),100))
 update public.notification_deliveries d set status='PROCESSING',worker_id=target_worker_id,locked_date=now(),attempt_count=attempt_count+1 from picked where d.id=picked.id returning d.id;
end; $$;

create or replace function private.get_notification_delivery_context_impl(target_delivery_id uuid,target_worker_id text)
returns table(delivery_id uuid,recipient_address text,title text,body text,action_path text,event_type text) language plpgsql security definer set search_path='' as $$
declare d public.notification_deliveries%rowtype; n public.notifications%rowtype; active_access boolean;
begin
 if current_user not in ('service_role','postgres') then raise exception 'Service role required' using errcode='42501'; end if;
 select * into d from public.notification_deliveries where id=target_delivery_id and status='PROCESSING' and worker_id=target_worker_id for update;
 if not found then raise exception 'Delivery is not claimed' using errcode='55000'; end if;
 select * into n from public.notifications where id=d.notification_id;
 if d.requires_active_membership then
   active_access:=exists(select 1 from public.fsp_users where user_id=d.user_id and fsp_id=n.fsp_id and status='ACTIVE') or exists(select 1 from public.tenant_memberships where user_id=d.user_id and tenant_id=n.tenant_id and status='ACTIVE');
   if not active_access then update public.notification_deliveries set status='CANCELLED',failed_date=now(),last_error_code='ACCESS_REVOKED',worker_id=null,locked_date=null where id=d.id; return; end if;
 end if;
 return query select d.id,d.recipient_address::text,n.title::text,n.body::text,n.action_path::text,e.event_type::text from public.notification_events e where e.id=d.event_id;
end; $$;
create or replace function private.complete_notification_delivery_impl(target_delivery_id uuid,target_worker_id text,target_provider text,target_provider_message_id text) returns void language plpgsql security definer set search_path='' as $$
begin if current_user not in ('service_role','postgres') then raise exception 'Service role required' using errcode='42501'; end if;
 update public.notification_deliveries set status='SENT',sent_date=now(),provider=left(target_provider,40),provider_message_id=left(target_provider_message_id,255),worker_id=null,locked_date=null,last_error_code=null where id=target_delivery_id and status='PROCESSING' and worker_id=target_worker_id;
end; $$;
create or replace function private.fail_notification_delivery_impl(target_delivery_id uuid,target_worker_id text,target_error_code text,target_permanent boolean) returns void language plpgsql security definer set search_path='' as $$
begin if current_user not in ('service_role','postgres') then raise exception 'Service role required' using errcode='42501'; end if;
 update public.notification_deliveries set status=case when target_permanent or attempt_count>=max_attempts then 'FAILED' else 'PENDING' end,next_attempt_date=case when target_permanent or attempt_count>=max_attempts then next_attempt_date else now()+make_interval(secs=>least(300,30*attempt_count*attempt_count)) end,failed_date=case when target_permanent or attempt_count>=max_attempts then now() end,last_error_code=left(regexp_replace(coalesce(target_error_code,'UNKNOWN'),'[^A-Z0-9_]','','g'),100),worker_id=null,locked_date=null where id=target_delivery_id and status='PROCESSING' and worker_id=target_worker_id;
end; $$;

create or replace function private.enqueue_deadline_reminders_impl(target_today date) returns integer language plpgsql security definer set search_path='' as $$
declare inserted_count integer;
begin
 if current_user not in ('service_role','postgres') then raise exception 'Service role required' using errcode='42501'; end if;
 with candidates as (
  select sp.id period_id,sp.tenant_id,tf.id tenant_fsp_id,tf.fsp_id,(sp.close_date-target_today) offset_days,coalesce(s.status,'NOT_STARTED') current_state
  from public.submission_periods sp join public.tenant_fsps tf on tf.tenant_id=sp.tenant_id and tf.status='ACTIVE'
  left join public.submissions s on s.submission_period_id=sp.id and s.tenant_fsp_id=tf.id
  left join public.tenant_notification_settings ns on ns.tenant_id=sp.tenant_id
  where sp.status='OPEN' and sp.close_date>=target_today and (sp.close_date-target_today)=any(coalesce(ns.reminder_offsets,array[30,14,7,1])) and coalesce(s.status,'NOT_STARTED') in ('NOT_STARTED','IN_PROGRESS','CHANGES_REQUESTED')
 ) insert into public.notification_events(event_type,idempotency_key,tenant_id,fsp_id,submission_id,metadata)
 select 'DEADLINE_REMINDER','deadline:'||period_id||':'||tenant_fsp_id||':'||offset_days,tenant_id,fsp_id,(select s2.id from public.submissions s2 where s2.submission_period_id=period_id and s2.tenant_fsp_id=tenant_fsp_id),jsonb_build_object('period_id',period_id,'tenant_fsp_id',tenant_fsp_id,'offset_days',offset_days,'state',current_state) from candidates on conflict(idempotency_key) do nothing;
 get diagnostics inserted_count=row_count; return inserted_count;
end; $$;

create function public.claim_notification_events(target_worker_id text,target_batch_size integer default 20) returns table(event_id uuid) language sql security invoker set search_path='' as $$select * from private.claim_notification_events_impl(target_worker_id,target_batch_size)$$;
create function public.materialize_notification_event(target_event_id uuid,target_worker_id text) returns integer language sql security invoker set search_path='' as $$select private.materialize_notification_event_impl(target_event_id,target_worker_id)$$;
create function public.fail_notification_event(target_event_id uuid,target_worker_id text,target_error_code text) returns void language sql security invoker set search_path='' as $$select private.fail_notification_event_impl(target_event_id,target_worker_id,target_error_code)$$;
create function public.claim_notification_deliveries(target_worker_id text,target_batch_size integer default 20) returns table(delivery_id uuid) language sql security invoker set search_path='' as $$select * from private.claim_notification_deliveries_impl(target_worker_id,target_batch_size)$$;
create function public.get_notification_delivery_context(target_delivery_id uuid,target_worker_id text) returns table(delivery_id uuid,recipient_address text,title text,body text,action_path text,event_type text) language sql security invoker set search_path='' as $$select * from private.get_notification_delivery_context_impl(target_delivery_id,target_worker_id)$$;
create function public.complete_notification_delivery(target_delivery_id uuid,target_worker_id text,target_provider text,target_provider_message_id text) returns void language sql security invoker set search_path='' as $$select private.complete_notification_delivery_impl(target_delivery_id,target_worker_id,target_provider,target_provider_message_id)$$;
create function public.fail_notification_delivery(target_delivery_id uuid,target_worker_id text,target_error_code text,target_permanent boolean default false) returns void language sql security invoker set search_path='' as $$select private.fail_notification_delivery_impl(target_delivery_id,target_worker_id,target_error_code,target_permanent)$$;
create function public.enqueue_deadline_reminders(target_today date) returns integer language sql security invoker set search_path='' as $$select private.enqueue_deadline_reminders_impl(target_today)$$;

revoke all on function public.claim_notification_events(text,integer),public.materialize_notification_event(uuid,text),public.fail_notification_event(uuid,text,text),public.claim_notification_deliveries(text,integer),public.get_notification_delivery_context(uuid,text),public.complete_notification_delivery(uuid,text,text,text),public.fail_notification_delivery(uuid,text,text,boolean),public.enqueue_deadline_reminders(date) from public,anon,authenticated;
grant execute on function public.claim_notification_events(text,integer),public.materialize_notification_event(uuid,text),public.fail_notification_event(uuid,text,text),public.claim_notification_deliveries(text,integer),public.get_notification_delivery_context(uuid,text),public.complete_notification_delivery(uuid,text,text,text),public.fail_notification_delivery(uuid,text,text,boolean),public.enqueue_deadline_reminders(date) to service_role;
grant execute on function private.claim_notification_events_impl(text,integer),private.materialize_notification_event_impl(uuid,text),private.fail_notification_event_impl(uuid,text,text),private.claim_notification_deliveries_impl(text,integer),private.get_notification_delivery_context_impl(uuid,text),private.complete_notification_delivery_impl(uuid,text,text,text),private.fail_notification_delivery_impl(uuid,text,text,boolean),private.enqueue_deadline_reminders_impl(date) to service_role;

comment on table public.notification_events is 'Durable, idempotent outbox. Metadata must never contain tokens, documents, or sensitive evidence.';
comment on table public.notification_deliveries is 'Email delivery lifecycle. SENT means provider accepted; delivery confirmation is not claimed.';
