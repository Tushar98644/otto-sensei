-- In-app notifications, the email reminder setting, and what the daily jobs (src/lib/cron) need to
-- find their rows through an index instead of scanning whole tables.

-- One row per thing Otto tells a user in the dashboard bell. Written only by server jobs (the
-- daily application follow-up); read and marked read by GET/PATCH /api/notifications.
create table public.notifications (
  id uuid primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  kind text not null check (kind in ('application_follow_up')),
  title text not null,
  body text not null default '',
  -- An in-app path such as '/dashboard/applications', or null when there is nowhere to go.
  link text check (link is null or link ~ '^/[^/\\]'),
  read_at bigint,
  created_at bigint not null
);
-- id last so the newest-first list is read straight off the index.
create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc, id desc);
-- The bell's unread count, without touching read rows.
create index notifications_user_unread_idx
  on public.notifications (user_id) where read_at is null;
-- The daily cleanup deletes old rows across all users by age.
create index notifications_created_idx on public.notifications (created_at);

alter table public.notifications enable row level security;

-- Reminder emails are on until the user turns them off (Account page, or the one-click
-- unsubscribe link in the email), so a row exists only once someone changed it; no row means on.
-- In-app notifications don't depend on it.
create table public.notification_settings (
  user_id uuid primary key references public.users (id) on delete cascade,
  email_reminders boolean not null default true,
  updated_at bigint not null
);

alter table public.notification_settings enable row level security;

-- When the follow-up job reminded the user about this application, so each one is reminded once.
alter table public.applications add column reminded_at bigint;
-- Due follow-ups across all users: still "applied", never reminded, oldest first. Partial, so rows
-- leave the index as soon as they are reminded or move on, and the job reads only its backlog.
create index applications_follow_up_due_idx
  on public.applications (applied_at, user_id)
  where status = 'applied' and reminded_at is null;

-- Cross-user cleanup by age. The existing indexes lead with user_id, which can't serve these.
create index resume_tombstones_deleted_idx on public.resume_tombstones (deleted_at);
create index billing_events_received_idx on public.billing_events (received_at);
