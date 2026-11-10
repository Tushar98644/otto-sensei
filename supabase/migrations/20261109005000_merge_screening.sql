-- Screening is no longer its own step: a recruiter call now counts as Interviewing, so the board
-- runs To apply, Applied, Interviewing, Offer, Closed. Rows and timelines that say "screening"
-- move to "interview". The app also reads "screening" as interview, so rows written before this
-- runs never break.
update public.applications
set status = 'interview'
where status = 'screening';

-- An application closed after a recruiter call reached Interviewing, so it counts there in the
-- win rate.
update public.applications
set stage_reached = 'interview'
where stage_reached = 'screening';

-- Each timeline entry keeps its place and its time; only the status it names changes.
update public.applications
set status_history = (
  select jsonb_agg(
    case
      when entry ->> 'status' = 'screening' then jsonb_set(entry, '{status}', '"interview"')
      else entry
    end
    order by position
  )
  from jsonb_array_elements(status_history) with ordinality as history(entry, position)
)
where status_history @> '[{"status": "screening"}]';
