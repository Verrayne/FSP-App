-- Functions default to EXECUTE for PUBLIC in PostgreSQL. All application grants
-- are explicit, so remove inherited execution from exposed and internal schemas.
revoke execute on all functions in schema public from public;
revoke execute on all functions in schema private from public;
revoke execute on all functions in schema registry_private from public;

-- Anonymous access is limited to the two token-context lookups already granted
-- explicitly. Prevent future accidental anonymous inheritance everywhere else.
revoke execute on all functions in schema private from anon;
grant execute on function private.get_fsp_invitation_context(text) to anon;
grant execute on function private.get_tenant_invitation_context_impl(text) to anon;
