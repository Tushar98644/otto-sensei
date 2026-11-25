-- The app's language, chosen in its settings and mirrored to the otto_lang cookie; null means never chosen.
alter table public.user_settings add column locale text;

alter table public.user_settings
  add constraint user_settings_locale_check
  check (locale is null or locale in ('en', 'es', 'pt-BR', 'fr', 'de')) not valid;
