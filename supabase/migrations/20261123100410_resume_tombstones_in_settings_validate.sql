-- Checks every row against the rule the last file added.
alter table public.user_settings validate constraint user_settings_deleted_resumes_check;
