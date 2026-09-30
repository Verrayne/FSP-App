begin;

create extension if not exists pgtap with schema extensions;
select extensions.no_plan();

select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'platform_private.generate_internal_code(text,text,integer)',
    'EXECUTE'
  ),
  'browser users cannot call the internal code generator directly'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccc11","role":"authenticated"}';

select extensions.lives_ok(
  $$select public.create_platform_value_set(
    'USER_SUPPLIED_CODE',
    'Generated test choices',
    'Created by the generated-code database test.',
    '[{"label":"First choice"},{"label":"Second choice"}]'::jsonb
  )$$,
  'a value set and its options are created without user-managed codes'
);
select extensions.matches(
  (select code::text from public.value_sets where name = 'Generated test choices'),
  '^[A-Z][A-Z0-9_]*_[A-F0-9]{8}$',
  'the value-set code is generated from its name with a unique suffix'
);
select extensions.is(
  (select count(*) from public.value_set_options vso
   join public.value_sets vs on vs.id = vso.value_set_id
   where vs.name = 'Generated test choices' and vso.code ~ '^[A-Z0-9][A-Z0-9_]*_[A-F0-9]{8}$'),
  2::bigint,
  'every value-set option receives a generated valid code'
);

select extensions.lives_ok(
  $$select public.create_platform_question(
    'USER_SUPPLIED_CODE',
    'Is this question automatically coded?',
    '',
    (select id from public.question_types where code = 'TEXT'),
    null
  )$$,
  'a question is created without a user-managed code'
);
select extensions.matches(
  (select code::text from public.questions where label = 'Is this question automatically coded?'),
  '^[A-Z][A-Z0-9_]*_[A-F0-9]{8}$',
  'the question code is generated from its label with a unique suffix'
);
select extensions.isnt(
  (select code::text from public.questions where label = 'Is this question automatically coded?'),
  'USER_SUPPLIED_CODE',
  'the question gateway ignores a caller-supplied code'
);

select extensions.lives_ok(
  $$select set_config(
    'test.generated_version_id',
    (select version_id::text from public.create_platform_questionnaire(
      null,
      'USER_SUPPLIED_CODE',
      'Generated code questionnaire',
      'Created by the generated-code database test.'
    )),
    true
  )$$,
  'a questionnaire and first draft are created without a user-managed code'
);
select extensions.matches(
  (select code::text from public.questionnaires where name = 'Generated code questionnaire'),
  '^[A-Z][A-Z0-9_]*_[A-F0-9]{8}$',
  'the questionnaire code is generated from its name with a unique suffix'
);

select extensions.lives_ok(
  $$select public.add_platform_questionnaire_section(
    current_setting('test.generated_version_id')::uuid,
    'USER_SUPPLIED_CODE',
    'Generated section',
    ''
  )$$,
  'a questionnaire section is created without a user-managed code'
);
select extensions.matches(
  (public.get_platform_questionnaire_version(current_setting('test.generated_version_id')::uuid)
    ->'sections'->0->>'code'),
  '^[A-Z][A-Z0-9_]*_[A-F0-9]{8}$',
  'the section code is generated from its title with a unique suffix'
);

reset role;
select * from extensions.finish();
rollback;
