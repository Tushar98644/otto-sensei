-- Cover letters and answers to application questions an account keeps, listed on
-- /dashboard/letters. Written only by the owner through /api/writings, which validates and caps
-- every field (src/lib/writings/schema.ts); the checks below repeat the caps so no other writer
-- can store more. Letters kept on tailored copies (resumes.data -> tailor.coverLetter) stay there.

create table public.writings (
  id uuid primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  kind text not null check (kind in ('letter', 'answer')),
  -- The resume's id in the owner's browser. Not a foreign key: a resume lives in the browser
  -- first, and its backup row may not exist yet, or may be deleted while the letter is kept.
  resume_id text check (resume_id is null or char_length(resume_id) between 1 and 64),
  resume_title text not null default '' check (char_length(resume_title) <= 200),
  company text not null default '' check (char_length(company) <= 200),
  role text not null default '' check (char_length(role) <= 200),
  job_url text not null default '' check (char_length(job_url) <= 2048),
  -- Answers only: the question from the application form.
  question text not null default '' check (char_length(question) <= 500),
  body text not null check (char_length(body) between 1 and 5000),
  warnings jsonb not null default '[]'::jsonb check (jsonb_typeof(warnings) = 'array'),
  demo boolean not null default false,
  created_at bigint not null,
  updated_at bigint not null
);

-- The owner's list, newest first, read straight off the index.
create index writings_user_created_idx on public.writings (user_id, created_at desc, id desc);

-- Rows are read and written only by the server, always filtered by user_id: RLS on with no
-- policies keeps the anon and authenticated keys out entirely, like every other table.
alter table public.writings enable row level security;
