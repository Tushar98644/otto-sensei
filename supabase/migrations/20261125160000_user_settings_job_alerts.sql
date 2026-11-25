-- Saved searches the bell watches for new jobs (src/lib/job-feed/alerts.ts); null when there are none.
alter table public.user_settings add column job_alerts jsonb;

alter table public.user_settings
  add constraint user_settings_job_alerts_check
  check (
    job_alerts is null
    or case when jsonb_typeof(job_alerts) = 'array'
      then jsonb_array_length(job_alerts) between 1 and 5 else false end
  ) not valid;
