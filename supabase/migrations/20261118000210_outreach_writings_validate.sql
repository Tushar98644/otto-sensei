-- Checks every stored writing against the kind rule the last file widened.
alter table public.writings validate constraint writings_kind_check;
