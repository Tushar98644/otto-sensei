-- Work profile: the few facts that decide whether a job can hire someone from where they are.
-- One row per account, written by PUT /api/profile and read by the job post eligibility check.

create table public.work_profiles (
  user_id uuid primary key references public.users (id) on delete cascade,
  -- ISO 3166-1 alpha-2 code of the country the person lives in, '' when not set.
  country text not null default '' check (country = '' or country ~ '^[A-Z]{2}$'),
  -- IANA time zone, e.g. 'Europe/Berlin'. '' when not set.
  time_zone text not null default '',
  -- Per region: 'authorized' (may work there without a sponsored visa), 'sponsorship' (would
  -- need an employer to sponsor one), or null when not answered.
  work_us text check (work_us in ('authorized', 'sponsorship')),
  work_uk text check (work_uk in ('authorized', 'sponsorship')),
  work_eu text check (work_eu in ('authorized', 'sponsorship')),
  work_ca text check (work_ca in ('authorized', 'sponsorship')),
  full_time boolean not null default true,
  contract boolean not null default true,
  created_at bigint not null,
  updated_at bigint not null
);

alter table public.work_profiles enable row level security;
