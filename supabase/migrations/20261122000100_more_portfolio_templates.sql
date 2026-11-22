-- Portfolio templates, round 3: four more rebuilds of real MIT-licensed portfolios join the eight.
-- No page changes design; the CHECK only grows. New pages still start on navy. RLS is unchanged.
--
-- The list below holds PORTFOLIO_TEMPLATE_IDS (src/lib/portfolio/types.ts) in the design picker's order.

alter table public.portfolios drop constraint portfolios_template_check;

alter table public.portfolios
  add constraint portfolios_template_check
  check (template in (
    'paper', 'dock', 'reel', 'folio', 'cv', 'prose', 'gazette', 'card', 'brutal', 'terminal', 'bento', 'navy'
  ));

alter table public.portfolios alter column template set default 'navy';
