create table public.documents (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete restrict,
  document_type varchar(40) not null,
  status varchar(20) not null default 'PENDING',
  current_version_id uuid,
  created_by uuid not null references public.profiles(id) on delete restrict,
  create_date timestamptz not null default now(),
  update_date timestamptz not null default now(),
  constraint documents_id_submission_key unique (id, submission_id),
  constraint documents_type_check check (document_type in ('BBEEE_CERTIFICATE', 'GENERATED_AFFIDAVIT', 'SIGNED_AFFIDAVIT', 'SUPPORTING_DOCUMENT')),
  constraint documents_status_check check (status in ('PENDING', 'ACTIVE', 'SUPERSEDED', 'REJECTED'))
);

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete restrict,
  storage_path text not null,
  original_filename varchar(255) not null,
  mime_type varchar(160) not null,
  size_bytes bigint not null,
  sha256 varchar(64) not null,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  upload_date timestamptz not null default now(),
  constraint document_versions_id_document_key unique (id, document_id),
  constraint document_versions_storage_path_key unique (storage_path),
  constraint document_versions_storage_path_format check (storage_path ~ '^tenant/[0-9a-f-]{36}/fsp/[0-9a-f-]{36}/submission/[0-9a-f-]{36}/[0-9a-f-]{36}$'),
  constraint document_versions_filename_not_blank check (btrim(original_filename) <> ''),
  constraint document_versions_mime_not_blank check (btrim(mime_type) <> ''),
  constraint document_versions_size_check check (size_bytes > 0),
  constraint document_versions_sha256_format check (sha256 ~ '^[0-9a-f]{64}$')
);

alter table public.documents
  add constraint documents_current_version_fk
  foreign key (current_version_id, id)
  references public.document_versions(id, document_id)
  on delete restrict
  deferrable initially deferred;

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete restrict,
  fsp_id uuid references public.fsps(id) on delete restrict,
  submission_id uuid references public.submissions(id) on delete restrict,
  actor_user_id uuid references public.profiles(id) on delete restrict,
  event_type varchar(100) not null,
  entity_type varchar(100) not null,
  entity_id uuid,
  metadata jsonb,
  occurrence_date timestamptz not null default now(),
  constraint audit_events_event_type_format check (event_type ~ '^[A-Z][A-Z0-9_]*$'),
  constraint audit_events_entity_type_format check (entity_type ~ '^[A-Z][A-Z0-9_]*$'),
  constraint audit_events_metadata_object check (metadata is null or jsonb_typeof(metadata) = 'object'),
  constraint audit_events_has_context check (tenant_id is not null or fsp_id is not null or submission_id is not null or entity_id is not null)
);

create index documents_submission_id_idx on public.documents (submission_id);
create index document_versions_document_id_idx on public.document_versions (document_id);
create index audit_events_tenant_id_idx on public.audit_events (tenant_id) where tenant_id is not null;
create index audit_events_fsp_id_idx on public.audit_events (fsp_id) where fsp_id is not null;
create index audit_events_submission_id_idx on public.audit_events (submission_id) where submission_id is not null;
create index audit_events_actor_user_id_idx on public.audit_events (actor_user_id) where actor_user_id is not null;
create index audit_events_occurrence_date_idx on public.audit_events (occurrence_date desc);

create trigger documents_set_update_date before update on public.documents
for each row execute function private.set_update_date();

create or replace function private.prevent_audit_event_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Audit events are append-only' using errcode = '55000';
end;
$$;

revoke all on function private.prevent_audit_event_mutation() from public, anon, authenticated;
create trigger audit_events_append_only
before update or delete on public.audit_events
for each row execute function private.prevent_audit_event_mutation();

comment on table public.documents is
  'Logical document record. Replacement creates a new document_versions row and advances current_version_id.';
comment on table public.audit_events is
  'Append-only compliance and security event store. System events may have a null actor_user_id.';
