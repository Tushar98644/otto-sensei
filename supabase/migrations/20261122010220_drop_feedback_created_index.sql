-- no-transaction
-- Nothing in the app lists feedback by date; the owner reads the few rows in the Supabase table editor.
drop index concurrently if exists public.feedback_created_idx;
