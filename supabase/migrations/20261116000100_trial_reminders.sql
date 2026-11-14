-- Trial-ending reminders (src/lib/cron/trial-reminders.ts). Paddle sends no reminder before a
-- trial of 7 days or fewer ends, so a daily job emails each trialist about a day before the first
-- charge and adds a bell notification. One row per reminder, written before the email goes out.
-- A trial whose end date is within the trial's length of one already reminded counts as the same
-- trial (its end only moved), so it isn't reminded again.
create table public.trial_reminders (
  user_id uuid not null references public.users (id) on delete cascade,
  trial_ends_at bigint not null,
  created_at bigint not null,
  primary key (user_id, trial_ends_at)
);

alter table public.trial_reminders enable row level security;

-- The daily job's "trials ending in a day or so", without reading every account. Partial, so only
-- accounts on a trial are in it.
create index users_trial_ends_idx on public.users (trial_ends_at) where trial_ends_at is not null;

-- The bell takes a second kind of notification. Every stored row passes the wider rule, which the
-- next file validates.
-- squawk-ignore ban-drop-constraint
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('application_follow_up', 'trial_ending')) not valid;
