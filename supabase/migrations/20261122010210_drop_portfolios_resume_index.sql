-- no-transaction
-- portfolios.user_id is unique, so its own index already finds the one row every resume_id query names.
drop index concurrently if exists public.portfolios_user_resume_idx;
