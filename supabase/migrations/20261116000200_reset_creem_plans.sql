-- Leaving Creem (it never left test mode): accounts still holding Creem ids go to Free with their
-- billing fields cleared, and Creem trial replacements are dropped. Paddle ids are a prefix plus
-- 26 lowercase letters or digits; Creem's never match. Mock plans and plans set by hand (no billing
-- ids) are left alone. Same rule as `bun scripts/reset-creem-plans.ts --apply`.
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
    (billing_customer_id is not null and billing_customer_id !~ '^ctm_[a-z0-9]{26}$')
    or (billing_subscription_id is not null and billing_subscription_id !~ '^sub_[a-z0-9]{26}$')
  )
  and (plan_status is null or plan_status not like 'mock\_%');

delete from public.trial_replacements
where replaced_subscription_id !~ '^sub_[a-z0-9]{26}$';
