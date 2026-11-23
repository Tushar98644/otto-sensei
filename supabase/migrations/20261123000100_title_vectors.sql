-- Job matching v2 (MATCHING.md): one JobBERT-v2 vector per way a job title is written, made by
-- scripts/title-vectors.py in the daily jobs workflow, never on a request. vec is 256 int8 values
-- (256 bytes); occs and sims are the title's three nearest occupations and how near each is. A
-- title nobody's jobs carry for 30 days is dropped by the rebuild. RLS on with no policies, like
-- every other table: only the server reads and writes it.
create table public.title_vectors (
  key text primary key check (char_length(key) between 1 and 120),
  vec bytea check (vec is null or octet_length(vec) = 256),
  occs text[] not null default '{}',
  sims real[] not null default '{}',
  -- When the title was first noted, or a person last chose it as their role.
  seen_at bigint not null,
  embedded_at bigint
);
-- The workflow asks for titles still waiting for a vector, newest first.
create index title_vectors_waiting_idx on public.title_vectors (seen_at) where vec is null;
alter table public.title_vectors enable row level security;

-- The rebuild copies each opening's title key in, so ranking fetches only its candidates' vectors.
alter table public.job_match add column tkey text not null default '';

-- Each impression keeps the ranking's parts for that job (role, skills, level, recency, place, each
-- 0 to 1 as one byte, 0 to 255), so the weights can be fitted to opens, saves and applies later.
-- Five bytes, not a real[] (44): impressions are most of match_events. Null for older rows.
alter table public.match_events add column features bytea
  check (features is null or octet_length(features) <= 8);
