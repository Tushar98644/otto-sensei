-- The weekly new-matches note moves from email to the bell; the next file validates the stored rows.
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
      'job_matches'
    )
  ) not valid;
