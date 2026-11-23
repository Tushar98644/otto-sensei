-- One table for the short-lived rows a charged AI call leaves (src/lib/metered-results.ts, src/lib/usage-passes.ts): a paid result replayed under the browser's request id ("result"), and a line fix's pass for its follow-up answers ("pass", keyed "<feature>:<subject>"). Triggers copy the old app's writes until 20261123100900 drops metered_results and usage_passes.
create table public.metered_calls (
  user_id uuid not null references public.users (id) on delete cascade,
  kind text not null check (kind in ('result', 'pass')),
  key text not null check (char_length(key) <= 110),
  -- A result: null while it runs.
  result jsonb,
  demo boolean not null default false,
  started_at bigint,
  -- A pass: the answers it still covers.
  uses_left smallint check (uses_left >= 0),
  expires_at bigint not null,
  primary key (user_id, kind, key),
  check ((kind = 'pass') = (uses_left is not null)),
  check ((kind = 'result') = (started_at is not null))
);

alter table public.metered_calls enable row level security;

create index metered_calls_expires_idx on public.metered_calls (expires_at);

lock table public.metered_results, public.usage_passes in share row exclusive mode;

create function public.metered_calls_from_metered_results() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    delete from public.metered_calls where user_id = old.user_id and kind = 'result' and key = old.request_key;
    return null;
  end if;
  insert into public.metered_calls as c (user_id, kind, key, result, demo, started_at, expires_at)
  values (new.user_id, 'result', new.request_key, new.result, new.demo, new.started_at, new.expires_at)
  on conflict (user_id, kind, key) do update set
    result = excluded.result, demo = excluded.demo, started_at = excluded.started_at, expires_at = excluded.expires_at;
  return null;
end $$;

create function public.metered_calls_from_usage_passes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    delete from public.metered_calls
    where user_id = old.user_id and kind = 'pass' and key = old.feature || ':' || old.subject;
    return null;
  end if;
  insert into public.metered_calls as c (user_id, kind, key, uses_left, expires_at)
  values (new.user_id, 'pass', new.feature || ':' || new.subject, new.uses_left, new.expires_at)
  on conflict (user_id, kind, key) do update set uses_left = excluded.uses_left, expires_at = excluded.expires_at;
  return null;
end $$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.metered_calls_from_metered_results(), public.metered_calls_from_usage_passes()
      from public, anon, authenticated;
  end if;
end $$;

create trigger to_metered_calls after insert or update or delete on public.metered_results
  for each row execute function public.metered_calls_from_metered_results();
create trigger to_metered_calls after insert or update or delete on public.usage_passes
  for each row execute function public.metered_calls_from_usage_passes();

-- Every stored row goes through the same copy its trigger makes; no value in the old tables changes.
update public.metered_results set expires_at = expires_at;
update public.usage_passes set expires_at = expires_at;
