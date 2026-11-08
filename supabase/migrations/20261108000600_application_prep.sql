-- The interview prep pack for one application: likely questions, STAR outlines built from the
-- resume's own lines, and questions to ask. Written only by POST /api/interview, which validates
-- and caps it (InterviewPrepSchema in src/lib/insights/prep.ts); null until a pack is made.
-- The table already has RLS on with no policies, and rows are read by primary key plus user_id,
-- so the column needs no policy or index of its own.
alter table public.applications add column prep jsonb;
