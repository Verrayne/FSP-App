-- Security-invoker gateways need execute only on implementations that perform
-- their own scope check. Unchecked helpers remain inaccessible.
grant execute on function
  private.list_my_fsp_submission_history_impl(uuid,uuid,text),
  private.list_fsp_submission_attempts_impl(uuid,uuid),
  private.list_tenant_submission_attempts_impl(uuid,uuid),
  private.list_fsp_submission_timeline_impl(uuid,uuid),
  private.list_tenant_submission_timeline_impl(uuid,uuid),
  private.list_tenant_submission_audit_impl(uuid,uuid,integer,integer),
  private.authorize_fsp_attempt_document_impl(uuid,uuid,uuid,uuid),
  private.authorize_tenant_attempt_document_impl(uuid,uuid,uuid,uuid)
to authenticated;
