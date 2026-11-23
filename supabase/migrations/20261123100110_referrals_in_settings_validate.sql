-- Checks every row against the rules the last file added.
alter table public.user_settings validate constraint user_settings_referred_by_fkey;
alter table public.user_settings validate constraint user_settings_referral_code_check;
alter table public.user_settings validate constraint user_settings_referral_device_ids_check;
alter table public.user_settings validate constraint user_settings_referral_status_check;
alter table public.user_settings validate constraint user_settings_referral_blocked_reason_check;
alter table public.user_settings validate constraint user_settings_referred_self_check;
