-- Portfolio templates, round 2: eight rebuilds of real MIT-licensed portfolios replace the six
-- round-1 designs. Existing pages move to the closest new look:
--   margin (one quiet text column)          -> dock  (one calm column)
--   broadsheet (editorial serif page)       -> paper (warm paper page)
--   ledger (printable one-sheet resume)     -> cv    (printable one-page CV)
--   showcase (big project picture tiles)    -> folio (big project tiles)
--   shell (monospace on near-black)         -> bento (dark developer tiles)
--   signal (numbered sections)              -> navy  (numbered sections)
-- New pages start on navy. RLS on portfolios is unchanged.
--
-- The list below must match PORTFOLIO_TEMPLATE_IDS in src/lib/portfolio/types.ts.

alter table public.portfolios drop constraint portfolios_template_check;

update public.portfolios
set template = case template
  when 'margin' then 'dock'
  when 'broadsheet' then 'paper'
  when 'ledger' then 'cv'
  when 'showcase' then 'folio'
  when 'shell' then 'bento'
  when 'signal' then 'navy'
  else template
end
where template in ('margin', 'broadsheet', 'ledger', 'showcase', 'shell', 'signal');

-- Anything else that slipped in while the CHECK was down gets the default.
update public.portfolios
set template = 'navy'
where template not in ('navy', 'dock', 'reel', 'bento', 'cv', 'prose', 'folio', 'paper');

alter table public.portfolios
  add constraint portfolios_template_check
  check (template in ('navy', 'dock', 'reel', 'bento', 'cv', 'prose', 'folio', 'paper'));

alter table public.portfolios alter column template set default 'navy';
