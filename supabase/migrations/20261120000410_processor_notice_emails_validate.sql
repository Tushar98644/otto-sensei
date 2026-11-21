-- Every row already met the narrower rule, so this only records that the wider one holds.
alter table public.email_log validate constraint email_log_kind_check;
