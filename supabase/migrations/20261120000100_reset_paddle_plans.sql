-- Leaving the Paddle sandbox for Dodo Payments: accounts still holding Paddle ids go to Free with
-- their billing fields cleared, and their trial reminders and trial-watch rows are deleted, so no
-- "trial ended" tip or swallowed reminder follows. Paddle ids are a prefix plus 26 lowercase
-- letters or digits; Dodo's never match. Mock plans and plans set by hand (no billing ids) are left
-- alone. Paddle trial replacements are dropped, and so is all of trial_history: every row came from
-- Creem test mode or the Paddle sandbox, so nobody ever paid. With the history gone anyone may trial
-- again, and every trial counts under the one 'trial' period, so every account's trial usage counts
-- go back to zero; invite extras (bonus) stay. billing_events keeps its dedupe keys.
-- Same rule as `bun scripts/reset-billing.ts --paddle --apply`.
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
      billing_customer_id ~ '^ctm_[a-z0-9]{26}$'
      or billing_subscription_id ~ '^sub_[a-z0-9]{26}$'
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

delete from public.trial_replacements
where replaced_subscription_id ~ '^sub_[a-z0-9]{26}$';

update public.usage
set count = 0
where period = 'trial'
  and count > 0;

delete from public.trial_history;
