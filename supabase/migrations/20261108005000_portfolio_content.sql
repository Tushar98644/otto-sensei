-- Portfolio content: what the rich templates show beyond the resume (photo, pitch, "now", stats,
-- project media, logos, talks, writing, testimonials, interests...), the GitHub numbers they draw,
-- and the pictures owners upload for them. Shape and limits: src/lib/portfolio/content.ts.

-- Only what the owner changed; everything left out is filled in from the resume when the page
-- renders. Versioned inside the document ("v"), checked by the app on every write and read.
alter table public.portfolios
  add column content jsonb not null default '{}'::jsonb
  check (jsonb_typeof(content) = 'object' and pg_column_size(content) <= 262144);

-- The account's public GitHub numbers (src/lib/github/stats.ts), refreshed by the server at most
-- every few hours, so a page view never waits on GitHub.
alter table public.portfolios
  add column github jsonb check (github is null or jsonb_typeof(github) = 'object');
alter table public.portfolios add column github_checked_at bigint;

-- Uploaded pictures. The files live in the Supabase Storage bucket "portfolio-media" (public read,
-- written only by the server with the secret key; see SETUP.md), at key "<user id>/<id>.webp".
-- A row exists for every stored file, so the per-account caps and every delete can find them.
create table public.portfolio_media (
  id uuid primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  key text not null unique check (char_length(key) between 10 and 120),
  kind text not null check (kind in ('photo', 'screenshot', 'personal', 'logo', 'avatar')),
  -- Every upload is re-encoded to WebP on the server.
  content_type text not null check (content_type = 'image/webp'),
  bytes integer not null check (bytes > 0 and bytes <= 8388608),
  width integer not null check (width between 1 and 10000),
  height integer not null check (height between 1 and 10000),
  created_at bigint not null,
  -- When the saved content stopped using it (a fresh upload starts detached). Null while in use.
  -- Detached files are deleted after a grace period, which is what lets Undo bring one back.
  detached_at bigint
);

create index portfolio_media_user_idx on public.portfolio_media (user_id, created_at);
create index portfolio_media_detached_idx on public.portfolio_media (user_id, detached_at)
  where detached_at is not null;

alter table public.portfolio_media enable row level security;
