-- no-transaction
-- The calendar link finds its account by the hash of its token, and no two accounts share one.
create unique index concurrently if not exists user_settings_calendar_token_idx
  on public.user_settings (calendar_token_hash) where calendar_token_hash is not null;
