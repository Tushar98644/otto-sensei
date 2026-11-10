-- When the interview is, asked for (optionally) as a job moves into Interview on the
-- Applications board, and shown on its card and its page. Kept after the job moves on, so the
-- timeline still says when it was.
alter table public.applications
  add column interview_at bigint check (interview_at is null or interview_at > 0);
