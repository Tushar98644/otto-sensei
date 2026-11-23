-- A portfolio's old addresses move onto its own row as {"<slug>": {"at", "until"}}; a trigger copies the old app's writes until 20261123100900 drops portfolio_redirects.
alter table public.portfolios add column old_slugs jsonb;

alter table public.portfolios
  add constraint portfolios_old_slugs_check
  check (old_slugs is null or jsonb_typeof(old_slugs) = 'object') not valid;

lock table public.portfolio_redirects in share row exclusive mode;

create function public.portfolios_from_portfolio_redirects() returns trigger language plpgsql as $$
begin
  if tg_op in ('DELETE', 'UPDATE') then
    update public.portfolios set old_slugs = old_slugs - old.slug where id = old.portfolio_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    update public.portfolios
    set old_slugs = coalesce(old_slugs, '{}')
      || jsonb_build_object(new.slug, jsonb_build_object('at', new.created_at, 'until', new.expires_at))
    where id = new.portfolio_id;
  end if;
  return null;
end $$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.portfolios_from_portfolio_redirects() from public, anon, authenticated;
  end if;
end $$;

create trigger to_portfolios after insert or update or delete on public.portfolio_redirects
  for each row execute function public.portfolios_from_portfolio_redirects();

-- Every stored row goes through the same copy its trigger makes; no value in the old table changes.
update public.portfolio_redirects set created_at = created_at;
