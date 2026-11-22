-- no-transaction
-- Nothing filters applications by resume_id; the list and every lookup go by user and date or by id.
drop index concurrently if exists public.applications_user_resume_idx;
