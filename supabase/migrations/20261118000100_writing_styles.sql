-- Each account's saved writing style (src/lib/writing-style), applied to cover letters, answers
-- and outreach messages. No row means Otto's default style. Written by PUT /api/writing-style; the
-- checks repeat the API's choices and caps so no other writer can store what the app can't read.
create table public.writing_styles (
  user_id uuid primary key references public.users (id) on delete cascade,
  tone text not null default 'natural' check (tone in ('natural', 'warm', 'direct', 'formal')),
  length text not null default 'standard' check (length in ('standard', 'shorter')),
  spelling text not null default 'us' check (spelling in ('us', 'uk')),
  sign_off text not null default '' check (char_length(sign_off) <= 40),
  notes text not null default '' check (char_length(notes) <= 500),
  updated_at bigint not null
);

alter table public.writing_styles enable row level security;
