-- Qualify response-option references that otherwise collide with the table-return
-- column named response_id in PL/pgSQL's variable namespace.
do $$
declare
  function_definition text;
begin
  select pg_get_functiondef('private.save_submission_response(uuid,uuid,jsonb)'::regprocedure)
  into function_definition;
  function_definition := replace(
    function_definition,
    'delete from public.submission_response_options where response_id=saved_id',
    'delete from public.submission_response_options sro where sro.response_id=saved_id'
  );
  execute function_definition;
end;
$$;
