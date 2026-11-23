-- The private calendar link and the email-tracking setup move onto the account's user_settings row; triggers copy the old app's writes until 20261123100900 drops calendar_feeds and inbound_addresses.
alter table public.user_settings
  -- One private calendar link: the token is signed over calendar_feed_id, and only its hash is kept.
  add column calendar_feed_id uuid,
  add column calendar_token_hash text,
  add column calendar_feed_at bigint,
  -- Email tracking: tracking_at is when the first address was set up (null: never), then Gmail's forwarding confirmation and the Gmail addresses confirmed as the person's.
  add column tracking_at bigint,
  add column tracking_confirm_code text,
  add column tracking_confirm_url text,
  add column tracking_confirm_source text,
  add column tracking_confirm_at bigint,
  add column tracking_confirmed_at bigint,
  add column tracking_sources text[] not null default '{}',
  add column tracking_test_at bigint,
  add column tracking_last_email_at bigint;

alter table public.user_settings
  add constraint user_settings_calendar_check
  check ((calendar_feed_id is null) = (calendar_token_hash is null)) not valid;
alter table public.user_settings
  add constraint user_settings_tracking_check
  check (
    char_length(tracking_confirm_code) <= 20
    and char_length(tracking_confirm_url) <= 2048
    and char_length(tracking_confirm_source) <= 320
    and cardinality(tracking_sources) <= 5
  ) not valid;

lock table public.calendar_feeds, public.inbound_addresses in share row exclusive mode;

create function public.user_settings_from_calendar_feeds() returns trigger language plpgsql as $$
begin
  insert into public.user_settings as s (user_id, updated_at, calendar_feed_id, calendar_token_hash, calendar_feed_at)
  values (new.user_id, new.created_at, new.feed_id, new.token_hash, new.created_at)
  on conflict (user_id) do update set
    calendar_feed_id = excluded.calendar_feed_id,
    calendar_token_hash = excluded.calendar_token_hash,
    calendar_feed_at = excluded.calendar_feed_at;
  return null;
end $$;

create function public.user_settings_from_inbound_addresses() returns trigger language plpgsql as $$
begin
  insert into public.user_settings as s (user_id, updated_at, tracking_at, tracking_confirm_code, tracking_confirm_url,
    tracking_confirm_source, tracking_confirm_at, tracking_confirmed_at, tracking_sources, tracking_test_at,
    tracking_last_email_at)
  values (new.user_id, new.created_at, new.created_at, new.confirm_code, new.confirm_url, new.confirm_source,
    new.confirm_at, new.confirmed_at, new.sources, new.test_at, new.last_email_at)
  on conflict (user_id) do update set
    tracking_at = excluded.tracking_at,
    tracking_confirm_code = excluded.tracking_confirm_code,
    tracking_confirm_url = excluded.tracking_confirm_url,
    tracking_confirm_source = excluded.tracking_confirm_source,
    tracking_confirm_at = excluded.tracking_confirm_at,
    tracking_confirmed_at = excluded.tracking_confirmed_at,
    tracking_sources = excluded.tracking_sources,
    tracking_test_at = excluded.tracking_test_at,
    tracking_last_email_at = excluded.tracking_last_email_at;
  return null;
end $$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.user_settings_from_calendar_feeds(), public.user_settings_from_inbound_addresses()
      from public, anon, authenticated;
  end if;
end $$;

create trigger to_user_settings after insert or update on public.calendar_feeds
  for each row execute function public.user_settings_from_calendar_feeds();
create trigger to_user_settings after insert or update on public.inbound_addresses
  for each row execute function public.user_settings_from_inbound_addresses();

-- Every stored row goes through the same copy its trigger makes; no value in the old tables changes.
update public.calendar_feeds set created_at = created_at;
update public.inbound_addresses set created_at = created_at;
