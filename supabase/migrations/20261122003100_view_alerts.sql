-- One-tap email prompts and view alerts (src/lib/notifications/prompts.ts and view-alerts.ts).
alter table public.notification_settings
  -- "Not now" on the weekly jobs card: hidden for 30 days, then it may ask once more.
  add column job_prompt_snoozed_at bigint,
  -- "Not now" on the follow-up reminders card, the same way.
  add column reminder_prompt_snoozed_at bigint,
  -- An email when someone opens a share link or the portfolio: off until the account turns it on.
  add column view_emails boolean not null default false,
  -- When the views card was answered (turned on, or a choice made in settings), and its "Not now".
  add column view_prompt_closed_at bigint,
  add column view_prompt_snoozed_at bigint,
  -- When the last views email went out: the next one lists only alerts made after it.
  add column views_emailed_at bigint;

-- The last bell alert that someone opened this link: at most one a day per link.
alter table public.shares add column view_alerted_at bigint;

-- The portfolio's view count at its last weekly views alert, and when that was. Pages already
-- live start from today's count, so the first alert counts only views from now on.
alter table public.portfolios
  add column views_noted integer not null default 0,
  add column views_noted_at bigint;

update public.portfolios
set views_noted = views, views_noted_at = (extract(epoch from now()) * 1000)::bigint
where views > 0 or published;

-- The bell takes two more kinds; the next file validates the stored rows.
-- squawk-ignore ban-drop-constraint
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (
    kind in ('application_follow_up', 'trial_ending', 'interview_soon', 'share_viewed', 'portfolio_views')
  ) not valid;
