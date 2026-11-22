-- Checks every stored row against the rules the last file added.
alter table public.applications validate constraint applications_status_check;
alter table public.applications validate constraint applications_stage_reached_check;
alter table public.inbound_emails validate constraint inbound_emails_from_status_check;
alter table public.inbound_emails validate constraint inbound_emails_to_status_check;
