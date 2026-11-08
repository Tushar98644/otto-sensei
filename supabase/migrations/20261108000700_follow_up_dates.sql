-- Follow-up reminders become a date on each application. Marking a job applied sets it (7 days
-- later unless the account picked another default), Snooze moves it, Done or a new status clears
-- it. The daily job reminds about each date once: reminded_at at or past follow_up_at means done.

alter table public.applications add column follow_up_at bigint;

-- Open applications keep a reminder under the new rule: a week after they were sent, and never
-- sooner than a day after they were logged (the old job's grace period). Ones already reminded
-- under the old 3-week rule get no second one.
update public.applications
  set follow_up_at = greatest(applied_at + 7 * 86400000, created_at + 86400000)
  where status = 'applied' and reminded_at is null;

-- The job's backlog: rows leave as soon as they are reminded, snoozed past now only re-enter when
-- the new date passes their stamp, and Done or another status drops them.
drop index if exists public.applications_follow_up_due_idx;
create index applications_follow_up_due_idx
  on public.applications (follow_up_at, user_id)
  where status = 'applied'
    and follow_up_at is not null
    and (reminded_at is null or reminded_at < follow_up_at);

-- The account's default delay. Settings change only the default: each application keeps its own
-- date once set.
alter table public.notification_settings
  add column follow_up_days integer not null default 7
  check (follow_up_days between 1 and 60);

-- Reminder emails become opt-in: no row, or a row someone made only to change the delay, means
-- no email. Rows where a person chose "on" keep it.
alter table public.notification_settings alter column email_reminders set default false;
