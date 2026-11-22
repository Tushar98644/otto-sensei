-- The last calendar day, in the person's own time zone, an account opened an app page (src/lib/analytics/activity.ts), so the first page of each day sends one "returned" event. Only the date: never the time or the page.
create table public.user_activity (
  user_id uuid primary key references public.users (id) on delete cascade,
  active_on date not null
);

alter table public.user_activity enable row level security;
