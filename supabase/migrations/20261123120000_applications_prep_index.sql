-- no-transaction
-- Interview prep lists an account's packs, a few rows among up to 3,000 applications.
create index concurrently if not exists applications_user_prep_idx
  on public.applications (user_id) where prep is not null;
