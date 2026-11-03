-- Classroom Survey initial schema.
-- Instructor access is granted to authenticated Supabase users; student writes
-- are only available through submit_survey_response().

create table if not exists public.surveys (
    id uuid primary key default gen_random_uuid(),
    title text not null check (length(trim(title)) > 0),
    description text,
    status text not null default 'draft'
        check (status in ('draft', 'active', 'closed', 'archived')),
    public_slug text unique,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists surveys_status_idx on public.surveys(status);
create index if not exists surveys_created_at_idx on public.surveys(created_at desc);
create unique index if not exists only_one_active_survey
    on public.surveys ((status)) where status = 'active';

create table if not exists public.questions (
    id uuid primary key default gen_random_uuid(),
    survey_id uuid not null references public.surveys(id) on delete cascade,
    question_text text not null check (length(trim(question_text)) > 0),
    question_type text not null
        check (question_type in ('multiple_choice', 'true_false')),
    position integer not null check (position > 0),
    created_at timestamptz not null default now(),
    unique (survey_id, position),
    unique (id, survey_id)
);

create index if not exists questions_survey_id_idx
    on public.questions(survey_id);

create table if not exists public.choices (
    id uuid primary key default gen_random_uuid(),
    question_id uuid not null references public.questions(id) on delete cascade,
    choice_text text not null check (length(trim(choice_text)) > 0),
    position integer not null check (position > 0),
    created_at timestamptz not null default now(),
    unique (question_id, position),
    unique (id, question_id)
);

create index if not exists choices_question_id_idx
    on public.choices(question_id);

create table if not exists public.responses (
    id uuid primary key default gen_random_uuid(),
    survey_id uuid not null references public.surveys(id) on delete cascade,
    anonymous_token text not null check (length(trim(anonymous_token)) between 1 and 200),
    submitted_at timestamptz not null default now(),
    unique (survey_id, anonymous_token),
    unique (id, survey_id)
);

create index if not exists responses_survey_id_idx
    on public.responses(survey_id);
create index if not exists responses_submitted_at_idx
    on public.responses(submitted_at desc);

create table if not exists public.answers (
    id uuid primary key default gen_random_uuid(),
    response_id uuid not null,
    survey_id uuid not null,
    question_id uuid not null,
    choice_id uuid not null,
    text_answer text,
    created_at timestamptz not null default now(),
    unique (response_id, question_id),
    foreign key (response_id, survey_id)
        references public.responses(id, survey_id) on delete cascade,
    foreign key (question_id, survey_id)
        references public.questions(id, survey_id) on delete cascade,
    foreign key (choice_id, question_id)
        references public.choices(id, question_id) on delete cascade
);

create index if not exists answers_response_id_idx on public.answers(response_id);
create index if not exists answers_question_id_idx on public.answers(question_id);
create index if not exists answers_choice_id_idx on public.answers(choice_id);

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists surveys_updated_at on public.surveys;
create trigger surveys_updated_at
before update on public.surveys
for each row execute function public.update_updated_at_column();

create or replace function public.save_survey_draft(
    p_survey_id uuid,
    p_title text,
    p_description text,
    p_questions jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    saved public.surveys;
    question_payload jsonb;
    choice_payload jsonb;
    new_question_id uuid;
    question_position integer := 0;
    choice_position integer;
    choice_count integer;
begin
    if auth.uid() is null then
        raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
    end if;
    if p_title is null or length(trim(p_title)) = 0 then
        raise exception using errcode = '22023', message = 'TITLE_REQUIRED';
    end if;
    if jsonb_typeof(p_questions) is distinct from 'array' then
        raise exception using errcode = '22023', message = 'INVALID_QUESTIONS';
    end if;

    if p_survey_id is null then
        insert into public.surveys(title, description)
        values (trim(p_title), nullif(trim(p_description), ''))
        returning * into saved;
    else
        update public.surveys
           set title = trim(p_title), description = nullif(trim(p_description), '')
         where id = p_survey_id and status = 'draft'
         returning * into saved;
        if not found then
            if exists (select 1 from public.surveys s where s.id = p_survey_id) then
                raise exception using errcode = '22023', message = 'SURVEY_NOT_EDITABLE';
            end if;
            raise exception using errcode = 'P0002', message = 'SURVEY_NOT_FOUND';
        end if;
        delete from public.questions where survey_id = p_survey_id;
    end if;

    for question_payload in select value from jsonb_array_elements(p_questions) loop
        question_position := question_position + 1;
        if length(trim(coalesce(question_payload ->> 'question_text', ''))) = 0 then
            raise exception using errcode = '22023', message = 'QUESTION_REQUIRED';
        end if;
        if coalesce(question_payload ->> 'question_type', '') not in ('multiple_choice', 'true_false') then
            raise exception using errcode = '22023', message = 'INVALID_QUESTION_TYPE';
        end if;
        if jsonb_typeof(question_payload -> 'choices') is distinct from 'array' then
            raise exception using errcode = '22023', message = 'INVALID_CHOICES';
        end if;
        select count(*) into choice_count from jsonb_array_elements(question_payload -> 'choices');
        if (question_payload ->> 'question_type' = 'multiple_choice' and choice_count < 2)
            or (question_payload ->> 'question_type' = 'true_false' and choice_count <> 2) then
            raise exception using errcode = '22023', message = 'INVALID_CHOICES';
        end if;

        insert into public.questions(survey_id, question_text, question_type, position)
        values (saved.id, trim(question_payload ->> 'question_text'),
                question_payload ->> 'question_type', question_position)
        returning id into new_question_id;

        choice_position := 0;
        for choice_payload in select value from jsonb_array_elements(question_payload -> 'choices') loop
            choice_position := choice_position + 1;
            if length(trim(coalesce(choice_payload ->> 'choice_text', ''))) = 0 then
                raise exception using errcode = '22023', message = 'CHOICE_REQUIRED';
            end if;
            insert into public.choices(question_id, choice_text, position)
            values (new_question_id, trim(choice_payload ->> 'choice_text'), choice_position);
        end loop;
    end loop;

    return to_jsonb(saved);
end;
$$;

alter table public.surveys enable row level security;
alter table public.questions enable row level security;
alter table public.choices enable row level security;
alter table public.responses enable row level security;
alter table public.answers enable row level security;

drop policy if exists "instructors manage surveys" on public.surveys;
drop policy if exists "instructors read surveys" on public.surveys;
create policy "instructors read surveys" on public.surveys
    for select to authenticated using (true);
drop policy if exists "students read active surveys" on public.surveys;
create policy "students read active surveys" on public.surveys
    for select to anon using (status = 'active');

drop policy if exists "instructors manage questions" on public.questions;
drop policy if exists "instructors read questions" on public.questions;
create policy "instructors read questions" on public.questions
    for select to authenticated using (true);
drop policy if exists "students read active survey questions" on public.questions;
create policy "students read active survey questions" on public.questions
    for select to anon using (
        exists (
            select 1 from public.surveys s
            where s.id = questions.survey_id and s.status = 'active'
        )
    );

drop policy if exists "instructors manage choices" on public.choices;
drop policy if exists "instructors read choices" on public.choices;
create policy "instructors read choices" on public.choices
    for select to authenticated using (true);
drop policy if exists "students read active survey choices" on public.choices;
create policy "students read active survey choices" on public.choices
    for select to anon using (
        exists (
            select 1
            from public.questions q
            join public.surveys s on s.id = q.survey_id
            where q.id = choices.question_id and s.status = 'active'
        )
    );

drop policy if exists "instructors read responses" on public.responses;
create policy "instructors read responses" on public.responses
    for select to authenticated using (true);
drop policy if exists "instructors read answers" on public.answers;
create policy "instructors read answers" on public.answers
    for select to authenticated using (true);

create or replace function public.activate_survey(p_survey_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    activated public.surveys;
begin
    if auth.uid() is null then
        raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
    end if;

    -- Serialize activations so concurrent requests cannot leave two active rows.
    lock table public.surveys in share row exclusive mode;

    if not exists (
        select 1 from public.surveys s where s.id = p_survey_id
    ) then
        raise exception using errcode = 'P0002', message = 'SURVEY_NOT_FOUND';
    end if;

    if not exists (
        select 1 from public.questions q where q.survey_id = p_survey_id
    ) or exists (
        select 1
          from public.questions q
          left join public.choices c on c.question_id = q.id
         where q.survey_id = p_survey_id
         group by q.id, q.question_type
        having (q.question_type = 'multiple_choice' and count(c.id) < 2)
            or (q.question_type = 'true_false' and count(c.id) <> 2)
    ) then
        raise exception using errcode = '22023', message = 'INVALID_SURVEY_CONTENT';
    end if;

    update public.surveys set status = 'closed' where status = 'active';
    update public.surveys
       set status = 'active',
           public_slug = coalesce(public_slug, left(replace(gen_random_uuid()::text, '-', ''), 18))
     where id = p_survey_id
     returning * into activated;
    return to_jsonb(activated);
end;
$$;

create or replace function public.close_survey(p_survey_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    closed public.surveys;
begin
    if auth.uid() is null then
        raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
    end if;

    update public.surveys set status = 'closed'
     where id = p_survey_id and status = 'active'
     returning * into closed;
    if not found then
        if exists (select 1 from public.surveys s where s.id = p_survey_id) then
            raise exception using errcode = '22023', message = 'SURVEY_NOT_ACTIVE';
        end if;
        raise exception using errcode = 'P0002', message = 'SURVEY_NOT_FOUND';
    end if;
    return to_jsonb(closed);
end;
$$;

create or replace function public.submit_survey_response(
    p_survey_id uuid,
    p_anonymous_token text,
    p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    new_response_id uuid;
    expected_count integer;
    provided_count integer;
    answer jsonb;
    question_uuid uuid;
    choice_uuid uuid;
begin
    if p_anonymous_token is null or length(trim(p_anonymous_token)) not between 1 and 200 then
        raise exception using errcode = '22023', message = 'INVALID_ANONYMOUS_TOKEN';
    end if;
    if jsonb_typeof(p_answers) is distinct from 'array' then
        raise exception using errcode = '22023', message = 'INVALID_ANSWERS';
    end if;

    -- Locking the survey row makes a close/activation and a student submission
    -- serialize against each other: submissions cannot commit after a close.
    perform 1 from public.surveys s
     where s.id = p_survey_id and s.status = 'active'
     for update;
    if not found then
        raise exception using errcode = '22023', message = 'SURVEY_NOT_ACTIVE';
    end if;

    select count(*) into expected_count
      from public.questions q where q.survey_id = p_survey_id;
    select count(*) into provided_count from jsonb_array_elements(p_answers);
    if expected_count = 0 or provided_count <> expected_count then
        raise exception using errcode = '22023', message = 'MISSING_REQUIRED_ANSWER';
    end if;

    -- Reject malformed IDs, duplicate question entries, and answers that do not
    -- map to a choice belonging to the selected question and survey.
    for answer in select value from jsonb_array_elements(p_answers) loop
        begin
            question_uuid := (answer ->> 'question_id')::uuid;
            choice_uuid := (answer ->> 'choice_id')::uuid;
        exception when others then
            raise exception using errcode = '22023', message = 'INVALID_QUESTION';
        end;
        if not exists (
            select 1
              from public.questions q
              join public.choices c on c.question_id = q.id
             where q.id = question_uuid
               and q.survey_id = p_survey_id
               and c.id = choice_uuid
        ) then
            raise exception using errcode = '22023', message = 'INVALID_CHOICE';
        end if;
    end loop;
    if (select count(distinct value ->> 'question_id') from jsonb_array_elements(p_answers)) <> provided_count then
        raise exception using errcode = '22023', message = 'INVALID_QUESTION';
    end if;

    insert into public.responses(survey_id, anonymous_token)
    values (p_survey_id, p_anonymous_token)
    returning id into new_response_id;

    insert into public.answers(response_id, survey_id, question_id, choice_id)
    select new_response_id, p_survey_id,
           (value ->> 'question_id')::uuid,
           (value ->> 'choice_id')::uuid
      from jsonb_array_elements(p_answers);

    return jsonb_build_object('success', true, 'response_id', new_response_id);
exception
    when unique_violation then
        raise exception using errcode = '23505', message = 'DUPLICATE_RESPONSE';
end;
$$;

create or replace function public.get_survey_results(p_survey_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    result jsonb;
begin
    if auth.uid() is null then
        raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
    end if;
    select jsonb_build_object(
        'survey_id', s.id,
        'response_count', (select count(*) from public.responses r where r.survey_id = s.id),
        'questions', coalesce((
            select jsonb_agg(jsonb_build_object(
                'question_id', q.id,
                'question_text', q.question_text,
                'response_count', (select count(*) from public.answers a where a.question_id = q.id),
                'choices', coalesce((
                    select jsonb_agg(jsonb_build_object(
                        'choice_id', c.id,
                        'choice_text', c.choice_text,
                        'count', (select count(*) from public.answers a where a.choice_id = c.id),
                        'percentage', case
                            when (select count(*) from public.answers a where a.question_id = q.id) = 0 then 0
                            else round(
                                100.0 * (select count(*) from public.answers a where a.choice_id = c.id)
                                / (select count(*) from public.answers a where a.question_id = q.id), 1
                            )
                        end
                    ) order by c.position)
                    from public.choices c where c.question_id = q.id
                ), '[]'::jsonb)
            ) order by q.position)
            from public.questions q where q.survey_id = s.id
        ), '[]'::jsonb)
    ) into result
    from public.surveys s where s.id = p_survey_id;
    if result is null then
        raise exception using errcode = 'P0002', message = 'SURVEY_NOT_FOUND';
    end if;
    return result;
end;
$$;

create or replace function public.resolve_public_survey(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    found_survey public.surveys;
begin
    select * into found_survey
      from public.surveys s
     where s.public_slug = p_slug;
    if not found then
        raise exception using errcode = 'P0002', message = 'SURVEY_NOT_FOUND';
    end if;
    if found_survey.status <> 'active' then
        raise exception using errcode = '22023', message = 'SURVEY_NOT_ACTIVE';
    end if;
    return jsonb_build_object(
        'id', found_survey.id,
        'title', found_survey.title,
        'description', found_survey.description,
        'status', found_survey.status,
        'public_slug', found_survey.public_slug,
        'created_at', found_survey.created_at,
        'updated_at', found_survey.updated_at
    );
end;
$$;

revoke all on function public.activate_survey(uuid) from public, anon;
revoke all on function public.close_survey(uuid) from public, anon;
revoke all on function public.save_survey_draft(uuid, text, text, jsonb) from public, anon;
revoke all on function public.get_survey_results(uuid) from public, anon;
revoke all on function public.resolve_public_survey(text) from public, authenticated;
revoke all on function public.submit_survey_response(uuid, text, jsonb) from public, authenticated;
grant execute on function public.activate_survey(uuid) to authenticated;
grant execute on function public.close_survey(uuid) to authenticated;
grant execute on function public.save_survey_draft(uuid, text, text, jsonb) to authenticated;
grant execute on function public.get_survey_results(uuid) to authenticated;
grant execute on function public.resolve_public_survey(text) to anon;
grant execute on function public.submit_survey_response(uuid, text, jsonb) to anon;

revoke all on public.surveys, public.questions, public.choices, public.responses, public.answers from anon, authenticated;
grant select on public.surveys, public.questions, public.choices to anon, authenticated;
grant select on public.responses, public.answers to authenticated;
