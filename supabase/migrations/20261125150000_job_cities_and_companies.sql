-- Each job's city (a GeoNames id, 0 for none): a stored default, so no row is rewritten here; the next match index rebuild fills it.
alter table public.listings add column city integer not null default 0;

-- Each employer with open jobs, rebuilt with the match index (src/lib/job-feed/companies.ts).
create table public.companies (
  board smallint not null,
  company text not null,
  name text not null,
  city integer not null default 0,
  roles integer not null,
  remote integer not null default 0,
  hybrid integer not null default 0,
  newest integer not null,
  primary key (board, company)
);

alter table public.companies enable row level security;
