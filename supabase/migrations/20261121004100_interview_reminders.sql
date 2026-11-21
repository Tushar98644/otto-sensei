-- Interview reminders (src/lib/cron/follow-ups.ts): the interview day last reminded, so a moved interview is reminded again and a repeat run never is.
alter table public.applications add column interview_reminded_for bigint;

-- The daily run's look at interviews in the next day and a half; partial, so only jobs in Interviewing with a day set are in it.
create index applications_interview_soon_idx
  on public.applications (interview_at, user_id)
  where status = 'interview' and interview_at is not null;

-- The application a bell row is about, for its Done and Snooze; not a foreign key, so deleting an application never scans notifications.
alter table public.notifications add column application_id uuid;

-- The bell takes a third kind of notification; the next file validates the stored rows.
-- squawk-ignore ban-drop-constraint
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('application_follow_up', 'trial_ending', 'interview_soon')) not valid;
