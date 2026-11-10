-- Faster Matches (MATCHING-RESEARCH.md, Round 2 (d)): a narrow copy of what ranking reads, one row
-- per opening, rebuilt at the end of each ingest (rebuildMatchIndex in
-- src/lib/job-feed/match-index.ts). Measured locally at 50k rows: 97-371 ms a match on jobs, a
-- few tens of ms on this table. Until the first rebuild the app keeps ranking from jobs.

-- One small integer per skill, never renumbered, so job_match can hold int[] instead of text[].
create table public.match_skills (
  sid integer primary key check (sid > 0),
  skill text not null unique
);

-- One row per opening Matches may show: open, not filler, seen within 120 days, location copies
-- merged (grp is their group_key, or the job's id for a job posted once).
create table public.job_match (
  -- The newest copy of the opening.
  id uuid primary key references public.jobs (id) on delete cascade,
  grp text not null,
  company text not null,
  family text,
  -- 0 intern ... 5 director, as SENIORITIES in src/lib/job-feed/types.ts.
  level smallint not null check (level between 0 and 5),
  sids integer[] not null,
  -- Where the copies are, as country codes ('US'), groups ('g:emea') and '*' for anywhere.
  places text[] not null default '{}',
  -- Any copy is remote.
  remote boolean not null,
  posted_at bigint not null,
  -- The earlier of posted_at and first_seen_at, for the 120-day cut and the freshness nudge.
  seen_at bigint not null,
  -- Company facts from public visa registers (company_visa), copied in at the rebuild.
  uk_sponsor boolean not null default false,
  h1b_year smallint
);

-- The built-in && (pg_catalog), not intarray's: queries name it, so the index stays usable even if
-- intarray is ever installed.
create index job_match_sids_idx on public.job_match using gin (sids);
create index job_match_family_idx on public.job_match (family);

-- The counts the site states and the match request needs, written by the ingest instead of
-- counted per request (count(distinct) took 784 ms at 50k rows). built_at names the ingest run,
-- so cached match lists from before it are never read.
create table public.job_counts (
  id smallint primary key default 1 check (id = 1),
  open_jobs integer not null check (open_jobs >= 0),
  matchable integer not null check (matchable >= 0),
  checked_at bigint,
  built_at bigint not null
);

-- One page of Matches for one resume version, filters, "Looking for", work profile, plan and
-- ingest run, kept a day (the cleanup cron deletes older rows). Unlogged: losing it in a crash
-- only costs a re-rank.
create unlogged table public.match_cache (
  user_id uuid not null references public.users (id) on delete cascade,
  key text not null check (char_length(key) between 16 and 64),
  value jsonb not null,
  created_at bigint not null,
  primary key (user_id, key)
);
create index match_cache_created_idx on public.match_cache (created_at);

-- Written and read only by the server: RLS on with no policies, like every other table.
alter table public.match_skills enable row level security;
alter table public.job_match enable row level security;
alter table public.job_counts enable row level security;
alter table public.match_cache enable row level security;
