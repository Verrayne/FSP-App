-- Browser roles receive read access only where an explicit row policy permits it.
-- Authorization-changing and workflow writes remain trusted server operations.
revoke all on all tables in schema public from anon, authenticated;

grant select on table
  public.profiles,
  public.fsps,
  public.addresses,
  public.contacts,
  public.fsp_users,
  public.fsp_link_requests,
  public.tenants,
  public.tenant_memberships,
  public.tenant_fsps,
  public.question_types,
  public.value_sets,
  public.value_set_options,
  public.questions,
  public.questionnaires,
  public.questionnaire_versions,
  public.questionnaire_sections,
  public.questionnaire_questions,
  public.question_conditions,
  public.submission_periods,
  public.submissions,
  public.submission_responses,
  public.submission_response_options,
  public.documents,
  public.document_versions,
  public.audit_events
to authenticated;

grant update (first_name, last_name, contact_number, job_title)
on public.profiles to authenticated;

grant all on all tables in schema public to service_role;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'fsps', 'addresses', 'contacts', 'fsp_users', 'fsp_link_requests',
    'tenants', 'tenant_memberships', 'tenant_fsps', 'question_types', 'value_sets',
    'value_set_options', 'questions', 'questionnaires', 'questionnaire_versions',
    'questionnaire_sections', 'questionnaire_questions', 'question_conditions',
    'submission_periods', 'submissions', 'submission_responses',
    'submission_response_options', 'documents', 'document_versions', 'audit_events'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
  end loop;
end;
$$;

create policy profiles_select_own
on public.profiles for select to authenticated
using (id = (select auth.uid()));

create policy profiles_update_own
on public.profiles for update to authenticated
using (id = (select auth.uid()) and active)
with check (id = (select auth.uid()) and active);

create policy fsps_select_authorized
on public.fsps for select to authenticated
using (
  exists (
    select 1 from public.fsp_users fu
    where fu.fsp_id = fsps.id
      and fu.user_id = (select auth.uid())
      and fu.status = 'ACTIVE'
  )
  or exists (
    select 1
    from public.tenant_fsps tf
    join public.tenant_memberships tm on tm.tenant_id = tf.tenant_id
    where tf.fsp_id = fsps.id
      and tf.status = 'ACTIVE'
      and tm.user_id = (select auth.uid())
      and tm.status = 'ACTIVE'
  )
);

create policy addresses_select_authorized
on public.addresses for select to authenticated
using (
  exists (
    select 1 from public.fsp_users fu
    where fu.fsp_id = addresses.fsp_id
      and fu.user_id = (select auth.uid())
      and fu.status = 'ACTIVE'
  )
  or exists (
    select 1
    from public.tenant_fsps tf
    join public.tenant_memberships tm on tm.tenant_id = tf.tenant_id
    where tf.fsp_id = addresses.fsp_id
      and tf.status = 'ACTIVE'
      and tm.user_id = (select auth.uid())
      and tm.status = 'ACTIVE'
  )
);

create policy contacts_select_authorized
on public.contacts for select to authenticated
using (
  exists (
    select 1 from public.fsp_users fu
    where fu.fsp_id = contacts.fsp_id
      and fu.user_id = (select auth.uid())
      and fu.status = 'ACTIVE'
  )
  or exists (
    select 1
    from public.tenant_fsps tf
    join public.tenant_memberships tm on tm.tenant_id = tf.tenant_id
    where tf.fsp_id = contacts.fsp_id
      and tf.status = 'ACTIVE'
      and tm.user_id = (select auth.uid())
      and tm.status = 'ACTIVE'
  )
);

create policy fsp_users_select_own
on public.fsp_users for select to authenticated
using (user_id = (select auth.uid()));

create policy fsp_link_requests_select_own
on public.fsp_link_requests for select to authenticated
using (user_id = (select auth.uid()));

create policy tenants_select_authorized
on public.tenants for select to authenticated
using (
  exists (
    select 1 from public.tenant_memberships tm
    where tm.tenant_id = tenants.id
      and tm.user_id = (select auth.uid())
      and tm.status = 'ACTIVE'
  )
  or exists (
    select 1
    from public.tenant_fsps tf
    join public.fsp_users fu on fu.fsp_id = tf.fsp_id
    where tf.tenant_id = tenants.id
      and tf.status = 'ACTIVE'
      and fu.user_id = (select auth.uid())
      and fu.status = 'ACTIVE'
  )
);

create policy tenant_memberships_select_own
on public.tenant_memberships for select to authenticated
using (user_id = (select auth.uid()));

create policy tenant_fsps_select_authorized
on public.tenant_fsps for select to authenticated
using (
  exists (
    select 1 from public.tenant_memberships tm
    where tm.tenant_id = tenant_fsps.tenant_id
      and tm.user_id = (select auth.uid())
      and tm.status = 'ACTIVE'
  )
  or exists (
    select 1 from public.fsp_users fu
    where fu.fsp_id = tenant_fsps.fsp_id
      and fu.user_id = (select auth.uid())
      and fu.status = 'ACTIVE'
  )
);

create policy question_types_select_active
on public.question_types for select to authenticated
using (active);

create policy value_sets_select_authorized
on public.value_sets for select to authenticated
using (
  (tenant_id is null and system and active)
  or exists (
    select 1 from public.tenant_memberships tm
    where tm.tenant_id = value_sets.tenant_id
      and tm.user_id = (select auth.uid())
      and tm.status = 'ACTIVE'
  )
  or exists (
    select 1
    from public.tenant_fsps tf
    join public.fsp_users fu on fu.fsp_id = tf.fsp_id
    where tf.tenant_id = value_sets.tenant_id
      and tf.status = 'ACTIVE'
      and fu.user_id = (select auth.uid())
      and fu.status = 'ACTIVE'
  )
);

create policy value_set_options_select_authorized
on public.value_set_options for select to authenticated
using (
  exists (
    select 1 from public.value_sets vs
    where vs.id = value_set_options.value_set_id
  )
);

create policy questions_select_authorized
on public.questions for select to authenticated
using (
  (tenant_id is null and system and active)
  or exists (
    select 1 from public.tenant_memberships tm
    where tm.tenant_id = questions.tenant_id
      and tm.user_id = (select auth.uid())
      and tm.status = 'ACTIVE'
  )
  or exists (
    select 1
    from public.tenant_fsps tf
    join public.fsp_users fu on fu.fsp_id = tf.fsp_id
    where tf.tenant_id = questions.tenant_id
      and tf.status = 'ACTIVE'
      and fu.user_id = (select auth.uid())
      and fu.status = 'ACTIVE'
  )
);

create policy questionnaires_select_authorized
on public.questionnaires for select to authenticated
using (
  (tenant_id is null and active)
  or exists (
    select 1 from public.tenant_memberships tm
    where tm.tenant_id = questionnaires.tenant_id
      and tm.user_id = (select auth.uid())
      and tm.status = 'ACTIVE'
  )
  or exists (
    select 1
    from public.tenant_fsps tf
    join public.fsp_users fu on fu.fsp_id = tf.fsp_id
    where tf.tenant_id = questionnaires.tenant_id
      and tf.status = 'ACTIVE'
      and fu.user_id = (select auth.uid())
      and fu.status = 'ACTIVE'
  )
);

create policy questionnaire_versions_select_authorized
on public.questionnaire_versions for select to authenticated
using (
  exists (
    select 1 from public.questionnaires q
    where q.id = questionnaire_versions.questionnaire_id
      and (
        questionnaire_versions.status = 'PUBLISHED'
        or exists (
          select 1 from public.tenant_memberships tm
          where tm.tenant_id = q.tenant_id
            and tm.user_id = (select auth.uid())
            and tm.status = 'ACTIVE'
        )
      )
  )
);

create policy questionnaire_sections_select_authorized
on public.questionnaire_sections for select to authenticated
using (
  exists (
    select 1 from public.questionnaire_versions qv
    where qv.id = questionnaire_sections.questionnaire_version_id
  )
);

create policy questionnaire_questions_select_authorized
on public.questionnaire_questions for select to authenticated
using (
  exists (
    select 1 from public.questionnaire_versions qv
    where qv.id = questionnaire_questions.questionnaire_version_id
  )
);

create policy question_conditions_select_authorized
on public.question_conditions for select to authenticated
using (
  exists (
    select 1 from public.questionnaire_questions qq
    where qq.id = question_conditions.questionnaire_question_id
  )
  and exists (
    select 1 from public.questionnaire_questions source_qq
    where source_qq.id = question_conditions.source_questionnaire_question_id
  )
);

create policy submission_periods_select_authorized
on public.submission_periods for select to authenticated
using (
  exists (
    select 1 from public.tenant_memberships tm
    where tm.tenant_id = submission_periods.tenant_id
      and tm.user_id = (select auth.uid())
      and tm.status = 'ACTIVE'
  )
  or exists (
    select 1
    from public.tenant_fsps tf
    join public.fsp_users fu on fu.fsp_id = tf.fsp_id
    where tf.tenant_id = submission_periods.tenant_id
      and tf.status = 'ACTIVE'
      and fu.user_id = (select auth.uid())
      and fu.status = 'ACTIVE'
  )
);

create policy submissions_select_authorized
on public.submissions for select to authenticated
using (
  exists (
    select 1
    from public.tenant_fsps tf
    join public.fsp_users fu on fu.fsp_id = tf.fsp_id
    where tf.id = submissions.tenant_fsp_id
      and fu.user_id = (select auth.uid())
      and fu.status = 'ACTIVE'
  )
  or exists (
    select 1
    from public.submission_periods sp
    join public.tenant_memberships tm on tm.tenant_id = sp.tenant_id
    where sp.id = submissions.submission_period_id
      and tm.user_id = (select auth.uid())
      and tm.status = 'ACTIVE'
  )
);

create policy submission_responses_select_authorized
on public.submission_responses for select to authenticated
using (exists (select 1 from public.submissions s where s.id = submission_responses.submission_id));

create policy submission_response_options_select_authorized
on public.submission_response_options for select to authenticated
using (
  exists (
    select 1 from public.submission_responses sr
    where sr.id = submission_response_options.response_id
  )
);

create policy documents_select_authorized
on public.documents for select to authenticated
using (exists (select 1 from public.submissions s where s.id = documents.submission_id));

create policy document_versions_select_authorized
on public.document_versions for select to authenticated
using (exists (select 1 from public.documents d where d.id = document_versions.document_id));

create policy audit_events_select_authorized
on public.audit_events for select to authenticated
using (
  actor_user_id = (select auth.uid())
  or exists (
    select 1 from public.tenant_memberships tm
    where tm.tenant_id = audit_events.tenant_id
      and tm.user_id = (select auth.uid())
      and tm.status = 'ACTIVE'
  )
  or exists (
    select 1 from public.fsp_users fu
    where fu.fsp_id = audit_events.fsp_id
      and fu.user_id = (select auth.uid())
      and fu.status = 'ACTIVE'
  )
  or exists (
    select 1 from public.submissions s
    where s.id = audit_events.submission_id
  )
);

comment on policy fsp_users_select_own on public.fsp_users is
  'Users can inspect only their own membership rows. Membership administration is a trusted server operation.';
comment on policy tenant_memberships_select_own on public.tenant_memberships is
  'Users can inspect only their own tenant membership rows. Tenant user administration is server-side.';
