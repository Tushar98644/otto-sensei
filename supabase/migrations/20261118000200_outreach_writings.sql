-- Outreach messages (an email subject, the email and a LinkedIn note, written on the Jobs tab or an
-- application's page) are kept like cover letters and answers, so a reload no longer loses them.
-- The email is the row's body; the subject and note get their own columns. The checks repeat the
-- caps in src/lib/writings/schema.ts so no other writer can store more.
alter table public.writings
  add column subject text not null default '' check (char_length(subject) <= 200);
alter table public.writings
  add column note text not null default '' check (char_length(note) <= 1000);

-- The opening a message was written for, so reopening it on the Jobs tab finds the message. Not a
-- foreign key: a job's row is deleted 30 days after it closes while the message stays, and saving
-- a message never has to lock the busy jobs table.
alter table public.writings add column job_id uuid;

-- Takes the new kind. Every stored row passes the wider rule, which the next file validates.
-- squawk-ignore ban-drop-constraint
alter table public.writings drop constraint writings_kind_check;
alter table public.writings add constraint writings_kind_check
  check (kind in ('letter', 'answer', 'outreach')) not valid;
