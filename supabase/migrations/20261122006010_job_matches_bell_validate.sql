-- Checks every stored notification against the rule the last file widened.
alter table public.notifications validate constraint notifications_kind_check;
