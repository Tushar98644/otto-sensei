-- Job keys are only compared, so they are stored as the first 16 hex of their MD5, the same as
-- shortKey() in src/lib/job-feed/normalize.ts. Unconverted keys always contain "|"; converted ones
-- never do, so this is safe to run again.
update public.jobs set dedupe_key = substr(md5(dedupe_key), 1, 16) where dedupe_key like '%|%';
update public.jobs set group_key = substr(md5(group_key), 1, 16) where group_key like '%|%';
update public.job_match set grp = substr(md5(grp), 1, 16) where grp like '%|%';

-- Cached match results may hold the old keys; the cache refills on the next request.
delete from public.match_cache;

reindex table public.jobs;
reindex table public.job_match;

-- Left over from portfolios with pictures and the "Made with" line, both removed.
drop table if exists public.portfolio_media;
alter table public.portfolios drop column if exists project_images;
alter table public.portfolios drop column if exists hide_credit;
