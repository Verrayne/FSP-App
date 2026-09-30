drop policy if exists compliance_documents_insert_authorized on storage.objects;

create policy compliance_documents_insert_authorized
on storage.objects for insert to authenticated
with check (
  bucket_id = 'compliance-documents'
  and storage.objects.name ~ '^tenant/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/fsp/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/submission/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and array_length(storage.foldername(storage.objects.name), 1) = 6
  and exists (
    select 1
    from public.submissions s
    join public.submission_periods sp on sp.id = s.submission_period_id
    join public.tenant_fsps tf on tf.id = s.tenant_fsp_id and tf.tenant_id = sp.tenant_id
    where sp.tenant_id::text = (storage.foldername(storage.objects.name))[2]
      and tf.fsp_id::text = (storage.foldername(storage.objects.name))[4]
      and s.id::text = (storage.foldername(storage.objects.name))[6]
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
  'Only active FSP submitters/admins or tenant reviewers/admins may create a new UUID-named object for an accessible submission. Every path reference is explicitly correlated to storage.objects. No UPDATE policy exists.';
