-- Fill with Otto (src/lib/extension/answers.ts): the answers each account saves once for application forms (notice period, pay, work rights, start date, how they heard and the questions Otto asked them). No row means nothing saved yet. Written by PUT /api/extension/answers; the checks keep any other writer to the shape and size the app reads.
-- Was 20261122003000, the same version as active_days, so production skipped it; "if not exists" keeps a copy that did run safe.
create table if not exists public.apply_answers (
  user_id uuid primary key references public.users (id) on delete cascade,
  answers jsonb not null default '{}'::jsonb
    check (jsonb_typeof(answers) = 'object' and pg_column_size(answers) <= 65536),
  updated_at bigint not null
);

alter table public.apply_answers enable row level security;
