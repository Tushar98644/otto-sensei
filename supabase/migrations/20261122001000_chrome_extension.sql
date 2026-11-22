-- Otto for Chrome (src/lib/extension): one row per connected browser. Only the token's SHA-256 is kept, so this table can't sign anyone in.
create table public.extension_tokens (
  id uuid primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  token_hash text not null unique check (char_length(token_hash) = 43),
  scope text not null default 'extension' check (scope = 'extension'),
  created_at bigint not null,
  last_used_at bigint not null,
  expires_at bigint not null
);

alter table public.extension_tokens enable row level security;

create index extension_tokens_user_idx on public.extension_tokens (user_id, created_at);
create index extension_tokens_expires_idx on public.extension_tokens (expires_at);

-- Job posts saved from the extension, with a copy of the post because posts get taken down. Each waits in To apply until an application uses its link.
create table public.saved_posts (
  id uuid primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  url text not null check (char_length(url) <= 2048),
  -- SHA-256 of the canonical link, so the same job saved twice is one row.
  url_key text not null check (char_length(url_key) = 43),
  site text not null default 'other' check (char_length(site) <= 40),
  title text not null default '' check (char_length(title) <= 200),
  company text not null default '' check (char_length(company) <= 200),
  location text not null default '' check (char_length(location) <= 200),
  post text not null default '' check (char_length(post) <= 20000),
  saved_at bigint not null,
  updated_at bigint not null,
  unique (user_id, url_key)
);

alter table public.saved_posts enable row level security;

create index saved_posts_user_saved_idx on public.saved_posts (user_id, saved_at desc);
