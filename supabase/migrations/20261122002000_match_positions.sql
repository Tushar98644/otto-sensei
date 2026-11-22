-- Matches now page through every opening (MAX_JOB_PAGE in src/lib/job-feed/types.ts: 1,000 pages
-- of 20), so a job shown can sit past 1,000th. The CHECK only grows. RLS is unchanged.
-- The next file validates the CHECK, so adding it here doesn't scan the table under a write lock.

-- squawk-ignore ban-drop-constraint
alter table public.match_events drop constraint match_events_position_check;

alter table public.match_events
  add constraint match_events_position_check check (position between 1 and 20000) not valid;
