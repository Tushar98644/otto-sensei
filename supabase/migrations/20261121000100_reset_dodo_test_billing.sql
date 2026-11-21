-- Going live with Dodo Payments after a test-mode check on production: every account holding any
-- billing state goes to Free with its billing fields cleared, and its trial reminders and
-- trial-watch rows are deleted. Dodo test and live ids look alike, so this goes by billing state,
-- not by id; it runs once, in the deploy that switches production to live keys, before any live
-- subscription exists. Mock plans and plans set by hand (no billing state) are left alone. Every
-- trial replacement and all of trial_history go too (nobody has paid yet), so anyone may trial
-- again, and every account's trial usage counts go back to zero; invite extras (bonus) stay.
-- billing_events keeps its dedupe keys. Same rule as `bun scripts/reset-billing.ts --go-live --apply`.
with reset as (
  update public.users
  set plan = 'free',
      plan_interval = null,
      plan_renews_at = null,
      trial_ends_at = null,
      plan_period_starts_at = null,
      plan_period_ends_at = null,
      plan_status = null,
      billing_subscription_id = null,
      billing_customer_id = null,
      billing_event_at = null,
      updated_at = (extract(epoch from now()) * 1000)::bigint
  where (
      billing_customer_id is not null
      or billing_subscription_id is not null
      or plan_status is not null
      or billing_event_at is not null
    )
    and (plan_status is null or plan_status not like 'mock\_%')
  returning id
),
reminders as (
  delete from public.trial_reminders
  where user_id in (select id from reset)
)
delete from public.trial_watch
where user_id in (select id from reset);

delete from public.trial_replacements;

update public.usage
set count = 0
where period = 'trial'
  and count > 0;

delete from public.trial_history;
