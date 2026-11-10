-- The "Looking for" card on the Jobs tab (MATCHING-RESEARCH.md, Round 2 (f)): the role, level and
-- place Matches are ranked for. Guessed from the resume and the work profile; these columns keep
-- only what the person changed, so a part left null follows the resume they pick. Its "Remote
-- only" is the existing remote_only column. Free and Pro both write it (PUT /api/jobs/looking-for).

alter table public.work_profiles
  add column target_title text check (char_length(target_title) <= 80),
  add column target_family text check (target_family in ('engineering', 'data', 'design',
    'product', 'marketing', 'sales', 'support', 'operations', 'people', 'finance', 'legal')),
  add column target_level text check (target_level in ('intern', 'junior', 'mid', 'senior',
    'lead', 'director')),
  -- 'anywhere', a country ('c:DE') or a group of countries ('g:eu'); see looking-for.ts.
  add column target_place text check (target_place ~ '^(anywhere|c:[A-Z]{2}|g:[a-z_]{2,16})$');
