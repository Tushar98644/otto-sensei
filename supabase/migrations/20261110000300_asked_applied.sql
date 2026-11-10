-- "Applied to <company>?" on the Jobs tab: asked when someone comes back after opening a job,
-- since an application sent on the company's own site never reaches us. The answer is a match
-- event like the rest: which job, and yes or not yet. Nothing else about the person.

alter table public.match_events drop constraint match_events_kind_check;
alter table public.match_events add constraint match_events_kind_check check (kind in (
  'impression', 'open', 'save', 'tailor', 'applied', 'not_fit', 'asked_applied'));

alter table public.match_events add column answer text check (answer in ('yes', 'not_yet'));
alter table public.match_events add constraint match_events_answer_kind_check
  check ((kind = 'asked_applied') = (answer is not null));
