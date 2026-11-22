-- Career log (src/lib/career-log): one short note per month on what the person shipped, measured and learned or led. Text only: voice is transcribed and never kept.
create table public.career_log_entries (
  id uuid primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  -- The month the note is about, as YYYY-MM.
  month text not null check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  shipped text not null default '' check (char_length(shipped) <= 2000),
  numbers text not null default '' check (char_length(numbers) <= 2000),
  learned text not null default '' check (char_length(learned) <= 2000),
  -- "Nothing new this month", pressed once.
  nothing_new boolean not null default false,
  created_at bigint not null,
  updated_at bigint not null,
  unique (user_id, month)
);

alter table public.career_log_entries enable row level security;

-- The monthly check-in: off until the person says yes, and free on every plan.
create table public.career_log_settings (
  user_id uuid primary key references public.users (id) on delete cascade,
  checkins boolean not null default false,
  -- The check-in email; turning it off leaves the bell's monthly note.
  emails boolean not null default true,
  -- The day: the week of the month (1 to 4, or 5 for the last) and the weekday (0 Sunday to 6 Saturday). First Monday until changed.
  week smallint not null default 1 check (week between 1 and 5),
  weekday smallint not null default 1 check (weekday between 0 and 6),
  time_zone text not null default 'UTC' check (char_length(time_zone) between 1 and 64),
  -- The next check-in day in that time zone; a pause skips the days before paused_until.
  next_checkin_on date,
  paused_until date,
  -- The job from "I got the job", so turning the log into lines starts there.
  job_role text not null default '' check (char_length(job_role) <= 200),
  job_company text not null default '' check (char_length(job_company) <= 200),
  -- The month the last check-in asked about and when, then the same for its email.
  last_checkin_month text,
  last_checkin_at bigint,
  emailed_month text,
  emailed_at bigint,
  -- The congrats card: answered for good, or "Not now" resting it for 30 days.
  prompt_closed_at bigint,
  prompt_snoozed_at bigint,
  updated_at bigint not null
);

alter table public.career_log_settings enable row level security;

create index career_log_settings_due_idx on public.career_log_settings (next_checkin_on)
  where checkins;
create index career_log_settings_emailed_idx on public.career_log_settings (emailed_at);

-- The bell takes the monthly check-in, keeping every kind it already has; the next file validates the stored rows.
-- squawk-ignore ban-drop-constraint
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (
    kind in (
      'application_follow_up',
      'trial_ending',
      'interview_soon',
      'share_viewed',
      'portfolio_views',
      'interview_after',
      'interview_today',
      'job_matches',
      'career_checkin'
    )
  ) not valid;
