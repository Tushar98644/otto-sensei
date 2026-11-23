-- no-transaction
-- An old address finds the page that left it, and the slug check finds who still holds it.
create index concurrently if not exists portfolios_old_slugs_idx on public.portfolios using gin (old_slugs);
