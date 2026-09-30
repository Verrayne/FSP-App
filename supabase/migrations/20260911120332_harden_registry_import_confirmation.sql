create or replace function private.validate_fsp_registry_import_transition()
returns trigger language plpgsql set search_path='' as $$
begin
  if old.status='READY_FOR_CONFIRMATION' and new.status='QUEUED' and old.valid_count < 1 then
    raise exception 'An import must contain at least one valid row before confirmation' using errcode='55000';
  end if;
  return new;
end; $$;
revoke all on function private.validate_fsp_registry_import_transition() from public,anon,authenticated;
create trigger fsp_registry_imports_validate_transition before update on public.fsp_registry_imports
for each row execute function private.validate_fsp_registry_import_transition();
