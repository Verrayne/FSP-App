insert into storage.buckets (id, name, public)
values ('compliance-documents', 'compliance-documents', false)
on conflict (id) do update set public = false;

grant select, insert on storage.objects to authenticated;

create policy compliance_documents_select_authorized
on storage.objects for select to authenticated
using (
  bucket_id = 'compliance-documents'
  and exists (
    select 1
    from public.document_versions dv
    where dv.storage_path = storage.objects.name
  )
);

create policy compliance_documents_insert_authorized
on storage.objects for insert to authenticated
with check (
  bucket_id = 'compliance-documents'
  and name ~ '^tenant/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/fsp/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/submission/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and array_length(storage.foldername(name), 1) = 6
  and exists (
    select 1
    from public.submissions s
    join public.submission_periods sp on sp.id = s.submission_period_id
    join public.tenant_fsps tf on tf.id = s.tenant_fsp_id and tf.tenant_id = sp.tenant_id
    where sp.tenant_id::text = (storage.foldername(name))[2]
      and tf.fsp_id::text = (storage.foldername(name))[4]
      and s.id::text = (storage.foldername(name))[6]
      and (
        exists (
          select 1 from public.fsp_users fu
          where fu.fsp_id = tf.fsp_id
            and fu.user_id = (select auth.uid())
            and fu.status = 'ACTIVE'
            and fu.role in ('ADMIN', 'SUBMITTER')
        )
        or exists (
          select 1 from public.tenant_memberships tm
          where tm.tenant_id = sp.tenant_id
            and tm.user_id = (select auth.uid())
            and tm.status = 'ACTIVE'
            and tm.role in ('ADMIN', 'REVIEWER')
        )
      )
  )
);

comment on policy compliance_documents_insert_authorized on storage.objects is
  'Only active FSP submitters/admins or tenant reviewers/admins may create a new UUID-named object for an accessible submission. No UPDATE policy exists: replacements use a new document version.';
