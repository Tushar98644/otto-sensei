-- A charged line fix that asks questions opens a pass on that line, so its answers ride on the unit already taken (src/lib/usage-passes.ts).
create table public.usage_passes (
  user_id uuid not null references public.users (id) on delete cascade,
  feature text not null check (char_length(feature) <= 40),
  subject text not null check (char_length(subject) <= 64),
  uses_left integer not null check (uses_left >= 0),
  expires_at bigint not null,
  primary key (user_id, feature, subject)
);

alter table public.usage_passes enable row level security;

create index usage_passes_expires_idx on public.usage_passes (expires_at);

-- Paid AI results under the browser's request id for ten minutes, so a reload mid-run gets its answer back unpaid (src/lib/metered-results.ts).
create table public.metered_results (
  user_id uuid not null references public.users (id) on delete cascade,
  request_key text not null check (char_length(request_key) <= 64),
  result jsonb,
  demo boolean not null default false,
  started_at bigint not null,
  expires_at bigint not null,
  primary key (user_id, request_key)
);

alter table public.metered_results enable row level security;

create index metered_results_expires_idx on public.metered_results (expires_at);
