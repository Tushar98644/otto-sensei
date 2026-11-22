-- Checks every stored row against the rules the last file added.
alter table public.applications validate constraint applications_interview_time_check;
alter table public.notifications validate constraint notifications_kind_check;
