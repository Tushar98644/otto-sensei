-- Public share links (/s/<slug>): a frozen copy of one resume that anyone with the link can read
-- as a web page. Written only by the owner through /api/share; read by slug on the public page.

create table public.shares (
  id uuid primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  -- The resume's id in the owner's browser. Not a foreign key to resumes: a resume lives in the
  -- browser first, and its backup row may not exist yet when the link is made.
  resume_id text not null check (char_length(resume_id) between 1 and 64),
  -- Random letters and digits; the only secret in the link.
  slug text not null unique check (slug ~ '^[A-Za-z0-9]{10,32}$'),
  -- What the page shows: the resume without hidden lines or tailoring notes. Cleared when the link
  -- is turned off, so a revoked link keeps no copy of the resume.
  snapshot jsonb,
  -- Email and phone appear on the page only when the owner turns this on.
  show_contact boolean not null default false,
  -- Off: the page asks search engines not to index it.
  allow_indexing boolean not null default false,
  views integer not null default 0 check (views >= 0),
  last_viewed_at bigint,
  created_at bigint not null,
  updated_at bigint not null,
  revoked_at bigint,
  check (revoked_at is not null or snapshot is not null)
);

-- The owner's list, newest first, read straight off the index.
create index shares_user_created_idx on public.shares (user_id, created_at desc, id desc);
-- One live link per resume: sharing it again updates that link instead of making a second one.
create unique index shares_user_resume_live_idx
  on public.shares (user_id, resume_id)
  where revoked_at is null;

alter table public.shares enable row level security;
