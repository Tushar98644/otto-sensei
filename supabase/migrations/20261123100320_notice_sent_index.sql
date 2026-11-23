-- no-transaction
-- The daily email budget counts the notices sent in the last day.
create index concurrently if not exists user_settings_notice_sent_idx
  on public.user_settings (notice_sent_at) where notice_sent_at is not null;
