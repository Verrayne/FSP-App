create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  code varchar(60) not null,
  name varchar(255) not null,
  status varchar(20) not null default 'ACTIVE',
  active boolean not null default true,
  create_date timestamptz not null default now(),
  update_date timestamptz not null default now(),
  constraint tenants_code_key unique (code),
  constraint tenants_code_not_blank check (btrim(code) <> ''),
  constraint tenants_name_not_blank check (btrim(name) <> ''),
  constraint tenants_status_check check (status in ('ACTIVE', 'SUSPENDED', 'CLOSED'))
);

create table public.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  role varchar(20) not null,
  status varchar(20) not null default 'ACTIVE',
  create_date timestamptz not null default now(),
  update_date timestamptz not null default now(),
  constraint tenant_memberships_tenant_user_key unique (tenant_id, user_id),
  constraint tenant_memberships_role_check check (role in ('ADMIN', 'REVIEWER', 'VIEWER')),
  constraint tenant_memberships_status_check check (status in ('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED'))
);

create table public.tenant_fsps (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  fsp_id uuid not null references public.fsps(id) on delete restrict,
  broker_reference varchar(100),
  status varchar(20) not null default 'ACTIVE',
  link_date timestamptz not null default now(),
  delink_date timestamptz,
  create_date timestamptz not null default now(),
  update_date timestamptz not null default now(),
  constraint tenant_fsps_tenant_fsp_key unique (tenant_id, fsp_id),
  constraint tenant_fsps_status_check check (status in ('ACTIVE', 'SUSPENDED', 'DELINKED')),
  constraint tenant_fsps_delink_consistency check (
    (status = 'DELINKED' and delink_date is not null)
    or (status <> 'DELINKED' and delink_date is null)
  )
);

create index tenant_memberships_tenant_id_idx on public.tenant_memberships (tenant_id);
create index tenant_memberships_user_id_idx on public.tenant_memberships (user_id);
create index tenant_fsps_tenant_id_idx on public.tenant_fsps (tenant_id);
create index tenant_fsps_fsp_id_idx on public.tenant_fsps (fsp_id);

create trigger tenants_set_update_date before update on public.tenants
for each row execute function private.set_update_date();
create trigger tenant_memberships_set_update_date before update on public.tenant_memberships
for each row execute function private.set_update_date();
create trigger tenant_fsps_set_update_date before update on public.tenant_fsps
for each row execute function private.set_update_date();
