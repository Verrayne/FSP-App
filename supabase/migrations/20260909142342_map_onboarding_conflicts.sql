-- PostgREST maps unique-violation (23505) to HTTP 409. Translate the private
-- transition conflict so API consumers receive the project's conflict status.
create or replace function public.approve_fsp_link_request(target_request_id uuid)
returns table (
  request_id uuid,
  membership_id uuid,
  assigned_role varchar,
  request_status varchar
)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return query
  select * from private.approve_fsp_link_request(target_request_id);
exception
  when serialization_failure then
    raise exception 'Link request is no longer pending' using errcode = '23505';
end;
$$;

create or replace function public.reject_fsp_link_request(
  target_request_id uuid,
  rejection_reason text
)
returns table (
  request_id uuid,
  request_status varchar
)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return query
  select * from private.reject_fsp_link_request(target_request_id, rejection_reason);
exception
  when serialization_failure then
    raise exception 'Link request is no longer pending' using errcode = '23505';
end;
$$;

revoke all on function public.approve_fsp_link_request(uuid) from public, anon;
revoke all on function public.reject_fsp_link_request(uuid, text) from public, anon;
grant execute on function public.approve_fsp_link_request(uuid) to authenticated;
grant execute on function public.reject_fsp_link_request(uuid, text) to authenticated;
