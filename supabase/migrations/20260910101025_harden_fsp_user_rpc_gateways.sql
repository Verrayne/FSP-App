-- Keep elevated implementations out of the exposed Data API schema. Public
-- functions are security-invoker gateways; the private implementation still
-- performs complete actor, FSP, role, lifecycle, and token validation.
alter function public.list_fsp_members(uuid) set schema private;
alter function public.list_fsp_invitations(uuid) set schema private;
alter function public.create_fsp_invitation(uuid,text,text,text) set schema private;
alter function public.resend_fsp_invitation(uuid,text) set schema private;
alter function public.record_fsp_invitation_delivery(uuid,text,text) set schema private;
alter function public.revoke_fsp_invitation(uuid) set schema private;
alter function public.get_fsp_invitation_context(text) set schema private;
alter function public.accept_fsp_invitation(text) set schema private;
alter function public.change_fsp_member_role(uuid,text) set schema private;
alter function public.revoke_fsp_member(uuid) set schema private;

create function public.list_fsp_members(target_fsp_id uuid)
returns table (membership_id uuid,user_id uuid,first_name varchar,last_name varchar,email varchar,role varchar,status varchar,is_primary boolean,create_date timestamptz,update_date timestamptz)
language sql security invoker set search_path='' as $$ select * from private.list_fsp_members(target_fsp_id); $$;
create function public.list_fsp_invitations(target_fsp_id uuid)
returns table (invitation_id uuid,email varchar,role varchar,status varchar,invite_date timestamptz,expiry_date timestamptz,delivery_status varchar,delivery_date timestamptz)
language sql security invoker set search_path='' as $$ select * from private.list_fsp_invitations(target_fsp_id); $$;
create function public.create_fsp_invitation(target_fsp_id uuid,target_email text,target_role text,target_token_hash text)
returns table (invitation_id uuid,email varchar,role varchar,expiry_date timestamptz)
language sql security invoker set search_path='' as $$ select * from private.create_fsp_invitation(target_fsp_id,target_email,target_role,target_token_hash); $$;
create function public.resend_fsp_invitation(target_invitation_id uuid,target_token_hash text)
returns table (invitation_id uuid,email varchar,role varchar,expiry_date timestamptz)
language sql security invoker set search_path='' as $$ select * from private.resend_fsp_invitation(target_invitation_id,target_token_hash); $$;
create function public.record_fsp_invitation_delivery(target_invitation_id uuid,target_status text,target_error_code text default null)
returns void language sql security invoker set search_path='' as $$ select private.record_fsp_invitation_delivery(target_invitation_id,target_status,target_error_code); $$;
create function public.revoke_fsp_invitation(target_invitation_id uuid)
returns void language sql security invoker set search_path='' as $$ select private.revoke_fsp_invitation(target_invitation_id); $$;
create function public.get_fsp_invitation_context(target_token_hash text)
returns table (fsp_name varchar,fsp_number varchar,role varchar,expiry_date timestamptz)
language sql security invoker set search_path='' as $$ select * from private.get_fsp_invitation_context(target_token_hash); $$;
create function public.accept_fsp_invitation(target_token_hash text)
returns table (fsp_id uuid,membership_id uuid)
language sql security invoker set search_path='' as $$ select * from private.accept_fsp_invitation(target_token_hash); $$;
create function public.change_fsp_member_role(target_membership_id uuid,target_role text)
returns void language sql security invoker set search_path='' as $$ select private.change_fsp_member_role(target_membership_id,target_role); $$;
create function public.revoke_fsp_member(target_membership_id uuid)
returns void language sql security invoker set search_path='' as $$ select private.revoke_fsp_member(target_membership_id); $$;

revoke all on function private.get_fsp_invitation_context(text),private.list_fsp_members(uuid),
  private.list_fsp_invitations(uuid),private.create_fsp_invitation(uuid,text,text,text),
  private.resend_fsp_invitation(uuid,text),private.record_fsp_invitation_delivery(uuid,text,text),
  private.revoke_fsp_invitation(uuid),private.accept_fsp_invitation(text),
  private.change_fsp_member_role(uuid,text),private.revoke_fsp_member(uuid)
  from public,anon,authenticated;
grant usage on schema private to anon,authenticated;
grant execute on function private.get_fsp_invitation_context(text) to anon,authenticated;
grant execute on function private.list_fsp_members(uuid),private.list_fsp_invitations(uuid),
  private.create_fsp_invitation(uuid,text,text,text),private.resend_fsp_invitation(uuid,text),
  private.record_fsp_invitation_delivery(uuid,text,text),private.revoke_fsp_invitation(uuid),
  private.accept_fsp_invitation(text),private.change_fsp_member_role(uuid,text),private.revoke_fsp_member(uuid)
  to authenticated;

revoke all on function public.get_fsp_invitation_context(text),public.list_fsp_members(uuid),
  public.list_fsp_invitations(uuid),public.create_fsp_invitation(uuid,text,text,text),
  public.resend_fsp_invitation(uuid,text),public.record_fsp_invitation_delivery(uuid,text,text),
  public.revoke_fsp_invitation(uuid),public.accept_fsp_invitation(text),
  public.change_fsp_member_role(uuid,text),public.revoke_fsp_member(uuid)
  from anon,authenticated;
grant execute on function public.get_fsp_invitation_context(text) to anon,authenticated;
grant execute on function public.list_fsp_members(uuid),public.list_fsp_invitations(uuid),
  public.create_fsp_invitation(uuid,text,text,text),public.resend_fsp_invitation(uuid,text),
  public.record_fsp_invitation_delivery(uuid,text,text),public.revoke_fsp_invitation(uuid),
  public.accept_fsp_invitation(text),public.change_fsp_member_role(uuid,text),public.revoke_fsp_member(uuid)
  to authenticated;
