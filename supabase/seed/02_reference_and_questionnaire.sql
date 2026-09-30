insert into public.question_types (id, code, name, data_type, allows_value_set, allows_multiple_values)
values
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'TEXT', 'Short text', 'TEXT', false, false),
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd2', 'TEXTAREA', 'Long text', 'TEXT', false, false),
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd3', 'NUMBER', 'Number', 'NUMBER', false, false),
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd4', 'CURRENCY', 'Currency', 'NUMBER', false, false),
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd5', 'PERCENTAGE', 'Percentage', 'NUMBER', false, false),
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd6', 'DATE', 'Date', 'DATE', false, false),
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd7', 'BOOLEAN', 'Yes or no', 'BOOLEAN', false, false),
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd8', 'SINGLE_SELECT', 'Single select', 'OPTION', true, false),
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd9', 'MULTI_SELECT', 'Multi select', 'OPTION', true, true),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd10', 'MONTH', 'Month', 'TEXT', false, false)
on conflict (id) do nothing;

insert into public.value_sets (id, code, name, description, system)
values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', 'ANNUAL_REVENUE_BAND', 'Annual revenue band', 'Prototype South African Rand bands; not legal eligibility rules.', true),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2', 'BBEEE_LEVEL', 'B-BBEE level', 'Representative level values for development.', true),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3', 'OWNERSHIP_CATEGORIES', 'Ownership categories', 'Prototype multi-select categories.', true)
on conflict (id) do nothing;

insert into public.value_set_options (id, value_set_id, code, label, sort_order)
values
  ('ffffffff-0000-4000-8000-000000000001', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', 'LT_10M', 'Less than R10 million', 10),
  ('ffffffff-0000-4000-8000-000000000002', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', '10M_TO_25M', 'R10 million to R25 million', 20),
  ('ffffffff-0000-4000-8000-000000000003', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', 'GT_25M', 'More than R25 million', 30),
  ('ffffffff-0000-4000-8000-000000000011', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2', 'LEVEL_1', 'Level 1', 10),
  ('ffffffff-0000-4000-8000-000000000012', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2', 'LEVEL_2', 'Level 2', 20),
  ('ffffffff-0000-4000-8000-000000000013', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2', 'LEVEL_3', 'Level 3', 30),
  ('ffffffff-0000-4000-8000-000000000014', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2', 'LEVEL_4', 'Level 4', 40),
  ('ffffffff-0000-4000-8000-000000000021', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3', 'BLACK_OWNED', 'Black-owned', 10),
  ('ffffffff-0000-4000-8000-000000000022', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3', 'BLACK_WOMEN_OWNED', 'Black women-owned', 20),
  ('ffffffff-0000-4000-8000-000000000023', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3', 'YOUTH_OWNED', 'Youth-owned', 30)
on conflict (id) do nothing;

insert into public.questions (id, code, question_type_id, value_set_id, label, help_text, validation_rules, system)
values
  ('11400000-0000-4000-8000-000000000001', 'ANNUAL_REVENUE', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd8', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', 'What was the organisation''s annual revenue?', 'Select the appropriate prototype band for this submission period.', null, true),
  ('11400000-0000-4000-8000-000000000002', 'FINANCIAL_YEAR_END', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd6', null, 'What is the organisation''s financial year end?', null, null, true),
  ('11400000-0000-4000-8000-000000000003', 'BBEEE_LEVEL', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd8', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2', 'What is the organisation''s current B-BBEE level?', null, null, true),
  ('11400000-0000-4000-8000-000000000004', 'BLACK_OWNERSHIP_PERCENTAGE', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd5', null, 'What is the Black ownership percentage?', null, '{"minimum":0,"maximum":100}', true),
  ('11400000-0000-4000-8000-000000000005', 'BLACK_FEMALE_OWNERSHIP_PERCENTAGE', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd5', null, 'What is the Black female ownership percentage?', null, '{"minimum":0,"maximum":100}', true),
  ('11400000-0000-4000-8000-000000000006', 'OWNERSHIP_CATEGORIES', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd9', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3', 'Which ownership categories apply?', 'Select all applicable prototype categories.', null, true),
  ('11400000-0000-4000-8000-000000000007', 'CONTACT_NAME', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1', null, 'Who is the primary compliance contact?', null, '{"minLength":2,"maxLength":120}', true),
  ('11400000-0000-4000-8000-000000000008', 'ADDITIONAL_CONTEXT', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2', null, 'Is there any additional context for this submission?', null, '{"maxLength":500}', true),
  ('11400000-0000-4000-8000-000000000009', 'EMPLOYEE_COUNT', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd3', null, 'How many employees does the organisation have?', null, '{"minimum":0,"maximum":100000}', true),
  ('11400000-0000-4000-8000-000000000010', 'PROCUREMENT_SPEND', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd4', null, 'What was the organisation''s measured procurement spend?', 'Enter the amount in South African Rand.', '{"minimum":0}', true),
  ('11400000-0000-4000-8000-000000000011', 'REPORTING_MONTH', 'dddddddd-dddd-4ddd-8ddd-dddddddddd10', null, 'Which month does this information relate to?', null, null, true),
  ('11400000-0000-4000-8000-000000000012', 'HAS_OTHER_CERTIFICATION', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd7', null, 'Does the organisation hold another current transformation certification?', null, null, true),
  ('11400000-0000-4000-8000-000000000013', 'OTHER_CERTIFICATION_DETAILS', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1', null, 'Provide the other certification details.', null, '{"minLength":2,"maxLength":200}', true)
on conflict (id) do nothing;

insert into public.questionnaires (id, code, name, description)
values ('11111111-1111-4111-8111-111111111111', 'ANNUAL_BBEEE', 'Annual B-BBEE Questionnaire', 'Prototype questionnaire for development and isolation testing.')
on conflict (id) do nothing;

insert into public.questionnaire_versions (id, questionnaire_id, version_number, status, effective_from, published_date, published_by)
values ('11222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 1, 'PUBLISHED', '2026-01-01', '2026-01-15 08:00:00+02', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc5')
on conflict (id) do nothing;

insert into public.questionnaire_sections (id, questionnaire_version_id, code, title, sort_order)
values
  ('11300000-0000-4000-8000-000000000001', '11222222-2222-4222-8222-222222222222', 'ORGANISATION_INFORMATION', 'Organisation Information', 10),
  ('11300000-0000-4000-8000-000000000002', '11222222-2222-4222-8222-222222222222', 'FINANCIAL_INFORMATION', 'Financial Information', 20),
  ('11300000-0000-4000-8000-000000000003', '11222222-2222-4222-8222-222222222222', 'BBEEE_INFORMATION', 'B-BBEE Information', 30),
  ('11300000-0000-4000-8000-000000000004', '11222222-2222-4222-8222-222222222222', 'OWNERSHIP_INFORMATION', 'Ownership Information', 40)
on conflict (id) do nothing;

insert into public.questionnaire_questions (id, questionnaire_version_id, section_id, question_id, sort_order, required, default_value)
values
  ('11500000-0000-4000-8000-000000000001', '11222222-2222-4222-8222-222222222222', '11300000-0000-4000-8000-000000000002', '11400000-0000-4000-8000-000000000001', 10, true, null),
  ('11500000-0000-4000-8000-000000000002', '11222222-2222-4222-8222-222222222222', '11300000-0000-4000-8000-000000000002', '11400000-0000-4000-8000-000000000002', 20, true, null),
  ('11500000-0000-4000-8000-000000000003', '11222222-2222-4222-8222-222222222222', '11300000-0000-4000-8000-000000000003', '11400000-0000-4000-8000-000000000003', 10, false, null),
  ('11500000-0000-4000-8000-000000000004', '11222222-2222-4222-8222-222222222222', '11300000-0000-4000-8000-000000000004', '11400000-0000-4000-8000-000000000004', 10, true, null),
  ('11500000-0000-4000-8000-000000000005', '11222222-2222-4222-8222-222222222222', '11300000-0000-4000-8000-000000000004', '11400000-0000-4000-8000-000000000005', 20, true, null),
  ('11500000-0000-4000-8000-000000000006', '11222222-2222-4222-8222-222222222222', '11300000-0000-4000-8000-000000000004', '11400000-0000-4000-8000-000000000006', 30, false, null),
  ('11500000-0000-4000-8000-000000000007', '11222222-2222-4222-8222-222222222222', '11300000-0000-4000-8000-000000000001', '11400000-0000-4000-8000-000000000007', 10, false, null),
  ('11500000-0000-4000-8000-000000000008', '11222222-2222-4222-8222-222222222222', '11300000-0000-4000-8000-000000000001', '11400000-0000-4000-8000-000000000008', 20, false, null),
  ('11500000-0000-4000-8000-000000000009', '11222222-2222-4222-8222-222222222222', '11300000-0000-4000-8000-000000000001', '11400000-0000-4000-8000-000000000009', 30, false, null),
  ('11500000-0000-4000-8000-000000000010', '11222222-2222-4222-8222-222222222222', '11300000-0000-4000-8000-000000000002', '11400000-0000-4000-8000-000000000010', 30, false, null),
  ('11500000-0000-4000-8000-000000000011', '11222222-2222-4222-8222-222222222222', '11300000-0000-4000-8000-000000000002', '11400000-0000-4000-8000-000000000011', 40, false, '"2026-09"'::jsonb),
  ('11500000-0000-4000-8000-000000000012', '11222222-2222-4222-8222-222222222222', '11300000-0000-4000-8000-000000000003', '11400000-0000-4000-8000-000000000012', 20, true, null),
  ('11500000-0000-4000-8000-000000000013', '11222222-2222-4222-8222-222222222222', '11300000-0000-4000-8000-000000000003', '11400000-0000-4000-8000-000000000013', 30, true, null)
on conflict (id) do nothing;

insert into public.question_conditions (id, questionnaire_question_id, source_questionnaire_question_id, operator, comparison_value, action, sort_order)
values ('11600000-0000-4000-8000-000000000001', '11500000-0000-4000-8000-000000000013', '11500000-0000-4000-8000-000000000012', 'EQUALS', 'true', 'SHOW', 10)
on conflict (id) do nothing;
