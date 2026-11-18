-- Two kinds of optional email (src/lib/notifications): a weekly "new jobs match your resume" email,
-- off until the account turns it on, and a few tips and reminders, on until the account turns them
-- off. Both live on notification_settings, where no row still means the defaults below. Each has its
-- own signed one-click unsubscribe link.

alter table public.notification_settings
  add column job_emails boolean not null default false,
  add column tip_emails boolean not null default true,
  -- When the last weekly jobs email went out: the next one waits about a week.
  add column jobs_emailed_at bigint,
  -- When the daily job last looked for new matches, so an account with none waits a day and the
  -- next run starts with the others.
  add column jobs_checked_at bigint,
  -- When the Jobs tab's "email me new matches" card was answered (turned on, or dismissed).
  add column job_prompt_closed_at bigint,
  -- False while the row holds only the jobs or tips choices, so the follow-up reminder choice is
  -- still unmade. Every row from before this one came from a reminder choice, hence the default.
  add column reminders_chosen boolean not null default true;

-- One row per tip email, written before it goes out, so a retried or overlapping run never sends
-- the same one twice. The occasion names which one: 'once' for a one-time email, the month
-- ('2026-12') for the monthly one. Never holds the email's text or the address.
create table public.email_log (
  user_id uuid not null references public.users (id) on delete cascade,
  kind text not null check (kind in ('no_resume', 'fixes_back', 'trial_ended', 'win_back')),
  occasion text not null check (char_length(occasion) between 1 and 40),
  created_at bigint not null,
  primary key (user_id, kind, occasion)
);

alter table public.email_log enable row level security;

-- The latest trial end the daily tips job saw for each account. A trial that ends unpaid clears
-- users.trial_ends_at, so this is how the job knows, a day later, that a trial ended on Free.
create table public.trial_watch (
  user_id uuid primary key references public.users (id) on delete cascade,
  trial_ends_at bigint not null,
  seen_at bigint not null
);

alter table public.trial_watch enable row level security;
