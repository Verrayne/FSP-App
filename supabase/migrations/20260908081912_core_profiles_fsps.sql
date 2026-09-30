-- Core identity and global FSP registry.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.set_update_date()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.update_date = now();
  return new;
end;
$$;

revoke all on function private.set_update_date() from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  first_name varchar(120) not null default '',
  last_name varchar(120) not null default '',
  contact_number varchar(40),
  job_title varchar(160),
  active boolean not null default true,
  create_date timestamptz not null default now(),
  update_date timestamptz not null default now(),
  constraint profiles_first_name_trimmed check (first_name = btrim(first_name)),
  constraint profiles_last_name_trimmed check (last_name = btrim(last_name))
);

create table public.fsps (
  id uuid primary key default gen_random_uuid(),
  fsp_number varchar(40) not null,
  registered_name varchar(255) not null,
  trade_name varchar(255),
  registration_number varchar(80),
  fsp_type varchar(80),
  status varchar(40),
  status_effective_date date,
  source varchar(80),
  source_last_check_date timestamptz,
  active boolean not null default true,
  create_date timestamptz not null default now(),
  update_date timestamptz not null default now(),
  constraint fsps_fsp_number_key unique (fsp_number),
  constraint fsps_fsp_number_not_blank check (btrim(fsp_number) <> ''),
  constraint fsps_registered_name_not_blank check (btrim(registered_name) <> '')
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  fsp_id uuid not null references public.fsps(id) on delete restrict,
  address_type varchar(40) not null,
  line_1 varchar(255) not null,
  line_2 varchar(255),
  suburb varchar(120),
  city varchar(120) not null,
  province varchar(120),
  postal_code varchar(20),
  country_code varchar(2) not null default 'ZA',
  "primary" boolean not null default false,
  active boolean not null default true,
  create_date timestamptz not null default now(),
  update_date timestamptz not null default now(),
  constraint addresses_country_code_format check (country_code = upper(country_code) and length(country_code) = 2),
  constraint addresses_line_1_not_blank check (btrim(line_1) <> ''),
  constraint addresses_city_not_blank check (btrim(city) <> '')
);

create unique index addresses_one_active_primary_per_type
  on public.addresses (fsp_id, address_type)
  where "primary" and active;

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  fsp_id uuid not null references public.fsps(id) on delete restrict,
  first_name varchar(120) not null,
  last_name varchar(120) not null,
  job_title varchar(160),
  email varchar(320),
  contact_number varchar(40),
  "primary" boolean not null default false,
  active boolean not null default true,
  create_date timestamptz not null default now(),
  update_date timestamptz not null default now(),
  constraint contacts_first_name_not_blank check (btrim(first_name) <> ''),
  constraint contacts_last_name_not_blank check (btrim(last_name) <> '')
);

create unique index contacts_one_active_primary_per_fsp
  on public.contacts (fsp_id)
  where "primary" and active;

create table public.fsp_users (
  id uuid primary key default gen_random_uuid(),
  fsp_id uuid not null references public.fsps(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  role varchar(20) not null,
  status varchar(20) not null default 'PENDING',
  "primary" boolean not null default false,
  verified_date timestamptz,
  verified_by uuid references public.profiles(id) on delete restrict,
  create_date timestamptz not null default now(),
  update_date timestamptz not null default now(),
  constraint fsp_users_fsp_user_key unique (fsp_id, user_id),
  constraint fsp_users_role_check check (role in ('ADMIN', 'SUBMITTER', 'VIEWER')),
  constraint fsp_users_status_check check (status in ('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED')),
  constraint fsp_users_verification_pair check (
    (verified_date is null and verified_by is null)
    or (verified_date is not null and verified_by is not null)
  )
);

create unique index fsp_users_one_active_primary_per_fsp
  on public.fsp_users (fsp_id)
  where "primary" and status = 'ACTIVE';

create table public.fsp_link_requests (
  id uuid primary key default gen_random_uuid(),
  fsp_id uuid not null references public.fsps(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  status varchar(20) not null default 'PENDING',
  verification_method varchar(40),
  request_date timestamptz not null default now(),
  review_date timestamptz,
  reviewed_by uuid references public.profiles(id) on delete restrict,
  rejection text,
  constraint fsp_link_requests_status_check check (status in ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
  constraint fsp_link_requests_review_fields check (
    (status = 'PENDING' and review_date is null and reviewed_by is null and rejection is null)
    or (status = 'CANCELLED' and review_date is null and reviewed_by is null)
    or (status = 'APPROVED' and review_date is not null and reviewed_by is not null and rejection is null)
    or (status = 'REJECTED' and review_date is not null and reviewed_by is not null and rejection is not null)
  )
);

create index fsps_registered_name_search_idx on public.fsps using gin (to_tsvector('simple', registered_name));
create index fsps_trade_name_search_idx on public.fsps using gin (to_tsvector('simple', coalesce(trade_name, '')));
create index addresses_fsp_id_idx on public.addresses (fsp_id);
create index contacts_fsp_id_idx on public.contacts (fsp_id);
create index fsp_users_fsp_id_idx on public.fsp_users (fsp_id);
create index fsp_users_user_id_idx on public.fsp_users (user_id);
create index fsp_link_requests_fsp_id_idx on public.fsp_link_requests (fsp_id);
create index fsp_link_requests_user_id_idx on public.fsp_link_requests (user_id);

create trigger profiles_set_update_date before update on public.profiles
for each row execute function private.set_update_date();
create trigger fsps_set_update_date before update on public.fsps
for each row execute function private.set_update_date();
create trigger addresses_set_update_date before update on public.addresses
for each row execute function private.set_update_date();
create trigger contacts_set_update_date before update on public.contacts
for each row execute function private.set_update_date();
create trigger fsp_users_set_update_date before update on public.fsp_users
for each row execute function private.set_update_date();

create or replace function private.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (
    new.id,
    coalesce(btrim(new.raw_user_meta_data ->> 'first_name'), ''),
    coalesce(btrim(new.raw_user_meta_data ->> 'last_name'), '')
  );
  return new;
end;
$$;

revoke all on function private.create_profile_for_auth_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.create_profile_for_auth_user();

comment on function private.create_profile_for_auth_user() is
  'Creates the non-authoritative profile row for a Supabase Auth user. User metadata is copied only as display data and is never used for authorization.';
