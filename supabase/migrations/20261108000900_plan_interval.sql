-- How often the user's paid plan bills (src/config/plans.ts BillingInterval), set by the billing
-- webhook from the subscription's product and by mock checkout. Weekly subscribers get weekly
-- allowances per billing week; monthly and yearly ones keep the monthly allowances. Null on Free.
-- Rows already paid before this column stay null until their next subscription event and are
-- counted monthly until then. A new column changes no policy: row level security stays on.
alter table public.users add column plan_interval text
  check (plan_interval in ('month', 'year', 'week'));
