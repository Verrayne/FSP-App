-- Persist configured defaults only when a submission first enters the mutable workflow.
-- The normal trusted response operation performs type, option, membership, and audit checks.
create or replace function private.initialize_submission_defaults()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare configured record;
begin
  if new.status = 'IN_PROGRESS'
     and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    for configured in
      select qq.id, qq.default_value
      from public.submission_periods sp
      join public.questionnaire_questions qq
        on qq.questionnaire_version_id = sp.questionnaire_version_id
      where sp.id = new.submission_period_id
        and qq.default_value is not null
        and not qq.read_only
    loop
      if not exists (
        select 1 from public.submission_responses sr
        where sr.submission_id = new.id
          and sr.questionnaire_question_id = configured.id
      ) then
        perform private.save_submission_response(new.id, configured.id, configured.default_value);
      end if;
    end loop;
  end if;
  return new;
end;
$$;

revoke all on function private.initialize_submission_defaults() from public, anon, authenticated;

drop trigger if exists submissions_initialize_defaults on public.submissions;
create trigger submissions_initialize_defaults
after insert or update of status on public.submissions
for each row execute function private.initialize_submission_defaults();

-- The application validates configured decimal precision for immediate feedback; this trigger
-- keeps the database authoritative for every write path.
create or replace function private.enforce_submission_response_decimal_places()
returns trigger
language plpgsql
set search_path = ''
as $$
declare allowed_places integer;
begin
  if new.numeric_value is null then return new; end if;
  select (q.validation_rules ->> 'decimalPlaces')::integer
  into allowed_places
  from public.questionnaire_questions qq
  join public.questions q on q.id = qq.question_id
  where qq.id = new.questionnaire_question_id
    and q.validation_rules ? 'decimalPlaces';
  if allowed_places is not null and scale(trim_scale(new.numeric_value)) > allowed_places then
    raise exception 'Answer has too many decimal places' using errcode = '22023';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_submission_response_decimal_places() from public, anon, authenticated;

drop trigger if exists submission_responses_decimal_places on public.submission_responses;
create trigger submission_responses_decimal_places
before insert or update of numeric_value, questionnaire_question_id on public.submission_responses
for each row execute function private.enforce_submission_response_decimal_places();

comment on function private.initialize_submission_defaults() is
  'Initializes non-read-only questionnaire placement defaults exactly once through the trusted typed response operation.';
comment on function private.enforce_submission_response_decimal_places() is
  'Enforces the controlled decimalPlaces validation rule at the database boundary.';
