-- Ship after the release that reads user_settings is live: until then the old app still writes these tables, and their triggers copy it.

-- Every row was copied into user_settings by 20261122010000 and every later write by its trigger, which goes with its table; trial_watch never had a writer.
-- squawk-ignore ban-drop-table
drop table if exists public.work_profiles;
-- squawk-ignore ban-drop-table
drop table if exists public.notification_settings;
-- squawk-ignore ban-drop-table
drop table if exists public.writing_styles;
-- squawk-ignore ban-drop-table
drop table if exists public.account_setup;
-- squawk-ignore ban-drop-table
drop table if exists public.career_log_settings;
-- squawk-ignore ban-drop-table
drop table if exists public.apply_answers;
-- squawk-ignore ban-drop-table
drop table if exists public.user_activity;
-- squawk-ignore ban-drop-table
drop table if exists public.trial_watch;

-- Only those triggers ever called these.
-- squawk-ignore ban-drop-function
drop function if exists public.user_settings_from_work_profiles(), public.user_settings_from_notification_settings(),
  public.user_settings_from_writing_styles(), public.user_settings_from_account_setup(),
  public.user_settings_from_career_log_settings(), public.user_settings_from_apply_answers(),
  public.user_settings_from_user_activity();
