-- Occupations for every kind of job (MATCHING-RESEARCH.md, "Occupations for every kind of job"):
-- each job title read once at ingest into an O*NET-SOC 2019 code (src/lib/job-feed/occupations),
-- so a nurse, a driver or a teacher is matched to their own work, not only by tool names. Codes
-- look like '29-1141.00'; the few startup roles O*NET lacks use a letter ('11-X101.00').

alter table public.jobs
  add column occupation text check (occupation ~ '^\d{2}-[0-9X]\d{3}\.\d{2}$');

-- The occupation, its SOC minor group ('29-1') and major group ('29'), and its O*NET Job Zone
-- (1-5), so ranking reaches the same occupation, its neighbours and the same field in one scan.
-- Filled by the next rebuild (rebuildMatchIndex); empty until then, as before.
alter table public.job_match
  add column occ text,
  add column occ_minor text,
  add column occ_major text,
  add column zone smallint check (zone between 1 and 5);
create index job_match_occ_idx on public.job_match (occ);
create index job_match_occ_minor_idx on public.job_match (occ_minor);

-- The "Looking for" card can name any occupation, not only the 11 kinds of role.
alter table public.work_profiles
  add column target_occupation text check (target_occupation ~ '^\d{2}-[0-9X]\d{3}\.\d{2}$');
