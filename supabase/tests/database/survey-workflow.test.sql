begin;
select plan(28);

insert into public.surveys (id, title, status, public_slug)
values
    ('10000000-0000-4000-8000-000000000001', 'Database test survey', 'draft', null),
    ('10000000-0000-4000-8000-000000000002', 'Replacement survey', 'draft', null);
insert into public.questions (id, survey_id, question_text, question_type, position)
values
    ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Pick one', 'multiple_choice', 1),
    ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'True or false?', 'true_false', 2),
    ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 'Replacement question', 'multiple_choice', 1);
insert into public.choices (id, question_id, choice_text, position)
values
    ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'First', 1),
    ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'Second', 2),
    ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', 'True', 1),
    ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', 'False', 2),
    ('30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000003', 'Replacement A', 1),
    ('30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000003', 'Replacement B', 2);

select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000001', true);
set local role authenticated;

select is((public.save_survey_draft(
    null,
    'Saved through RPC',
    'Atomic draft update',
    '[{"question_text":"RPC question","question_type":"multiple_choice","choices":[{"choice_text":"A"},{"choice_text":"B"}]}]'::jsonb
)) ->> 'status', 'draft', 'instructor can create a draft with questions atomically');
select is((select count(*) from public.questions q
            join public.surveys s on s.id = q.survey_id
           where s.title = 'Saved through RPC'),
          1::bigint, 'draft RPC persists its question');

select is(public.activate_survey('10000000-0000-4000-8000-000000000001') ->> 'status',
          'active', 'instructor can activate a survey');
select isnt((select public_slug from public.surveys where id = '10000000-0000-4000-8000-000000000001'),
            null, 'activation creates a public slug');
select is(public.activate_survey('10000000-0000-4000-8000-000000000002') ->> 'status',
          'active', 'instructor can activate a replacement survey');
select is((select count(*) from public.surveys where status = 'active'),
          1::bigint, 'only one survey remains active');
select is((select status from public.surveys where id = '10000000-0000-4000-8000-000000000001'),
          'closed', 'previous active survey closes on activation');

select is(public.activate_survey('10000000-0000-4000-8000-000000000001') ->> 'status',
          'active', 'closed survey can be reactivated');
select set_config('test.public_slug', (
    select public_slug from public.surveys where id = '10000000-0000-4000-8000-000000000001'
), true);
reset role;
set local role anon;
select is(public.submit_survey_response(
    '10000000-0000-4000-8000-000000000001',
    'database-test-token',
    '[{"question_id":"20000000-0000-4000-8000-000000000001","choice_id":"30000000-0000-4000-8000-000000000002"},{"question_id":"20000000-0000-4000-8000-000000000002","choice_id":"30000000-0000-4000-8000-000000000003"}]'::jsonb
) ->> 'success', 'true', 'student can submit a complete response');
select throws_ok(
    $$select public.submit_survey_response(
        '10000000-0000-4000-8000-000000000001',
        'missing-answer-token',
        '[{"question_id":"20000000-0000-4000-8000-000000000001","choice_id":"30000000-0000-4000-8000-000000000002"}]'::jsonb
    )$$,
    '22023', 'MISSING_REQUIRED_ANSWER', 'student must answer every question'
);
select throws_ok(
    $$select public.submit_survey_response(
        '10000000-0000-4000-8000-000000000001',
        'invalid-choice-token',
        '[{"question_id":"20000000-0000-4000-8000-000000000001","choice_id":"30000000-0000-4000-8000-000000000005"},{"question_id":"20000000-0000-4000-8000-000000000002","choice_id":"30000000-0000-4000-8000-000000000003"}]'::jsonb
    )$$,
    '22023', 'INVALID_CHOICE', 'student choices must belong to their question'
);
select throws_ok(
    $$select public.submit_survey_response(
        '10000000-0000-4000-8000-000000000001',
        'database-test-token',
        '[{"question_id":"20000000-0000-4000-8000-000000000001","choice_id":"30000000-0000-4000-8000-000000000002"},{"question_id":"20000000-0000-4000-8000-000000000002","choice_id":"30000000-0000-4000-8000-000000000003"}]'::jsonb
    )$$,
    '23505', 'DUPLICATE_RESPONSE', 'duplicate anonymous submissions are rejected'
);

reset role;
set local role authenticated;
select is((public.get_survey_results('10000000-0000-4000-8000-000000000001') ->> 'response_count')::integer,
          1, 'instructor results report submitted response counts');
select is((public.get_survey_results('10000000-0000-4000-8000-000000000001') #>> '{questions,0,choices,1,percentage}')::numeric,
          100.0, 'instructor results calculate choice percentages');

reset role;
set local role anon;
select is((select count(*) from public.surveys where status = 'active'),
          1::bigint, 'anonymous users can query active surveys');
select ok(not has_table_privilege('anon', 'public.responses', 'select'),
          'anonymous users cannot read response rows');
select ok(not has_table_privilege('anon', 'public.answers', 'select'),
          'anonymous users cannot read answer rows');
select ok(not has_function_privilege('anon', 'public.get_survey_results(uuid)', 'execute'),
          'anonymous users cannot call the results function');
select ok(not has_function_privilege('anon', 'public.archive_survey(uuid)', 'execute'),
          'anonymous users cannot archive surveys');
select ok(not has_function_privilege('anon', 'public.delete_survey(uuid)', 'execute'),
          'anonymous users cannot delete surveys');
select ok(not has_table_privilege('authenticated', 'public.surveys', 'update'),
          'instructors change survey state through guarded RPCs');
select ok(not has_table_privilege('authenticated', 'public.questions', 'delete'),
          'instructors cannot directly delete historical questions');
select ok(has_table_privilege('authenticated', 'public.responses', 'select'),
          'instructors can read responses for results and export');

reset role;
set local role authenticated;
select is(public.close_survey('10000000-0000-4000-8000-000000000001') ->> 'status',
          'closed', 'instructor can close a survey');
reset role;
set local role anon;
select throws_ok(
    $$select public.submit_survey_response(
        '10000000-0000-4000-8000-000000000001',
        'another-token',
        '[{"question_id":"20000000-0000-4000-8000-000000000001","choice_id":"30000000-0000-4000-8000-000000000002"},{"question_id":"20000000-0000-4000-8000-000000000002","choice_id":"30000000-0000-4000-8000-000000000003"}]'::jsonb
    )$$,
    '22023', 'SURVEY_NOT_ACTIVE', 'closed surveys reject student submissions'
);
select throws_ok(
    format('select public.resolve_public_survey(%L)', current_setting('test.public_slug')),
    '22023', 'SURVEY_NOT_ACTIVE', 'closed public link reports that the survey is closed'
);

reset role;
set local role authenticated;
select is(public.archive_survey('10000000-0000-4000-8000-000000000002') ->> 'status',
          'archived', 'instructor can archive a non-active survey');
select lives_ok($$select public.delete_survey('10000000-0000-4000-8000-000000000002')$$,
                'instructor can permanently delete a non-active survey');

select * from finish();
rollback;
