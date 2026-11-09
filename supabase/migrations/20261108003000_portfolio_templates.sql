-- Portfolio templates: the six approved designs replace the three placeholders. Existing pages
-- move to the closest new look (minimal -> margin, studio -> showcase, developer -> shell), and new
-- pages start on margin. Also adds the optional per-project pictures Showcase draws.
--
-- The list below must match PORTFOLIO_TEMPLATE_IDS in src/lib/portfolio/types.ts.

alter table public.portfolios drop constraint portfolios_template_check;

update public.portfolios
set template = case template
  when 'minimal' then 'margin'
  when 'studio' then 'showcase'
  when 'developer' then 'shell'
  else template
end
where template in ('minimal', 'studio', 'developer');

alter table public.portfolios
  add constraint portfolios_template_check
  check (template in ('margin', 'broadsheet', 'ledger', 'showcase', 'shell', 'signal'));

alter table public.portfolios alter column template set default 'margin';

-- Project id -> https picture address, set in the editor. Only ever an address: the page loads it
-- from its own host, and the app checks every entry again when it reads the row.
alter table public.portfolios
  add column project_images jsonb not null default '{}'::jsonb
  check (jsonb_typeof(project_images) = 'object');
