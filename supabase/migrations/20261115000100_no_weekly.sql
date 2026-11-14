-- Weekly plans are gone: weekly subscribers count monthly from here. Usage rows keyed "week:..."
-- stay where they are and nothing reads them. The next file validates the new rule.
update public.users set plan_interval = 'month' where plan_interval = 'week';
-- The stricter rule replaces it in this same transaction.
-- squawk-ignore ban-drop-constraint
alter table public.users drop constraint users_plan_interval_check;
alter table public.users add constraint users_plan_interval_check
  check (plan_interval in ('month', 'year')) not valid;
