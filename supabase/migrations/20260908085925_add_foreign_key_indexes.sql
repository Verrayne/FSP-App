create index document_versions_uploaded_by_idx on public.document_versions (uploaded_by);
create index documents_created_by_idx on public.documents (created_by);
create index documents_current_version_fk_idx on public.documents (current_version_id, id);
create index fsp_link_requests_reviewed_by_idx on public.fsp_link_requests (reviewed_by);
create index fsp_users_verified_by_idx on public.fsp_users (verified_by);
create index questionnaire_questions_section_version_idx
  on public.questionnaire_questions (section_id, questionnaire_version_id);
create index questionnaire_versions_published_by_idx on public.questionnaire_versions (published_by);
create index submission_responses_answered_by_idx on public.submission_responses (answered_by);
create index submission_responses_selected_option_idx on public.submission_responses (selected_option_id);
create index submissions_started_by_idx on public.submissions (started_by);
create index submissions_submitted_by_idx on public.submissions (submitted_by);
