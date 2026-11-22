-- Workday career sites join the Jobs tab's company boards (JOB-SOURCES.md, owner decision 2026-11-22).
-- The CHECKs only grow, so no stored row changes. The next file validates them, so adding them here
-- doesn't scan the tables under a write lock. RLS is unchanged.

-- squawk-ignore ban-drop-constraint
alter table public.jobs drop constraint jobs_source_check;
alter table public.jobs add constraint jobs_source_check check (source in (
  'greenhouse', 'lever', 'ashby', 'workable', 'recruitee', 'personio', 'workday',
  'himalayas', 'remoteok', 'jobicy')) not valid;

-- squawk-ignore ban-drop-constraint
alter table public.job_boards drop constraint job_boards_source_check;
alter table public.job_boards add constraint job_boards_source_check check (source in (
  'greenhouse', 'lever', 'ashby', 'workable', 'recruitee', 'personio', 'workday',
  'himalayas', 'remoteok', 'jobicy')) not valid;
