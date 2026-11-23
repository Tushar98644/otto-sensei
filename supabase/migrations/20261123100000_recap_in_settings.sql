-- The recap's days active and built weeks move onto the account's user_settings row; triggers copy the old app's writes until 20261123100900 drops active_days and weekly_recaps.
alter table public.user_settings
  -- Each calendar day, in the person's own time zone, an app page was opened: the last ten weeks, oldest first.
  add column active_days date[] not null default '{}',
  -- Each built week by its Monday ("YYYY-MM-DD"): {"data", "builtAt", "seenAt"}, the last ten weeks.
  add column recaps jsonb;

alter table public.user_settings
  add constraint user_settings_recaps_check
  check (recaps is null or (jsonb_typeof(recaps) = 'object' and pg_column_size(recaps) <= 1048576)) not valid;

lock table public.active_days, public.weekly_recaps in share row exclusive mode;

create function public.user_settings_from_active_days() returns trigger language plpgsql as $$
begin
  insert into public.user_settings as s (user_id, updated_at, active_days)
  values (new.user_id, (extract(epoch from now()) * 1000)::bigint, array[new.day])
  on conflict (user_id) do update set active_days = (
    select coalesce(array_agg(d order by d), '{}') from (select distinct unnest(s.active_days || new.day) as d) days
  );
  return null;
end $$;

create function public.user_settings_from_weekly_recaps() returns trigger language plpgsql as $$
declare
  week jsonb := jsonb_build_object(new.week_start::text,
    jsonb_build_object('data', new.data, 'builtAt', new.built_at, 'seenAt', new.seen_at));
begin
  insert into public.user_settings as s (user_id, updated_at, recaps)
  values (new.user_id, new.built_at, week)
  on conflict (user_id) do update set recaps = coalesce(s.recaps, '{}') || week;
  return null;
end $$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.user_settings_from_active_days(), public.user_settings_from_weekly_recaps()
      from public, anon, authenticated;
  end if;
end $$;

create trigger to_user_settings after insert or update on public.active_days
  for each row execute function public.user_settings_from_active_days();
create trigger to_user_settings after insert or update on public.weekly_recaps
  for each row execute function public.user_settings_from_weekly_recaps();

-- Every stored row goes through the same copy its trigger makes; no value in the old tables changes.
update public.active_days set day = day;
update public.weekly_recaps set built_at = built_at;
