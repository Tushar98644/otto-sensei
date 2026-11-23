-- no-transaction
-- The invite card counts an account's invites by status; deleting the inviter finds them here too.
create index concurrently if not exists user_settings_referred_by_idx
  on public.user_settings (referred_by, referral_status) where referred_by is not null;
