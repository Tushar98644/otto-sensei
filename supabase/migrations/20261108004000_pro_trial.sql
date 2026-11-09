-- The Pro trial (src/config/plans.ts PRO_TRIAL) and Creem as the payment provider.

-- When the account's trial ends, while its subscription is still on the trial (Creem status
-- "trialing", or a failed first payment after it). Cleared by the first regular payment and on
-- Free. Trials count their own allowance (usage period "trial") instead of the month's.
alter table public.users add column trial_ends_at bigint;

-- created_at of the last subscription event applied to the row (epoch ms, from Creem). Creem
-- retries a failed delivery for up to a day, so an older event can arrive after a newer one; it
-- must not roll the plan back.
alter table public.users add column billing_event_at bigint;

-- Everyone who has started a trial or paid, by a SHA-256 of their normalized email. One trial per
-- person: a checkout only offers the trial product to an address with no row here. Deliberately
-- not tied to users, so deleting an account and signing up again doesn't bring the trial back;
-- the hash is all that's kept (see the privacy page).
create table public.trial_history (
  email_hash text primary key,
  kind text not null check (kind in ('trial', 'paid')),
  created_at bigint not null
);

alter table public.trial_history enable row level security;
