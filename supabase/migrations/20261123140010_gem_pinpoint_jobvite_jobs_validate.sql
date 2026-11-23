-- Checks every stored job and board against the source lists the last file widened.
alter table public.jobs validate constraint jobs_source_check;
alter table public.job_boards validate constraint job_boards_source_check;
