-- Checks every stored match event against the rule the last file widened.
alter table public.match_events validate constraint match_events_position_check;
