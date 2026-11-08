-- A third plan, Max, above Pro (src/config/plans.ts). The plan column's check allowed only free
-- and pro. The new allowances (import, draft, github) live in the usage table, whose feature
-- column has no check, so it needs no change.
alter table public.users drop constraint if exists users_plan_check;
alter table public.users add constraint users_plan_check check (plan in ('free', 'pro', 'max'));
