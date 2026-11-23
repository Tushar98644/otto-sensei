-- Ship after the release that reads skills is live: until then the old app still writes these tables, and their triggers copy it.

-- Every row was copied by 20261123130000 and every later write by its trigger, which goes with its table.
-- squawk-ignore ban-drop-table
drop table if exists public.job_skills;
-- squawk-ignore ban-drop-table
drop table if exists public.match_skills;

-- Only those triggers ever called these.
-- squawk-ignore ban-drop-function
drop function if exists public.skills_from_job_skills(), public.skills_from_match_skills();
