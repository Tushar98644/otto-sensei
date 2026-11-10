-- One job, one thread: the opening, the saved job, the tailored copy, the application, its letters
-- and answers and its interview prep point at each other by id instead of by a guessed job link.
-- The link stays the fallback for rows it can't name, and old rows are linked below only where
-- exactly one row matches.

-- The opening an application is for, when it came from the Jobs tab (or its link is one of
-- ours). A job's row is deleted 30 days after it closes; the application keeps its own company,
-- role and link, so only this pointer goes.
alter table public.applications
  add column job_id uuid references public.jobs (id) on delete set null;

-- Every status the application has had and when, oldest first, for the timeline on its page.
-- Appended on each real change by the server and trimmed to the newest 30, so a row can't grow
-- without end however often a status is clicked back and forth.
alter table public.applications
  add column status_history jsonb not null default '[]'::jsonb
    check (jsonb_typeof(status_history) = 'array' and jsonb_array_length(status_history) <= 30);

-- The application a letter or answer was written for. Set by the server when the letter is saved
-- or when the application is logged later, so nobody links them by hand.
alter table public.writings
  add column application_id uuid references public.applications (id) on delete set null;

-- Deleting a job or an application sets these to null through the index, not a table scan, and the
-- application page reads its letters straight off it.
create index applications_job_idx on public.applications (job_id) where job_id is not null;
create index writings_application_idx on public.writings (application_id)
  where application_id is not null;
-- A pasted link is looked up among the openings when an application is logged. Hash, not btree:
-- equality is the only question, and a long link can't hit btree's row size limit.
create index jobs_url_idx on public.jobs using hash (url);

-- What is known of each old row's history: the day it was sent and, when it has moved on since,
-- its current status from the time it last changed.
update public.applications
set status_history = case
  when status = 'applied' then
    jsonb_build_array(jsonb_build_object('status', 'applied', 'at', applied_at))
  else
    jsonb_build_array(
      jsonb_build_object('status', 'applied', 'at', applied_at),
      jsonb_build_object('status', status, 'at', greatest(status_changed_at, applied_at))
    )
end;

-- Old applications whose link is exactly one opening's link.
update public.applications a
set job_id = j.id
from public.jobs j
where a.job_id is null
  and a.job_url <> ''
  and j.url = a.job_url
  and (select count(*) from public.jobs other where other.url = a.job_url) = 1;

-- Old letters and answers that match exactly one of the same account's applications: the same
-- job link when both have one, else the same company and job title (src/lib/applications/links.ts
-- uses the same rule for new rows).
with matches as (
  select w.id as writing_id, a.id as application_id,
         count(*) over (partition by w.id) as candidates
  from public.writings w
  join public.applications a on a.user_id = w.user_id
  where w.application_id is null
    and (
      (w.job_url <> '' and a.job_url = w.job_url)
      or (
        (w.job_url = '' or a.job_url = '')
        and w.company <> ''
        and lower(a.company) = lower(w.company)
        and lower(a.role) = lower(w.role)
      )
    )
)
update public.writings w
set application_id = m.application_id
from matches m
where w.id = m.writing_id and m.candidates = 1;
