-- Own-membership reads already work through the Prompt 02 SELECT grant and RLS policy.
-- This function does not need elevated privileges.
alter function public.get_my_fsp_memberships() security invoker;

comment on function public.get_my_fsp_memberships() is
  'Returns only the caller''s active memberships through ordinary RLS-protected SELECT access.';
