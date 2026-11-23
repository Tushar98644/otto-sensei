-- Checks every row against the rules the last file added.
alter table public.user_settings validate constraint user_settings_calendar_check;
alter table public.user_settings validate constraint user_settings_tracking_check;
