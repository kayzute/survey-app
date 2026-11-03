-- A browser that is signed in as an instructor sends an authenticated JWT even
-- when it opens a public student link. Permit that session to use the same
-- narrowly scoped public survey RPCs as an anonymous browser.
grant execute on function public.resolve_public_survey(text) to authenticated;
grant execute on function public.submit_survey_response(uuid, text, jsonb) to authenticated;
