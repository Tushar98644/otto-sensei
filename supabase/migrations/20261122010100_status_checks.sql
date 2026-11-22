-- The statuses the app reads (src/lib/applications/status.ts). Rows are first stored as readStatus and readStage already read them, so no later write to an old row trips the check; the next file validates them.
update public.applications
set status = case when status = 'screening' then 'interview' else status end,
    stage_reached = case
      when stage_reached = 'screening' then 'interview'
      when stage_reached in ('applied', 'interview', 'offer') then stage_reached
      else 'applied'
    end
where status = 'screening' or stage_reached not in ('applied', 'interview', 'offer');

alter table public.applications
  add constraint applications_status_check
  check (status in ('applied', 'interview', 'offer', 'rejected', 'no_reply')) not valid;
alter table public.applications
  add constraint applications_stage_reached_check
  check (stage_reached in ('applied', 'interview', 'offer')) not valid;
alter table public.inbound_emails
  add constraint inbound_emails_from_status_check
  check (from_status in ('applied', 'interview', 'offer', 'rejected', 'no_reply')) not valid;
alter table public.inbound_emails
  add constraint inbound_emails_to_status_check
  check (to_status in ('applied', 'interview', 'offer', 'rejected', 'no_reply')) not valid;
