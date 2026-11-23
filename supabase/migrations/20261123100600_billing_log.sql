-- One table for billing's do-it-once records (src/lib/billing): webhook ids and the other once-only keys already handled ("event": ref is the type), one SHA-256 of the normalized email per person who trialed or paid ("trial": ref is trial or paid; no account, so it outlives a deleted one), and trials replaced by a purchase ("replacement": ref is the new subscription, done_at when the old one was cancelled). Triggers copy the old app's writes until 20261123100900 drops billing_events, trial_history and trial_replacements.
create table public.billing_log (
  kind text not null check (kind in ('event', 'trial', 'replacement')),
  key text not null check (char_length(key) between 1 and 200),
  user_id uuid references public.users (id) on delete cascade,
  ref text not null check (char_length(ref) <= 200),
  attempts integer not null default 0 check (attempts >= 0),
  at bigint not null,
  done_at bigint,
  primary key (kind, key),
  check ((kind = 'replacement') = (user_id is not null)),
  check (kind <> 'trial' or ref in ('trial', 'paid'))
);

alter table public.billing_log enable row level security;

-- Account deletion's cascade, the cleanup's old webhook ids, and the cron's "still to cancel, oldest first".
create index billing_log_user_idx on public.billing_log (user_id) where user_id is not null;
create index billing_log_events_idx on public.billing_log (at) where kind = 'event';
create index billing_log_pending_idx on public.billing_log (at) where kind = 'replacement' and done_at is null;

lock table public.billing_events, public.trial_history, public.trial_replacements in share row exclusive mode;

create function public.billing_log_from_billing_events() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    delete from public.billing_log where kind = 'event' and key = old.id;
    return null;
  end if;
  insert into public.billing_log as b (kind, key, ref, at)
  values ('event', new.id, new.type, new.received_at)
  on conflict (kind, key) do update set ref = excluded.ref, at = excluded.at;
  return null;
end $$;

create function public.billing_log_from_trial_history() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    delete from public.billing_log where kind = 'trial' and key = old.email_hash;
    return null;
  end if;
  insert into public.billing_log as b (kind, key, ref, at)
  values ('trial', new.email_hash, new.kind, new.created_at)
  on conflict (kind, key) do update set ref = excluded.ref, at = excluded.at;
  return null;
end $$;

create function public.billing_log_from_trial_replacements() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    delete from public.billing_log where kind = 'replacement' and key = old.replaced_subscription_id;
    return null;
  end if;
  insert into public.billing_log as b (kind, key, user_id, ref, attempts, at, done_at)
  values ('replacement', new.replaced_subscription_id, new.user_id, new.subscription_id, new.attempts, new.created_at,
    new.cancelled_at)
  on conflict (kind, key) do update set
    user_id = excluded.user_id, ref = excluded.ref, attempts = excluded.attempts, at = excluded.at,
    done_at = excluded.done_at;
  return null;
end $$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.billing_log_from_billing_events(), public.billing_log_from_trial_history(),
      public.billing_log_from_trial_replacements() from public, anon, authenticated;
  end if;
end $$;

create trigger to_billing_log after insert or update or delete on public.billing_events
  for each row execute function public.billing_log_from_billing_events();
create trigger to_billing_log after insert or update or delete on public.trial_history
  for each row execute function public.billing_log_from_trial_history();
create trigger to_billing_log after insert or update or delete on public.trial_replacements
  for each row execute function public.billing_log_from_trial_replacements();

-- Every stored row goes through the same copy its trigger makes; no value in the old tables changes.
update public.billing_events set received_at = received_at;
update public.trial_history set created_at = created_at;
update public.trial_replacements set created_at = created_at;
