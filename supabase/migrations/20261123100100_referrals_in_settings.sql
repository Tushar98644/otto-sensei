-- Each account's invite code and the invite it joined through move onto its user_settings row; triggers copy the old app's writes until 20261123100900 drops referral_codes and referrals.
alter table public.user_settings
  -- The account's own invite code, made the first time its invite card is opened, and the device cookies it was opened from (newest last).
  add column referral_code text,
  add column referral_device_ids text[] not null default '{}',
  add column referral_code_at bigint,
  -- The invite this account joined through. Null again once the inviter's account is deleted, which ends the invite as deleting its row did.
  add column referred_by uuid,
  add column referral_status text,
  add column referral_blocked_reason text,
  add column referral_device_id text,
  add column referral_rewarded_period text,
  add column referral_rewarded_at bigint,
  add column referred_at bigint;

alter table public.user_settings
  add constraint user_settings_referred_by_fkey
  foreign key (referred_by) references public.users (id) on delete set null not valid;
alter table public.user_settings
  add constraint user_settings_referral_code_check
  check (referral_code ~ '^[a-hjkmnp-z2-9]{8}$') not valid;
alter table public.user_settings
  add constraint user_settings_referral_device_ids_check
  check (cardinality(referral_device_ids) <= 10) not valid;
alter table public.user_settings
  add constraint user_settings_referral_status_check
  check (referral_status in ('pending', 'rewarded', 'capped', 'blocked')) not valid;
alter table public.user_settings
  add constraint user_settings_referral_blocked_reason_check
  check (
    referral_blocked_reason in ('same_device', 'same_person')
    and referral_status = 'blocked'
    or referral_blocked_reason is null and referral_status is distinct from 'blocked'
  ) not valid;
alter table public.user_settings
  add constraint user_settings_referred_self_check check (referred_by <> user_id) not valid;

lock table public.referral_codes, public.referrals in share row exclusive mode;

create function public.user_settings_from_referral_codes() returns trigger language plpgsql as $$
begin
  insert into public.user_settings as s (user_id, updated_at, referral_code, referral_device_ids, referral_code_at)
  values (new.user_id, new.created_at, new.code, new.device_ids, new.created_at)
  on conflict (user_id) do update set
    referral_code = excluded.referral_code,
    referral_device_ids = excluded.referral_device_ids,
    referral_code_at = excluded.referral_code_at;
  return null;
end $$;

create function public.user_settings_from_referrals() returns trigger language plpgsql as $$
begin
  insert into public.user_settings as s (user_id, updated_at, referred_by, referral_status, referral_blocked_reason,
    referral_device_id, referral_rewarded_period, referral_rewarded_at, referred_at)
  values (new.referred_id, new.created_at, new.referrer_id, new.status, new.blocked_reason, new.device_id,
    new.rewarded_period, new.rewarded_at, new.created_at)
  on conflict (user_id) do update set
    referred_by = excluded.referred_by,
    referral_status = excluded.referral_status,
    referral_blocked_reason = excluded.referral_blocked_reason,
    referral_device_id = excluded.referral_device_id,
    referral_rewarded_period = excluded.referral_rewarded_period,
    referral_rewarded_at = excluded.referral_rewarded_at,
    referred_at = excluded.referred_at;
  return null;
end $$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.user_settings_from_referral_codes(), public.user_settings_from_referrals()
      from public, anon, authenticated;
  end if;
end $$;

create trigger to_user_settings after insert or update on public.referral_codes
  for each row execute function public.user_settings_from_referral_codes();
create trigger to_user_settings after insert or update on public.referrals
  for each row execute function public.user_settings_from_referrals();

-- Every stored row goes through the same copy its trigger makes; no value in the old tables changes.
update public.referral_codes set created_at = created_at;
update public.referrals set created_at = created_at;
