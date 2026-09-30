create index fsp_invitations_invited_by_idx on public.fsp_invitations(invited_by);
create index fsp_invitations_accepted_by_idx on public.fsp_invitations(accepted_by) where accepted_by is not null;
create index fsp_invitations_revoked_by_idx on public.fsp_invitations(revoked_by) where revoked_by is not null;
create index fsp_users_revoked_by_idx on public.fsp_users(revoked_by) where revoked_by is not null;

-- Defense in depth: no Data API role receives table privileges, and this explicit
-- deny policy makes the absence of any direct table access independently visible.
create policy fsp_invitations_no_direct_access on public.fsp_invitations
  for all to public using (false) with check (false);
