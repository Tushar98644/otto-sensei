-- Checks every row against the rules 20261123110000 added and widened.
alter table public.users validate constraint users_credit_cents_check;
alter table public.billing_log validate constraint billing_log_kind_check;
alter table public.billing_log validate constraint billing_log_check;
alter table public.billing_log validate constraint billing_log_cents_check;
