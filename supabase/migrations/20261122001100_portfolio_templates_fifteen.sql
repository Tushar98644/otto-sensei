-- Portfolio templates, round 3 (second half): Retro, Headliner and Bubblegum join, making fifteen.
-- No page changes design; the CHECK only grows. New pages still start on navy. RLS is unchanged.
-- The next file validates the CHECK, so adding it here doesn't scan the table under a write lock.
--
-- The list below holds PORTFOLIO_TEMPLATE_IDS (src/lib/portfolio/types.ts) in the design picker's order.

-- squawk-ignore ban-drop-constraint
alter table public.portfolios drop constraint portfolios_template_check;

alter table public.portfolios
  add constraint portfolios_template_check
  check (template in (
    'paper', 'gazette', 'reel', 'dock', 'folio', 'cv', 'prose', 'card', 'brutal', 'terminal',
    'retro', 'starring', 'bubble', 'bento', 'navy'
  )) not valid;

alter table public.portfolios alter column template set default 'navy';
