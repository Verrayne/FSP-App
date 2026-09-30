create index tenant_memberships_revoked_by_idx
  on public.tenant_memberships (revoked_by)
  where revoked_by is not null;

create index tenant_invitations_invited_by_idx
  on public.tenant_invitations (invited_by);

create index tenant_invitations_accepted_by_idx
  on public.tenant_invitations (accepted_by)
  where accepted_by is not null;

create index tenant_invitations_revoked_by_idx
  on public.tenant_invitations (revoked_by)
  where revoked_by is not null;
