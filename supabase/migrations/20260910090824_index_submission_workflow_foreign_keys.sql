create index submission_route_rules_source_version_idx
  on public.submission_route_rules (source_questionnaire_question_id, questionnaire_version_id);

create index submission_declarations_declarant_user_idx
  on public.submission_declarations (declarant_user_id);
