-- Checks every row against the rule the last file added.
alter table public.portfolios validate constraint portfolios_old_slugs_check;
