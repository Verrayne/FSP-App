drop policy if exists compliance_documents_insert_authorized on storage.objects;

create policy compliance_documents_insert_authorized
on storage.objects for insert to authenticated
with check (
  bucket_id = 'compliance-documents'
  and storage.objects.name ~ '^tenant/[0-9a-f-]{36}/fsp/[0-9a-f-]{36}/submission/[0-9a-f-]{36}/[0-9a-f-]{36}$'
  and exists (
    select 1
    from public.submissions s
    join public.submission_periods sp on sp.id = s.submission_period_id
    join public.tenant_fsps tf
      on tf.id = s.tenant_fsp_id
      and tf.tenant_id = sp.tenant_id
    join public.fsp_users fu
      on fu.fsp_id = tf.fsp_id
      and fu.user_id = (select auth.uid())
      and fu.status = 'ACTIVE'
      and fu.role in ('ADMIN', 'SUBMITTER')
    join public.documents d
      on d.submission_id = s.id
      and d.document_type = 'BBEEE_CERTIFICATE'
    join public.document_versions dv
      on dv.document_id = d.id
      and dv.uploaded_by = (select auth.uid())
      and dv.storage_path = storage.objects.name
    where s.id::text = (storage.foldername(storage.objects.name))[6]
      and sp.tenant_id::text = (storage.foldername(storage.objects.name))[2]
      and tf.fsp_id::text = (storage.foldername(storage.objects.name))[4]
      and s.status = 'IN_PROGRESS'
  )
);

comment on policy compliance_documents_insert_authorized on storage.objects is
  'FSP admins/submitters may create only a trusted prepared document-version path for their mutable submission; no UPDATE policy exists.';
