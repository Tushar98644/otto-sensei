-- Better matches on the Jobs tab (MATCHING-RESEARCH.md, Phase 1a): location copies of one opening
-- show as one card, "general application" posts stay off Matches, and rarer skills count more.
-- Rows written before this get both columns on their board's next read: the normalize version in
-- content_hash changed, so every job is rewritten once.

-- Company, cleaned title and a hash of the post without its place and pay lines
-- (groupKey in src/lib/job-feed/normalize.ts). '' until the job is next read: a group of one.
alter table public.jobs add column group_key text not null default '';
-- A post for no particular opening ("General application", "Talent community"), by its title.
-- Posts open 120+ days count too, but that is worked out when matching, since it changes daily.
alter table public.jobs add column evergreen boolean not null default false;

create index jobs_open_group_idx on public.jobs (group_key) where closed_at is null;

-- How many open jobs name each skill, and the weight that gives it in matching:
-- ln(open jobs / jobs naming it), so "Elixir" says more than "JavaScript". Rewritten whole after
-- each ingest run (refreshSkillWeights in src/lib/job-feed/store.ts); a few hundred rows.
create table public.job_skills (
  skill text primary key,
  open_jobs integer not null check (open_jobs > 0),
  weight real not null check (weight >= 0),
  updated_at bigint not null
);

alter table public.job_skills enable row level security;
