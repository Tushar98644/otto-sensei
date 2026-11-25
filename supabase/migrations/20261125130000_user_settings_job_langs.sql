-- The job post languages Looking for keeps (src/lib/job-feed/job-langs.ts); null means the default for the app's language.
alter table public.user_settings add column job_langs text[];

alter table public.user_settings
  add constraint user_settings_job_langs_check
  check (
    job_langs is null
    or (cardinality(job_langs) between 1 and 5 and job_langs <@ array['en', 'es', 'pt', 'fr', 'de'])
  ) not valid;
