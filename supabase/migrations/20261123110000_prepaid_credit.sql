-- Prepaid credit for paid plans (src/lib/billing/credit.ts). The balance is cents on the account's users row, beside the plan and under the same row lock. billing_log keeps the ledger: a checkout started for credit ("topup_checkout": key is our id, ref the Dodo checkout session, cents what it adds, done_at when paid), a credited payment ("topup": key is the payment id, ref what it charged with tax as "<minor units> <currency>", done_at once all of it is taken back), credit a refund or lost dispute took back ("topup_back": key "refund:<id>" or "dispute:<id>", ref the payment id), and credit spent on an AI action ("credit_spend": ref is the feature). 20261123110010 validates the new and widened checks.
alter table public.users add column credit_cents integer not null default 0;
alter table public.users add constraint users_credit_cents_check check (credit_cents >= 0) not valid;

alter table public.billing_log add column cents integer;

-- squawk-ignore ban-drop-constraint
alter table public.billing_log drop constraint billing_log_kind_check;
alter table public.billing_log add constraint billing_log_kind_check
  check (kind in ('event', 'trial', 'replacement', 'topup_checkout', 'topup', 'topup_back', 'credit_spend')) not valid;

-- squawk-ignore ban-drop-constraint
alter table public.billing_log drop constraint billing_log_check;
alter table public.billing_log add constraint billing_log_check
  check ((kind in ('replacement', 'topup_checkout', 'topup', 'topup_back', 'credit_spend')) = (user_id is not null)) not valid;

alter table public.billing_log add constraint billing_log_cents_check
  check (((kind in ('topup_checkout', 'topup', 'topup_back', 'credit_spend')) = (cents is not null)) and coalesce(cents, 0) >= 0) not valid;

-- The cleanup's old checkouts and spends.
create index billing_log_credit_idx on public.billing_log (at) where kind in ('topup_checkout', 'credit_spend');
