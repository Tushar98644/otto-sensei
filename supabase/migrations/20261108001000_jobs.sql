-- The Jobs tab: openings read every day from public job boards (src/lib/job-feed, JOB-SOURCES.md),
-- matched to a person's resume by rules, plus the jobs each account saves. Also the work profile's
-- remote-only preference, which the Jobs tab uses as its default filter.

-- One row per opening. Written only by the daily ingest (/api/cron/jobs); read by the Jobs tab
-- and the public /jobs page. Not per user, so nothing cascades from users.
create table public.jobs (
  id uuid primary key,
  source text not null check (source in ('greenhouse', 'lever', 'ashby', 'himalayas', 'remoteok')),
  -- The source's own id for the job. Greenhouse ids and Lever and Ashby uuids are unique across
  -- boards; Himalayas gives a guid link and Remote OK a number.
  external_id text not null,
  -- The company board token for board sources, '' for the two feeds.
  board text not null default '',
  company text not null,
  title text not null,
  location text not null default '',
  remote boolean not null default false,
  employment_type text
    check (employment_type in ('full_time', 'part_time', 'contract', 'internship', 'temporary')),
  seniority text not null default 'mid'
    check (seniority in ('intern', 'junior', 'mid', 'senior', 'lead', 'director')),
  family text check (family in ('engineering', 'data', 'design', 'product', 'marketing', 'sales',
    'support', 'operations', 'people', 'finance', 'legal')),
  min_years integer check (min_years between 1 and 20),
  -- When the source says it was posted, else when we first saw it.
  posted_at bigint not null,
  -- The post's closing date, if it gives one (JSON-LD validThrough, Himalayas expiryDate).
  valid_through bigint,
  -- The original posting, always shown and linked.
  url text not null,
  -- Plain text, capped (JOB_LIMITS.descriptionChars).
  description text not null default '',
  -- Only the sentences the work-rights rules read (ruleLines in src/lib/eligibility/check.ts).
  rules_text text not null default '',
  -- Skills found by rules (src/lib/job-feed/skills.ts).
  keywords text[] not null default '{}',
  -- Title, company, location and skills, accent-folded, for search.
  search tsvector not null default ''::tsvector,
  -- Normalized company | title | location: one opening listed by two sources is kept once.
  dedupe_key text not null,
  -- Hash of what normalizing reads, so an unchanged job is only marked as seen.
  content_hash text not null,
  first_seen_at bigint not null,
  last_seen_at bigint not null,
  -- Runs of its board in a row the job was missing from. Two closes it.
  missed_runs integer not null default 0,
  closed_at bigint,
  close_reason text check (close_reason in ('gone', 'expired', 'duplicate', 'board_gone', 'aged')),
  created_at bigint not null,
  updated_at bigint not null,
  constraint jobs_close_reason check ((closed_at is null) = (close_reason is null))
);

create unique index jobs_source_external_idx on public.jobs (source, external_id);
-- The newest open jobs: the public list and every match request's candidate range.
create index jobs_open_posted_idx on public.jobs (posted_at desc, id) where closed_at is null;
-- Marking a board's missing jobs after each read of it.
create index jobs_open_board_idx on public.jobs (source, board) where closed_at is null;
create index jobs_open_dedupe_idx on public.jobs (dedupe_key) where closed_at is null;
-- Candidates for a resume: open jobs sharing a skill, or of the same kind of role.
create index jobs_open_keywords_idx on public.jobs using gin (keywords) where closed_at is null;
create index jobs_open_family_idx on public.jobs (family, posted_at desc) where closed_at is null;
create index jobs_search_idx on public.jobs using gin (search);
-- Closing past their date, and deleting closed rows by age.
create index jobs_open_valid_idx on public.jobs (valid_through)
  where closed_at is null and valid_through is not null;
create index jobs_closed_idx on public.jobs (closed_at) where closed_at is not null;

alter table public.jobs enable row level security;

-- One row per company board and per feed ('himalayas'/'remoteok' with token 'feed'): when it was
-- last read, so each daily run starts with the boards read longest ago and resumes there.
create table public.job_boards (
  source text not null check (source in ('greenhouse', 'lever', 'ashby', 'himalayas', 'remoteok')),
  token text not null,
  company text not null default '',
  last_fetched_at bigint,
  -- 'ok', 'not_found' or 'failed' for the last read.
  last_status text check (last_status in ('ok', 'not_found', 'failed')),
  -- Failed reads in a row; 2 404s in a row close the board's jobs.
  failures integer not null default 0,
  open_jobs integer not null default 0,
  primary key (source, token)
);

create index job_boards_due_idx on public.job_boards (last_fetched_at asc nulls first);

alter table public.job_boards enable row level security;

-- Jobs an account saved from the Jobs tab. A job's row is deleted 30 days after it closes, and
-- its saves go with it.
create table public.saved_jobs (
  user_id uuid not null references public.users (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  saved_at bigint not null,
  primary key (user_id, job_id)
);

create index saved_jobs_user_saved_idx on public.saved_jobs (user_id, saved_at desc);
-- The job_id foreign key's cascade looks rows up by job.
create index saved_jobs_job_idx on public.saved_jobs (job_id);

alter table public.saved_jobs enable row level security;

-- Only remote jobs, please: the Jobs tab's default filter.
alter table public.work_profiles add column remote_only boolean not null default false;
