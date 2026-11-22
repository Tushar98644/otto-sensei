-- Checks every stored page against the design list the last file widened.
alter table public.portfolios validate constraint portfolios_template_check;
