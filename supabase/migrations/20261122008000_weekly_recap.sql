-- Your week with Otto (src/lib/recap). Each calendar day, in the person's own time zone, that an account opened an app page: only the date, kept 9 weeks, for the recap's days active.
create table public.active_days (
  user_id uuid not null references public.users (id) on delete cascade,
  day date not null,
  primary key (user_id, day)
);

alter table public.active_days enable row level security;

create index active_days_day_idx on public.active_days (day);

-- Each Monday-to-Sunday week's recap, built once on the first visit after it ends so it opens at once, and kept 9 weeks. Counts, plus the person's own company and job names.
create table public.weekly_recaps (
  user_id uuid not null references public.users (id) on delete cascade,
  week_start date not null,
  data jsonb not null check (octet_length(data::text) <= 32000),
  built_at bigint not null,
  -- When it was first opened, or put off with "See it later": it opens by itself only before that.
  seen_at bigint,
  primary key (user_id, week_start)
);

alter table public.weekly_recaps enable row level security;

create index weekly_recaps_week_idx on public.weekly_recaps (week_start);

-- The bell says when a week is ready; the next file validates the stored rows.
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
      'career_checkin',
      'weekly_recap'
    )
  ) not valid;
