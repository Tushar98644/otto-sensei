-- Job rows change every day (seen, missed, closed, rewritten when their post changes). Leave a tenth of
-- each page free so a row's new version can stay on its page, and vacuum after 2% of rows are dead
-- instead of 20%, so their space is reused before the file grows. Only takes a SHARE UPDATE EXCLUSIVE
-- lock (reads and writes carry on); pages already full get the free space at the next vacuum full.
alter table public.jobs set (
  fillfactor = 90,
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_vacuum_threshold = 1000,
  toast.autovacuum_vacuum_scale_factor = 0.02
);
