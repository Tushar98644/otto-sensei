-- The app reads only listings and titles since 20261124120000. What it still finishes (copied rows'
-- old rules text, 256-byte title vectors) is kept in those tables, so the old ones can go now.

-- Only the old app wrote old job ids, and it no longer runs.
drop trigger if exists compact_job_refs on public.saved_jobs;
drop trigger if exists compact_job_refs on public.applications;
drop trigger if exists compact_job_refs on public.writings;
-- squawk-ignore ban-drop-function
drop function if exists public.compact_job_refs(), public.compact_job_ref(uuid),
  public.compact_job_snapshot(public.jobs), public.compact_job_id(smallint, text),
  public.compact_job_uuid(bigint), public.compact_job_ext(text, text, text);

-- Every open job was copied by 20261124120000 and every later one written by the new app.
-- squawk-ignore ban-drop-table
drop table if exists public.job_match;
-- squawk-ignore ban-drop-table
drop table if exists public.title_vectors;
-- squawk-ignore ban-drop-table
drop table if exists public.jobs;
