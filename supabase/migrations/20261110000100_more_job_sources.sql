-- More sources for the Jobs tab (JOB-SOURCES.md): Workable, Recruitee and Personio company
-- boards, read the same way as Greenhouse, Lever and Ashby, and the Jobicy feed.

alter table public.jobs drop constraint jobs_source_check;
alter table public.jobs add constraint jobs_source_check check (source in (
  'greenhouse', 'lever', 'ashby', 'workable', 'recruitee', 'personio',
  'himalayas', 'remoteok', 'jobicy'));

alter table public.job_boards drop constraint job_boards_source_check;
alter table public.job_boards add constraint job_boards_source_check check (source in (
  'greenhouse', 'lever', 'ashby', 'workable', 'recruitee', 'personio',
  'himalayas', 'remoteok', 'jobicy'));

-- Company-board jobs no longer keep their text (it is read again from the board when a page needs
-- it); the next read of each board empties it. The column stays for the feeds that keep theirs.
comment on column public.jobs.description is
  'Plain text, only for sources that cannot be read again (Himalayas, Remote OK); empty otherwise.';
