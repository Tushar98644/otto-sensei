-- Otto Resume: initial schema. Applied by scripts/migrate.ts (or `supabase db push`), never edited
-- after it has run anywhere: later changes go in a new, later-timestamped file.
--
-- Timestamps are epoch milliseconds (bigint). Every table has row level security on and no
-- policies: the app reaches the database only from the server, as the table owner, which bypasses
-- RLS, so the Supabase Data API (anon and authenticated keys) can read and write nothing here.

-- One row per Supabase Auth user. Deleting the auth user deletes this row, and the foreign keys
-- below take everything the account owns with it.
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  -- A copy of auth.users.email, synced on sign-in. auth.users keeps addresses unique.
  email text not null,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  plan_status text,
  plan_renews_at bigint,
  billing_customer_id text,
  billing_subscription_id text,
  created_at bigint not null,
  updated_at bigint not null
);
create index users_email_idx on public.users (email);
create index users_billing_customer_idx on public.users (billing_customer_id);
create index users_billing_subscription_idx on public.users (billing_subscription_id);

-- Monthly AI allowances. period is "YYYY-MM" (UTC).
create table public.usage (
  subject uuid not null references public.users (id) on delete cascade,
  feature text not null,
  period text not null,
  count integer not null default 0,
  primary key (subject, feature, period)
);

-- Fixed-window abuse counters, keyed by device, IP or email. Not tied to accounts.
create table public.rate_limits (
  key text not null,
  window_start bigint not null,
  count integer not null default 0,
  primary key (key, window_start)
);
-- The periodic cleanup deletes by window_start alone, which the primary key can't serve.
create index rate_limits_window_idx on public.rate_limits (window_start);

-- Cloud backups of studio resumes. id is chosen by the browser, so it is only unique per user.
create table public.resumes (
  user_id uuid not null references public.users (id) on delete cascade,
  id text not null,
  data jsonb not null,
  created_at bigint not null,
  updated_at bigint not null,
  primary key (user_id, id)
);

-- Resumes deleted from the backup, so another device's stale copy can't bring one back.
create table public.resume_tombstones (
  user_id uuid not null references public.users (id) on delete cascade,
  id text not null,
  deleted_at bigint not null,
  primary key (user_id, id)
);
create index resume_tombstones_user_deleted_idx
  on public.resume_tombstones (user_id, deleted_at, id);

-- Dodo webhook ids already processed, so a redelivery never applies twice.
create table public.billing_events (
  id text primary key,
  type text not null,
  received_at bigint not null
);

-- Job applications a user logs, each tied to the resume version that was sent.
create table public.applications (
  id uuid primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  resume_id text,
  resume_title text not null default '',
  company text not null,
  role text not null default '',
  job_url text not null default '',
  applied_at bigint not null,
  status text not null default 'applied',
  stage_reached text not null default 'applied',
  status_changed_at bigint not null,
  notes text not null default '',
  created_at bigint not null,
  updated_at bigint not null
);
-- id last so the newest-first list pages by (applied_at, id) straight off the index.
create index applications_user_applied_idx on public.applications (user_id, applied_at, id);
create index applications_user_resume_idx on public.applications (user_id, resume_id);

alter table public.users enable row level security;
alter table public.usage enable row level security;
alter table public.rate_limits enable row level security;
alter table public.resumes enable row level security;
alter table public.resume_tombstones enable row level security;
alter table public.billing_events enable row level security;
alter table public.applications enable row level security;
