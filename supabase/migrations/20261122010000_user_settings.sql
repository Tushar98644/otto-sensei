-- One settings row per account (userSettings in src/db/schema.ts) in place of seven one-row tables; triggers copy the old app's writes here until 20261122010900 drops those tables.

create table public.user_settings (
  user_id uuid primary key references public.users (id) on delete cascade,
  updated_at bigint not null,

  -- Where can you work and Looking for (was work_profiles). work_updated_at is null until either is saved.
  country text not null default '' check (country = '' or country ~ '^[A-Z]{2}$'),
  time_zone text not null default '',
  work_us text check (work_us in ('authorized', 'sponsorship')),
  work_uk text check (work_uk in ('authorized', 'sponsorship')),
  work_eu text check (work_eu in ('authorized', 'sponsorship')),
  work_ca text check (work_ca in ('authorized', 'sponsorship')),
  full_time boolean not null default true,
  contract boolean not null default true,
  remote_only boolean not null default false,
  target_title text check (char_length(target_title) <= 80),
  target_family text check (target_family in ('engineering', 'data', 'design', 'product', 'marketing', 'sales',
    'support', 'operations', 'people', 'finance', 'legal')),
  target_occupation text check (target_occupation ~ '^\d{2}-[0-9X]\d{3}\.\d{2}$'),
  target_level text check (target_level in ('intern', 'junior', 'mid', 'senior', 'lead', 'director')),
  target_place text check (target_place ~ '^(anywhere|c:[A-Z]{2}|g:[a-z_]{2,16})$'),
  work_updated_at bigint,

  -- Follow-up reminders and the weekly matches note (was notification_settings).
  email_reminders boolean not null default false,
  follow_up_days smallint not null default 7 check (follow_up_days between 1 and 60),
  -- False until the person picks a reminder setting.
  reminders_chosen boolean not null default false,
  reminder_prompt_snoozed_at bigint,
  -- When the last weekly matches note rang, and when the daily run last looked.
  jobs_noted_at bigint,
  jobs_checked_at bigint,
  -- Choices from the unsubscribe links of emails no longer sent, kept so an opt-out is never forgotten.
  job_emails boolean not null default false,
  tip_emails boolean not null default true,
  view_emails boolean not null default false,

  -- Writing style (was writing_styles). writing_updated_at is null until it is saved.
  writing_tone text not null default 'natural' check (writing_tone in ('natural', 'warm', 'direct', 'formal')),
  writing_length text not null default 'standard' check (writing_length in ('standard', 'shorter')),
  writing_spelling text not null default 'us' check (writing_spelling in ('us', 'uk')),
  writing_sign_off text not null default '' check (char_length(writing_sign_off) <= 40),
  writing_notes text not null default '' check (char_length(writing_notes) <= 500),
  writing_updated_at bigint,

  -- First-login setup (was account_setup).
  setup_step_at bigint,
  setup_step_outcome text check (setup_step_outcome in ('saved', 'skipped')),
  checklist_hidden_at bigint,
  setup_defaults_at bigint,
  setup_looking_for_at bigint,
  country_guess text check (char_length(country_guess) = 2),
  country_guess_from text check (country_guess_from in ('resume', 'device')),
  region_guess text check (region_guess in ('us', 'uk', 'eu', 'ca')),

  -- Career log check-ins (was career_log_settings).
  career_checkins boolean not null default false,
  career_emails boolean not null default true,
  career_week smallint not null default 1 check (career_week between 1 and 5),
  career_weekday smallint not null default 1 check (career_weekday between 0 and 6),
  career_time_zone text not null default 'UTC' check (char_length(career_time_zone) between 1 and 64),
  career_next_on date,
  career_paused_until date,
  career_job_role text not null default '' check (char_length(career_job_role) <= 200),
  career_job_company text not null default '' check (char_length(career_job_company) <= 200),
  career_last_month text,
  career_last_at bigint,
  career_emailed_month text,
  career_emailed_at bigint,
  career_prompt_closed_at bigint,
  career_prompt_snoozed_at bigint,

  -- Fill with Otto answers (was apply_answers). Null until any is saved.
  apply_answers jsonb
    check (apply_answers is null or (jsonb_typeof(apply_answers) = 'object' and pg_column_size(apply_answers) <= 65536)),
  apply_answers_at bigint,

  -- The last day, in the person's own time zone, an app page was opened (was user_activity).
  active_on date
) with (fillfactor = 90);

alter table public.user_settings enable row level security;

-- The daily check-in run's "due soon", and the optional-email budget's count of check-in emails sent today.
create index user_settings_career_due_idx on public.user_settings (career_next_on) where career_checkins;
create index user_settings_career_emailed_idx on public.user_settings (career_emailed_at)
  where career_emailed_at is not null;

-- Held for the whole file, in the order the old app writes them, so no write lands between the copy and its trigger.
lock table public.work_profiles, public.account_setup, public.notification_settings, public.writing_styles,
  public.career_log_settings, public.apply_answers, public.user_activity in share row exclusive mode;

create function public.user_settings_from_work_profiles() returns trigger language plpgsql as $$
begin
  insert into public.user_settings as s (user_id, updated_at, country, time_zone, work_us, work_uk, work_eu, work_ca,
    full_time, contract, remote_only, target_title, target_family, target_occupation, target_level, target_place,
    work_updated_at)
  values (new.user_id, new.updated_at, new.country, new.time_zone, new.work_us, new.work_uk, new.work_eu, new.work_ca,
    new.full_time, new.contract, new.remote_only, new.target_title, new.target_family, new.target_occupation,
    new.target_level, new.target_place, new.updated_at)
  on conflict (user_id) do update set
    updated_at = greatest(s.updated_at, excluded.updated_at),
    country = excluded.country, time_zone = excluded.time_zone, work_us = excluded.work_us,
    work_uk = excluded.work_uk, work_eu = excluded.work_eu, work_ca = excluded.work_ca,
    full_time = excluded.full_time, contract = excluded.contract, remote_only = excluded.remote_only,
    target_title = excluded.target_title, target_family = excluded.target_family,
    target_occupation = excluded.target_occupation, target_level = excluded.target_level,
    target_place = excluded.target_place, work_updated_at = excluded.work_updated_at;
  return null;
end $$;

create function public.user_settings_from_notification_settings() returns trigger language plpgsql as $$
begin
  insert into public.user_settings as s (user_id, updated_at, email_reminders, follow_up_days, reminders_chosen,
    reminder_prompt_snoozed_at, jobs_noted_at, jobs_checked_at, job_emails, tip_emails, view_emails)
  values (new.user_id, new.updated_at, new.email_reminders, new.follow_up_days, new.reminders_chosen,
    new.reminder_prompt_snoozed_at, new.jobs_emailed_at, new.jobs_checked_at, new.job_emails, new.tip_emails,
    new.view_emails)
  on conflict (user_id) do update set
    updated_at = greatest(s.updated_at, excluded.updated_at),
    email_reminders = excluded.email_reminders, follow_up_days = excluded.follow_up_days,
    reminders_chosen = excluded.reminders_chosen, reminder_prompt_snoozed_at = excluded.reminder_prompt_snoozed_at,
    jobs_noted_at = excluded.jobs_noted_at, jobs_checked_at = excluded.jobs_checked_at,
    job_emails = excluded.job_emails, tip_emails = excluded.tip_emails, view_emails = excluded.view_emails;
  return null;
end $$;

create function public.user_settings_from_writing_styles() returns trigger language plpgsql as $$
begin
  insert into public.user_settings as s (user_id, updated_at, writing_tone, writing_length, writing_spelling,
    writing_sign_off, writing_notes, writing_updated_at)
  values (new.user_id, new.updated_at, new.tone, new.length, new.spelling, new.sign_off, new.notes, new.updated_at)
  on conflict (user_id) do update set
    updated_at = greatest(s.updated_at, excluded.updated_at),
    writing_tone = excluded.writing_tone, writing_length = excluded.writing_length,
    writing_spelling = excluded.writing_spelling, writing_sign_off = excluded.writing_sign_off,
    writing_notes = excluded.writing_notes, writing_updated_at = excluded.writing_updated_at;
  return null;
end $$;

create function public.user_settings_from_account_setup() returns trigger language plpgsql as $$
begin
  insert into public.user_settings as s (user_id, updated_at, setup_step_at, setup_step_outcome, checklist_hidden_at,
    setup_defaults_at, setup_looking_for_at, country_guess, country_guess_from, region_guess)
  values (new.user_id, new.updated_at, new.step_at, new.step_outcome, new.checklist_hidden_at, new.defaults_at,
    new.looking_for_at, new.country_guess, new.country_from, new.region_guess)
  on conflict (user_id) do update set
    updated_at = greatest(s.updated_at, excluded.updated_at),
    setup_step_at = excluded.setup_step_at, setup_step_outcome = excluded.setup_step_outcome,
    checklist_hidden_at = excluded.checklist_hidden_at, setup_defaults_at = excluded.setup_defaults_at,
    setup_looking_for_at = excluded.setup_looking_for_at, country_guess = excluded.country_guess,
    country_guess_from = excluded.country_guess_from, region_guess = excluded.region_guess;
  return null;
end $$;

create function public.user_settings_from_career_log_settings() returns trigger language plpgsql as $$
begin
  insert into public.user_settings as s (user_id, updated_at, career_checkins, career_emails, career_week,
    career_weekday, career_time_zone, career_next_on, career_paused_until, career_job_role, career_job_company,
    career_last_month, career_last_at, career_emailed_month, career_emailed_at, career_prompt_closed_at,
    career_prompt_snoozed_at)
  values (new.user_id, new.updated_at, new.checkins, new.emails, new.week, new.weekday, new.time_zone,
    new.next_checkin_on, new.paused_until, new.job_role, new.job_company, new.last_checkin_month,
    new.last_checkin_at, new.emailed_month, new.emailed_at, new.prompt_closed_at, new.prompt_snoozed_at)
  on conflict (user_id) do update set
    updated_at = greatest(s.updated_at, excluded.updated_at),
    career_checkins = excluded.career_checkins, career_emails = excluded.career_emails,
    career_week = excluded.career_week, career_weekday = excluded.career_weekday,
    career_time_zone = excluded.career_time_zone, career_next_on = excluded.career_next_on,
    career_paused_until = excluded.career_paused_until, career_job_role = excluded.career_job_role,
    career_job_company = excluded.career_job_company, career_last_month = excluded.career_last_month,
    career_last_at = excluded.career_last_at, career_emailed_month = excluded.career_emailed_month,
    career_emailed_at = excluded.career_emailed_at, career_prompt_closed_at = excluded.career_prompt_closed_at,
    career_prompt_snoozed_at = excluded.career_prompt_snoozed_at;
  return null;
end $$;

create function public.user_settings_from_apply_answers() returns trigger language plpgsql as $$
begin
  insert into public.user_settings as s (user_id, updated_at, apply_answers, apply_answers_at)
  values (new.user_id, new.updated_at, new.answers, new.updated_at)
  on conflict (user_id) do update set
    updated_at = greatest(s.updated_at, excluded.updated_at),
    apply_answers = excluded.apply_answers, apply_answers_at = excluded.apply_answers_at;
  return null;
end $$;

create function public.user_settings_from_user_activity() returns trigger language plpgsql as $$
begin
  insert into public.user_settings as s (user_id, updated_at, active_on)
  values (new.user_id, (extract(epoch from now()) * 1000)::bigint, new.active_on)
  on conflict (user_id) do update set active_on = greatest(s.active_on, excluded.active_on);
  return null;
end $$;

-- Only ever run as triggers; on Supabase the Data API roles get no right to call them.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.user_settings_from_work_profiles(), public.user_settings_from_notification_settings(),
      public.user_settings_from_writing_styles(), public.user_settings_from_account_setup(),
      public.user_settings_from_career_log_settings(), public.user_settings_from_apply_answers(),
      public.user_settings_from_user_activity() from public, anon, authenticated;
  end if;
end $$;

create trigger to_user_settings after insert or update on public.work_profiles
  for each row execute function public.user_settings_from_work_profiles();
create trigger to_user_settings after insert or update on public.notification_settings
  for each row execute function public.user_settings_from_notification_settings();
create trigger to_user_settings after insert or update on public.writing_styles
  for each row execute function public.user_settings_from_writing_styles();
create trigger to_user_settings after insert or update on public.account_setup
  for each row execute function public.user_settings_from_account_setup();
create trigger to_user_settings after insert or update on public.career_log_settings
  for each row execute function public.user_settings_from_career_log_settings();
create trigger to_user_settings after insert or update on public.apply_answers
  for each row execute function public.user_settings_from_apply_answers();
create trigger to_user_settings after insert or update on public.user_activity
  for each row execute function public.user_settings_from_user_activity();

-- Every stored row goes through the same copy its trigger makes; no value in the old tables changes.
update public.work_profiles set updated_at = updated_at;
update public.account_setup set updated_at = updated_at;
update public.notification_settings set updated_at = updated_at;
update public.writing_styles set updated_at = updated_at;
update public.career_log_settings set updated_at = updated_at;
update public.apply_answers set updated_at = updated_at;
update public.user_activity set active_on = active_on;
