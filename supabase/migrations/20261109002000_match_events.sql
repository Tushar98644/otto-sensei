-- What the Jobs tab showed and what people did with it, to measure match quality
-- (MATCHING-RESEARCH.md, "How to measure match quality"). Never the resume or contact details:
-- only which job, where it sat, its label, the ranking variant and a hash of what matching was
-- sent (skills, titles, years), so one resume version's impressions and actions line up.

create table public.match_events (
  id uuid primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  -- One page of one match request; an action carries the request whose page it was taken on.
  request_id uuid,
  kind text not null check (kind in ('impression', 'open', 'save', 'tailor', 'applied', 'not_fit')),
  -- Not a foreign key: a job's row is deleted 30 days after it closes, and its events stay.
  job_id uuid not null,
  -- 1-based place in the whole ranked list (page 2 starts at 21).
  position integer check (position between 1 and 1000),
  label text check (label in ('strong', 'good', 'stretch')),
  variant text not null check (char_length(variant) between 1 and 40),
  resume_hash text check (resume_hash ~ '^[A-Za-z0-9_-]{8,64}$'),
  -- "Not a fit" only: what was wrong with it.
  reason text check (reason in ('role', 'level', 'place', 'skills', 'other')),
  created_at bigint not null,
  check ((kind = 'not_fit') = (reason is not null))
);

-- Reading a period back for the numbers, and account deletion's cascade by user.
create index match_events_created_idx on public.match_events (created_at);
create index match_events_user_idx on public.match_events (user_id, created_at);

-- Written and read only by the server: RLS on with no policies, like every other table.
alter table public.match_events enable row level security;
