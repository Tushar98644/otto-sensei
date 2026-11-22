-- Checks every stored row against the rules the last file added.
alter table public.inbound_emails validate constraint inbound_emails_event_time_check;
alter table public.inbound_emails validate constraint inbound_emails_event_zone_check;
