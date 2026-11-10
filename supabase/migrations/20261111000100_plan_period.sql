-- The subscription's current billing period from Creem (current_period_start_date and
-- current_period_end_date), set by the billing webhook. AI allowances count per billing period
-- instead of per calendar month: monthly plans from one renewal to the next, yearly plans in
-- monthly steps from the day the period started (src/lib/usage.ts). Rows paid before these columns
-- stay null and keep counting per calendar month (UTC) until their next subscription event, which
-- carries what they used this month over to the new period. Null on Free. New columns change no
-- policy: row level security stays on.
alter table public.users add column plan_period_starts_at bigint;
alter table public.users add column plan_period_ends_at bigint;
