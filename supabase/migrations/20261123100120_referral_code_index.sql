-- no-transaction
-- An invite link finds its account by code, and no two accounts share one.
create unique index concurrently if not exists user_settings_referral_code_idx
  on public.user_settings (referral_code) where referral_code is not null;
