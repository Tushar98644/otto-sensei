-- Ship after the release that reads user_settings, metered_calls, billing_log and portfolios.old_slugs is live: until then the old app still writes these tables, and their triggers copy it.

-- Every row was copied by 20261123100000-20261123100700 and every later write by its trigger, which goes with its table.
-- squawk-ignore ban-drop-table
drop table if exists public.active_days;
-- squawk-ignore ban-drop-table
drop table if exists public.weekly_recaps;
-- squawk-ignore ban-drop-table
drop table if exists public.referrals;
-- squawk-ignore ban-drop-table
drop table if exists public.referral_codes;
-- squawk-ignore ban-drop-table
drop table if exists public.calendar_feeds;
-- squawk-ignore ban-drop-table
drop table if exists public.inbound_addresses;
-- squawk-ignore ban-drop-table
drop table if exists public.trial_reminders;
-- squawk-ignore ban-drop-table
drop table if exists public.email_log;
-- squawk-ignore ban-drop-table
drop table if exists public.resume_tombstones;
-- squawk-ignore ban-drop-table
drop table if exists public.metered_results;
-- squawk-ignore ban-drop-table
drop table if exists public.usage_passes;
-- squawk-ignore ban-drop-table
drop table if exists public.billing_events;
-- squawk-ignore ban-drop-table
drop table if exists public.trial_history;
-- squawk-ignore ban-drop-table
drop table if exists public.trial_replacements;
-- squawk-ignore ban-drop-table
drop table if exists public.portfolio_redirects;

-- Only those triggers ever called these.
-- squawk-ignore ban-drop-function
drop function if exists public.user_settings_from_active_days(), public.user_settings_from_weekly_recaps(),
  public.user_settings_from_referral_codes(), public.user_settings_from_referrals(),
  public.user_settings_from_calendar_feeds(), public.user_settings_from_inbound_addresses(),
  public.user_settings_from_trial_reminders(), public.user_settings_from_email_log(),
  public.user_settings_from_resume_tombstones(), public.metered_calls_from_metered_results(),
  public.metered_calls_from_usage_passes(), public.billing_log_from_billing_events(),
  public.billing_log_from_trial_history(), public.billing_log_from_trial_replacements(),
  public.portfolios_from_portfolio_redirects();
