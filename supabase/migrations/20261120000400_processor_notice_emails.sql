-- email_log also records the one-time notice that Dodo Payments replaces Paddle
-- (scripts/send-processor-notice.ts), so a rerun never emails an account twice. The wider rule
-- replaces the old one in this same transaction; the next file validates it.
-- squawk-ignore ban-drop-constraint
alter table public.email_log drop constraint email_log_kind_check;
alter table public.email_log add constraint email_log_kind_check
  check (kind in ('no_resume', 'fixes_back', 'trial_ended', 'win_back', 'processor_notice')) not valid;
