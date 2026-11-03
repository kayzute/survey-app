create or replace function public.archive_survey(p_survey_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    changed public.surveys;
begin
    if auth.uid() is null then
        raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
    end if;
    update public.surveys
       set status = 'archived'
     where id = p_survey_id and status in ('draft', 'closed')
     returning * into changed;
    if not found then
        if exists (select 1 from public.surveys where id = p_survey_id and status = 'active') then
            raise exception using errcode = '22023', message = 'CLOSE_SURVEY_BEFORE_ARCHIVING';
        end if;
        raise exception using errcode = 'P0002', message = 'SURVEY_NOT_FOUND_OR_ALREADY_ARCHIVED';
    end if;
    return jsonb_build_object('id', changed.id, 'title', changed.title, 'description', changed.description,
        'status', changed.status, 'public_slug', changed.public_slug, 'created_at', changed.created_at,
        'updated_at', changed.updated_at);
end;
$$;

create or replace function public.delete_survey(p_survey_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    if auth.uid() is null then
        raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
    end if;
    if not exists (select 1 from public.surveys where id = p_survey_id) then
        raise exception using errcode = 'P0002', message = 'SURVEY_NOT_FOUND';
    end if;
    if exists (select 1 from public.surveys where id = p_survey_id and status = 'active') then
        raise exception using errcode = '22023', message = 'CLOSE_SURVEY_BEFORE_DELETING';
    end if;
    delete from public.surveys where id = p_survey_id;
end;
$$;

revoke all on function public.archive_survey(uuid) from public, anon;
revoke all on function public.delete_survey(uuid) from public, anon;
grant execute on function public.archive_survey(uuid) to authenticated;
grant execute on function public.delete_survey(uuid) to authenticated;
