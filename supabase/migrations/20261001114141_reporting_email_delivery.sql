create or replace function private.tenant_reporting_portfolio(target_tenant_id uuid)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', tf.id, 'fspNumber', f.fsp_number, 'tiaFspNumber', answers.values->>'TIA_FSP_NUMBER',
    'fspName', coalesce(nullif(f.trade_name,''), f.registered_name),
    'registrationStatus', case when exists(select 1 from public.fsp_users fu
      join public.profiles p on p.id=fu.user_id and p.active
      where fu.fsp_id=f.id and fu.status='ACTIVE') then 'Registered' else 'Not registered' end,
    'classification', f.fsp_type, 'fscaStatus', f.status, 'region', address.province,
    'contributor', answers.values->>'BBEEE_CONTRIBUTOR',
    'bbbeeLevel', answers.values->>'BBEEE_LEVEL',
    'bbbeePercentage', answers.values->>'BBEEE_PERCENTAGE',
    'blackOwned', answers.values->>'BLACK_OWNERSHIP_PERCENTAGE',
    'blackFemaleOwned', answers.values->>'BLACK_FEMALE_OWNERSHIP_PERCENTAGE',
    'blackDesignatedOwned', answers.values->>'BLACK_DESIGNATED_GROUP_OWNERSHIP_PERCENTAGE',
    'blackYouth', answers.values->>'BLACK_YOUTH_PERCENTAGE',
    'blackDisabled', answers.values->>'BLACK_DISABLED_PERCENTAGE',
    'blackUnemployed', answers.values->>'BLACK_UNEMPLOYED_PERCENTAGE',
    'blackRural', answers.values->>'BLACK_RURAL_PERCENTAGE',
    'blackVeterans', answers.values->>'BLACK_MILITARY_VETERANS_PERCENTAGE',
    'expiryDate', coalesce(answers.values->>'BBEEE_CERTIFICATE_EXPIRY_DATE', answers.values->>'CERTIFICATE_EXPIRY_DATE'),
    'contactPerson', coalesce(answers.values->>'CONTACT_NAME', contact.name),
    'email', coalesce(answers.values->>'CONTACT_EMAIL',contact.email),
    'enterpriseType', answers.values->>'ENTERPRISE_TYPE',
    'enterpriseNature', answers.values->>'ENTERPRISE_NATURE',
    'linkDate', tf.link_date, 'attachDate', doc.upload_date,
    'submissionStatus', coalesce(s.status,'NOT_STARTED'), 'periodId', cp.id,
    'submittedAt', s.submit_date,
    'complete', coalesce(s.status='COMPLETED',false)
  ) order by f.fsp_number), '[]'::jsonb)
  from public.tenant_fsps tf join public.fsps f on f.id=tf.fsp_id
  left join lateral (
    select sp.id from public.submission_periods sp
    where sp.tenant_id=tf.tenant_id and sp.status='OPEN'
      and sp.open_date <= (now() at time zone 'Africa/Johannesburg')::date
      and sp.close_date >= (now() at time zone 'Africa/Johannesburg')::date
    order by sp.close_date,sp.id limit 1
  ) cp on true
  left join public.submissions s on s.tenant_fsp_id=tf.id and s.submission_period_id=cp.id
  left join lateral (
    select a.province from public.addresses a where a.fsp_id=f.id and a.active
    order by a."primary" desc, (a.address_type='BUSINESS') desc, a.update_date desc, a.id limit 1
  ) address on true
  left join lateral (
    select concat_ws(' ',c.first_name,c.last_name) as name,c.email from public.contacts c
    where c.fsp_id=f.id and c.active order by c."primary" desc,c.update_date desc,c.id limit 1
  ) contact on true
  left join lateral (
    -- Compliance data comes from the latest submitted attempt, never an unfinished draft.
    select sa.response_snapshot,sa.id from public.submission_attempts sa
    join public.submissions prior on prior.id=sa.submission_id
    where prior.tenant_fsp_id=tf.id order by sa.submit_date desc,sa.attempt_number desc,sa.id limit 1
  ) attempt on true
  left join lateral (
    select jsonb_object_agg(q.code,coalesce(vso.label,r.value->>'text_value',
      r.value->>'numeric_value',r.value->>'date_value',r.value->>'boolean_value')) as values
    from jsonb_array_elements(coalesce(attempt.response_snapshot,'[]'::jsonb)) r(value)
    join public.questionnaire_questions qq on qq.id=(r.value->>'questionnaire_question_id')::uuid
    join public.questions q on q.id=qq.question_id
    left join public.value_set_options vso on vso.id=nullif(r.value->>'selected_option_id','')::uuid
  ) answers on true
  left join lateral (
    select dv.upload_date from public.submission_attempt_documents sad
    join public.document_versions dv on dv.id=sad.document_version_id
    where sad.attempt_id=attempt.id order by dv.upload_date desc,dv.id limit 1
  ) doc on true
  where tf.tenant_id=target_tenant_id and tf.status='ACTIVE' and f.active;
$$;

-- Tia numbers are distinct from an insurer's broker reference. Never assume equivalence.
do $$ declare item record; begin
  for item in select id from public.tenants loop perform private.capture_tenant_portfolio(item.id); end loop;
end $$;

create table private.report_email_requests (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  requested_at timestamptz not null default now()
);
create index report_email_requests_actor_time_idx on private.report_email_requests(actor_id,requested_at desc);
create index report_email_requests_tenant_idx on private.report_email_requests(tenant_id);
alter table private.report_email_requests enable row level security;
revoke all on private.report_email_requests from public,anon,authenticated;

create function private.reserve_report_email_impl(target_tenant_id uuid,target_request_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
  if actor is null or not private.has_active_tenant_access(target_tenant_id,actor)
    or not exists(select 1 from public.tenant_memberships tm where tm.tenant_id=target_tenant_id
      and tm.user_id=actor and tm.status='ACTIVE' and tm.role in ('ADMIN','REVIEWER')) then
    raise exception 'Report email denied' using errcode='42501';
  end if;
  if target_request_id is null then raise exception 'Request ID required' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text,9271));
  if exists(select 1 from private.report_email_requests r where r.id=target_request_id)
    or (select count(*) from private.report_email_requests r where r.actor_id=actor
      and r.requested_at>now()-interval '10 minutes')>=5 then return false; end if;
  insert into private.report_email_requests(id,tenant_id,actor_id) values(target_request_id,target_tenant_id,actor);
  return true;
end;
$$;
revoke all on function private.reserve_report_email_impl(uuid,uuid) from public,anon;
grant execute on function private.reserve_report_email_impl(uuid,uuid) to authenticated;
create function public.reserve_report_email(target_tenant_id uuid,target_request_id uuid)
returns boolean language sql security invoker set search_path='' as $$
  select private.reserve_report_email_impl(target_tenant_id,target_request_id);
$$;
revoke all on function public.reserve_report_email(uuid,uuid) from public,anon;
grant execute on function public.reserve_report_email(uuid,uuid) to authenticated;
