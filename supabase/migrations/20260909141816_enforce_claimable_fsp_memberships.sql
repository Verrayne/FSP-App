-- Approval must not activate access if registry eligibility changed after the
-- request was created. Enforce this at the membership integrity boundary.
create or replace function private.enforce_claimable_fsp_membership()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'ACTIVE' and not exists (
    select 1
    from public.fsps f
    where f.id = new.fsp_id
      and private.fsp_is_claimable(f.active, f.status)
  ) then
    raise exception 'Active membership requires an eligible FSP'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_claimable_fsp_membership()
from public, anon, authenticated;

create trigger fsp_users_enforce_claimable_fsp
before insert or update of fsp_id, status on public.fsp_users
for each row execute function private.enforce_claimable_fsp_membership();

comment on function private.enforce_claimable_fsp_membership() is
  'Prevents approval or any other trusted write from activating membership for an ineligible registry record.';
