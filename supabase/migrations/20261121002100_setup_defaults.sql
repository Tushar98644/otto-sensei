-- First-login guesses (src/lib/setup/defaults.ts): when each ran, so it runs once, and what the country guess was, so Account can say so.
alter table public.account_setup add column defaults_at bigint;
alter table public.account_setup add column looking_for_at bigint;
alter table public.account_setup
  add column country_guess text check (char_length(country_guess) = 2);
alter table public.account_setup
  add column country_from text check (country_from in ('resume', 'device'));
alter table public.account_setup
  add column region_guess text check (region_guess in ('us', 'uk', 'eu', 'ca'));
