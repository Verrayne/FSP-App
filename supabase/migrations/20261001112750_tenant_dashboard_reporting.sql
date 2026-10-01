-- Tenant-authorized reporting, with honest historical coverage from installation onward.
create table private.tenant_portfolio_snapshots (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  observed_at timestamptz not null default clock_timestamp(),
  portfolio jsonb not null check (jsonb_typeof(portfolio) = 'array')
);
create index tenant_portfolio_snapshots_lookup_idx
  on private.tenant_portfolio_snapshots (tenant_id, observed_at desc, id desc);
alter table private.tenant_portfolio_snapshots enable row level security;
revoke all on private.tenant_portfolio_snapshots from public, anon, authenticated;

create function private.tenant_reporting_portfolio(target_tenant_id uuid)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', tf.id, 'fspNumber', f.fsp_number, 'tiaFspNumber', tf.broker_reference,
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
revoke all on function private.tenant_reporting_portfolio(uuid) from public,anon,authenticated;

create function private.capture_tenant_portfolio(target_tenant_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare current_portfolio jsonb; previous_portfolio jsonb;
begin
  -- Serializes concurrent captures so a late transaction cannot overwrite newer history.
  perform 1 from public.tenants where id=target_tenant_id for update;
  if not found then return; end if;
  current_portfolio := private.tenant_reporting_portfolio(target_tenant_id);
  select s.portfolio into previous_portfolio from private.tenant_portfolio_snapshots s
    where s.tenant_id=target_tenant_id order by s.observed_at desc,s.id desc limit 1;
  if current_portfolio is distinct from previous_portfolio then
    insert into private.tenant_portfolio_snapshots(tenant_id,portfolio)
      values(target_tenant_id,current_portfolio);
  end if;
end;
$$;
revoke all on function private.capture_tenant_portfolio(uuid) from public,anon,authenticated;

create function private.capture_reporting_change()
returns trigger language plpgsql security definer set search_path='' as $$
declare changed jsonb; changed_fsp_id uuid; changed_tenant_id uuid; changed_submission_id uuid; item record;
begin
  if TG_OP='DELETE' then changed:=to_jsonb(old); else changed:=to_jsonb(new); end if;
  if TG_TABLE_NAME in ('questions','value_set_options','questionnaire_questions') then
    for item in select t.id from public.tenants t loop
      perform private.capture_tenant_portfolio(item.id);
    end loop;
    return null;
  elsif TG_TABLE_NAME='fsps' then changed_fsp_id:=(changed->>'id')::uuid;
  elsif TG_TABLE_NAME in ('contacts','addresses','fsp_users') then changed_fsp_id:=(changed->>'fsp_id')::uuid;
  elsif TG_TABLE_NAME in ('tenant_fsps','submission_periods') then changed_tenant_id:=(changed->>'tenant_id')::uuid;
  elsif TG_TABLE_NAME='submissions' then changed_submission_id:=(changed->>'id')::uuid;
  elsif TG_TABLE_NAME='submission_attempt_documents' then
    select a.submission_id into changed_submission_id from public.submission_attempts a where a.id=(changed->>'attempt_id')::uuid;
  else changed_submission_id:=(changed->>'submission_id')::uuid;
  end if;
  if changed_submission_id is not null then
    select tf.tenant_id into changed_tenant_id from public.submissions s
      join public.tenant_fsps tf on tf.id=s.tenant_fsp_id where s.id=changed_submission_id;
  end if;
  for item in select distinct tf.tenant_id from public.tenant_fsps tf
    where (changed_fsp_id is not null and tf.fsp_id=changed_fsp_id) or tf.tenant_id=changed_tenant_id
  loop perform private.capture_tenant_portfolio(item.tenant_id); end loop;
  return null;
end;
$$;
revoke all on function private.capture_reporting_change() from public,anon,authenticated;

do $$ declare table_name text; item record; begin
  foreach table_name in array array['fsps','contacts','addresses','fsp_users','tenant_fsps',
    'submission_periods','submissions','submission_attempts','submission_attempt_documents',
    'questions','value_set_options','questionnaire_questions'] loop
    execute format('create constraint trigger capture_dashboard_reporting after insert or update or delete on public.%I deferrable initially deferred for each row execute function private.capture_reporting_change()',table_name);
  end loop;
  for item in select id from public.tenants loop perform private.capture_tenant_portfolio(item.id); end loop;
end $$;

create function private.get_tenant_reporting_impl(target_tenant_id uuid, window_days integer default 7)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; today date := (now() at time zone 'Africa/Johannesburg')::date;
begin
  if auth.uid() is null or not private.has_active_tenant_access(target_tenant_id,auth.uid()) then
    raise exception 'Insurer access denied' using errcode='42501';
  end if;
  if window_days not in (1,7,30) then raise exception 'Invalid reporting window' using errcode='22023'; end if;
  -- Selected window ends now; totals are portfolio stocks, with comparison to the start.
  select jsonb_build_object(
    'asOf',now(),'coverageStart',(select min(s.observed_at) from private.tenant_portfolio_snapshots s where s.tenant_id=target_tenant_id),
    'portfolio',private.tenant_reporting_portfolio(target_tenant_id),
    'baseline',(select s.portfolio from private.tenant_portfolio_snapshots s
      where s.tenant_id=target_tenant_id and s.observed_at<=now()-make_interval(days=>window_days)
      order by s.observed_at desc,s.id desc limit 1),
    'enterpriseTypes',coalesce((select jsonb_agg(vso.label order by vso.sort_order,vso.id)
      from public.value_set_options vso join public.value_sets vs on vs.id=vso.value_set_id
      where vs.code='ENTERPRISE_TYPE' and vso.active),'["EME","QSE","Generic"]'::jsonb),
    'months',(select jsonb_agg(jsonb_build_object('month',to_char(m.month,'YYYY-MM'),
      'asOf',least((m.month+interval '1 month')::date,today+1)-1,
      'portfolio',case when m.month=date_trunc('month',today::timestamp) then private.tenant_reporting_portfolio(target_tenant_id)
        else (select s.portfolio from private.tenant_portfolio_snapshots s
          where s.tenant_id=target_tenant_id and s.observed_at < ((m.month+interval '1 month') at time zone 'Africa/Johannesburg')
          order by s.observed_at desc,s.id desc limit 1) end) order by m.month)
      from generate_series(date_trunc('month',today::timestamp)-interval '11 months',date_trunc('month',today::timestamp),interval '1 month') m(month))
  ) into result;
  return result;
end;
$$;
revoke all on function private.get_tenant_reporting_impl(uuid,integer) from public,anon;
grant execute on function private.get_tenant_reporting_impl(uuid,integer) to authenticated;
create function public.get_tenant_reporting(target_tenant_id uuid,window_days integer default 7)
returns jsonb language sql stable security invoker set search_path='' as $$
  select private.get_tenant_reporting_impl(target_tenant_id,window_days);
$$;
revoke all on function public.get_tenant_reporting(uuid,integer) from public,anon;
grant execute on function public.get_tenant_reporting(uuid,integer) to authenticated;
comment on function public.get_tenant_reporting(uuid,integer) is 'Tenant-authorized portfolio reporting with month-end snapshots; missing history is null, never backfilled from current state.';
