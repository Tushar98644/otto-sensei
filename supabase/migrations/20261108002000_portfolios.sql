-- Portfolios (/p/<slug>): one public page per account, made from one of its resumes and shown in a
-- web template. Written only by the owner through /api/portfolio; read by slug on the public page.

create table public.portfolios (
  id uuid primary key,
  -- One portfolio per account, on every plan.
  user_id uuid not null unique references public.users (id) on delete cascade,
  -- The resume's id in the owner's browser. Not a foreign key, like shares.resume_id: a resume
  -- lives in the browser first, and its backup row may not exist yet.
  resume_id text not null check (char_length(resume_id) between 1 and 64),
  -- The address the owner picked: lowercase words joined by single hyphens (src/lib/portfolio/slug.ts
  -- also blocks reserved words).
  slug text not null unique
    check (char_length(slug) between 3 and 40 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  template text not null default 'minimal' check (template in ('minimal', 'studio', 'developer')),
  -- What the page shows: the resume as its PDF prints it, without tailoring notes. Email and phone
  -- stay in it and are left out when the page renders unless the owner turned them on.
  snapshot jsonb not null,
  show_email boolean not null default false,
  show_phone boolean not null default false,
  -- Page sections the owner hid (about, projects, experience, ...).
  hidden_sections text[] not null default '{}' check (cardinality(hidden_sections) <= 8),
  -- On: every backup of the resume refreshes the snapshot.
  sync boolean not null default true,
  published boolean not null default false,
  -- Off: the page asks search engines not to index it.
  allow_indexing boolean not null default false,
  -- Only honoured while the owner is on a paid plan.
  hide_credit boolean not null default false,
  -- A total and nothing else: nothing about who looked is kept.
  views integer not null default 0 check (views >= 0),
  created_at bigint not null,
  updated_at bigint not null,
  published_at bigint
);

-- Every backup of a resume looks for the portfolio made from it.
create index portfolios_user_resume_idx on public.portfolios (user_id, resume_id);

-- Old addresses after a change keep pointing at the portfolio for a while. A slug lives in at
-- most one of the two tables at a time; the app checks both before handing one out.
create table public.portfolio_redirects (
  slug text primary key check (char_length(slug) between 3 and 40),
  portfolio_id uuid not null references public.portfolios (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  created_at bigint not null,
  expires_at bigint not null
);

create index portfolio_redirects_portfolio_idx
  on public.portfolio_redirects (portfolio_id, created_at desc);

alter table public.portfolios enable row level security;
alter table public.portfolio_redirects enable row level security;
