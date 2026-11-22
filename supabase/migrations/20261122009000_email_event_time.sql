-- An interview email's time as it was written: minutes after midnight in event_zone (null for a day alone), so a card set from it keeps the time.
alter table public.inbound_emails
  add column event_time smallint,
  -- The IANA zone the email's day and time read in.
  add column event_zone text;

-- The next file validates it; every stored row has no time yet.
alter table public.inbound_emails
  add constraint inbound_emails_event_time_check
  check (event_time is null or event_time between 0 and 1439) not valid;
alter table public.inbound_emails
  add constraint inbound_emails_event_zone_check
  check (char_length(event_zone) <= 64) not valid;
