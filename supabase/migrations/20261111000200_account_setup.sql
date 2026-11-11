-- First-login setup (src/lib/setup): whether the account answered or skipped the one "Where can
-- you work?" step, and whether it hid the "Get set up" list on Home. One row per account that did
-- either; no row means neither. What the list ticks off is read from the real settings (work
-- profile, reminders, resumes), never copied here. Written by PUT /api/setup.

create table public.account_setup (
  user_id uuid primary key references public.users (id) on delete cascade,
  step_at bigint,
  step_outcome text check (step_outcome in ('saved', 'skipped')),
  checklist_hidden_at bigint,
  created_at bigint not null,
  updated_at bigint not null
);

alter table public.account_setup enable row level security;
