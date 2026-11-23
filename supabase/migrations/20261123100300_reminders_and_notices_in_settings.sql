-- The last trial end reminded and the one-time notices emailed move onto the account's user_settings row; triggers copy the old app's writes until 20261123100900 drops trial_reminders and email_log.
alter table public.user_settings
  -- The trial end the trial-ending reminder last went out for; an end within a trial's length of it is the same trial.
  add column trial_reminded_for bigint,
  -- One-time emails sent, as {"<kind>:<occasion>": when}, and the latest, for the daily email budget.
  add column notices jsonb,
  add column notice_sent_at bigint;

alter table public.user_settings
  add constraint user_settings_notices_check
  check (notices is null or jsonb_typeof(notices) = 'object') not valid;

lock table public.trial_reminders, public.email_log in share row exclusive mode;

create function public.user_settings_from_trial_reminders() returns trigger language plpgsql as $$
begin
  insert into public.user_settings as s (user_id, updated_at, trial_reminded_for)
  values (new.user_id, new.created_at, new.trial_ends_at)
  on conflict (user_id) do update set trial_reminded_for = greatest(s.trial_reminded_for, excluded.trial_reminded_for);
  return null;
end $$;

create function public.user_settings_from_email_log() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    update public.user_settings
    set notices = notices - (old.kind || ':' || old.occasion)
    where user_id = old.user_id and (notices ->> (old.kind || ':' || old.occasion))::bigint = old.created_at;
    return null;
  end if;
  insert into public.user_settings as s (user_id, updated_at, notices, notice_sent_at)
  values (new.user_id, new.created_at, jsonb_build_object(new.kind || ':' || new.occasion, new.created_at),
    new.created_at)
  on conflict (user_id) do update set
    notices = coalesce(s.notices, '{}') || excluded.notices,
    notice_sent_at = greatest(s.notice_sent_at, excluded.notice_sent_at);
  return null;
end $$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.user_settings_from_trial_reminders(), public.user_settings_from_email_log()
      from public, anon, authenticated;
  end if;
end $$;

create trigger to_user_settings after insert or update on public.trial_reminders
  for each row execute function public.user_settings_from_trial_reminders();
create trigger to_user_settings after insert or update or delete on public.email_log
  for each row execute function public.user_settings_from_email_log();

-- Every stored row goes through the same copy its trigger makes; no value in the old tables changes.
update public.trial_reminders set created_at = created_at;
update public.email_log set created_at = created_at;
