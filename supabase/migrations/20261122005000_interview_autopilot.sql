-- Interview autopilot (src/lib/interviews/*): an interview's time, the morning brief, "How did it go?" and the calendar feed.
alter table public.applications
  -- Minutes after midnight in interview_zone; null is a day with no time set.
  add column interview_time smallint,
  -- The IANA zone the time was typed in.
  add column interview_zone text,
  -- The interview day each step last ran for, so a moved interview gets it again and a repeat run never does.
  add column interview_briefed_for bigint,
  add column interview_asked_for bigint,
  -- The interview day the person answered "How did it go?" for.
  add column interview_answered_for bigint;

-- The next file validates it; every stored row has no time yet.
alter table public.applications
  add constraint applications_interview_time_check
  check (interview_time is null or interview_time between 0 and 1439) not valid;

-- A follow-up after an interview, read by the daily reminder run beside the applied ones.
create index applications_interview_follow_up_idx
  on public.applications (follow_up_at, user_id)
  where status = 'interview'
    and follow_up_at is not null
    and (reminded_at is null or reminded_at < follow_up_at);

alter table public.notification_settings
  -- The morning brief on interview days: off until the account turns it on.
  add column interview_briefs boolean not null default false,
  -- When its one-tap card was answered, and its "Not now".
  add column brief_prompt_closed_at bigint,
  add column brief_prompt_snoozed_at bigint,
  -- When the last brief went out, for the optional email budget.
  add column briefs_emailed_at bigint;

-- One private calendar link per account. Only the token's hash is kept; the link is signed over feed_id, so a new id retires the old link.
create table public.calendar_feeds (
  user_id uuid primary key references public.users (id) on delete cascade,
  feed_id uuid not null,
  token_hash text not null unique,
  created_at bigint not null
);

alter table public.calendar_feeds enable row level security;

-- The bell takes "How did it go?"; the next file validates the stored rows.
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
      'interview_after'
    )
  ) not valid;
