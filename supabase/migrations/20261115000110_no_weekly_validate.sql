-- Moves a weekly row the old app wrote while the last file ran (before its rule was in place), then checks every row.
update public.users set plan_interval = 'month' where plan_interval = 'week';
alter table public.users validate constraint users_plan_interval_check;
