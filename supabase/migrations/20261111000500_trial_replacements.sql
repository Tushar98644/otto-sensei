-- Pro trials ended early by buying another plan (src/lib/billing/replacements.ts). Creem can't
-- move a trialing subscription to another product ("must be active before it can be modified"),
-- so the new plan is a checkout of its own whose metadata names the trial. Once that subscription
-- is active, the billing webhook writes a row here and cancels the trial right away; nothing was
-- ever charged on it. A row with no cancelled_at is a cancel still to retry, by the next webhook
-- or the daily cleanup cron. Events from a replaced subscription never change the plan again.
create table public.trial_replacements (
  replaced_subscription_id text primary key,
  subscription_id text not null,
  user_id uuid not null references public.users (id) on delete cascade,
  attempts integer not null default 0,
  created_at bigint not null,
  cancelled_at bigint
);

-- The cron's "still to cancel, oldest first", without reading the finished ones.
create index trial_replacements_pending_idx
  on public.trial_replacements (created_at)
  where cancelled_at is null;

alter table public.trial_replacements enable row level security;
