create or replace function private.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, last_name, contact_number, job_title)
  values (
    new.id,
    left(coalesce(btrim(new.raw_user_meta_data ->> 'first_name'), ''), 120),
    left(coalesce(btrim(new.raw_user_meta_data ->> 'last_name'), ''), 120),
    nullif(left(coalesce(btrim(new.raw_user_meta_data ->> 'contact_number'), ''), 40), ''),
    nullif(left(coalesce(btrim(new.raw_user_meta_data ->> 'job_title'), ''), 160), '')
  );
  return new;
end;
$$;

revoke all on function private.create_profile_for_auth_user() from public, anon, authenticated;

comment on function private.create_profile_for_auth_user() is
  'Creates one profile for a Supabase Auth identity and copies only bounded, non-authoritative registration display fields. Authorization never derives from user metadata.';
