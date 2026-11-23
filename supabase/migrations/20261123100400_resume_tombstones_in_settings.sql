-- Deleted resume ids move onto the account's user_settings row as {"<id>": deletedAt}; a trigger copies the old app's writes until 20261123100900 drops resume_tombstones.
alter table public.user_settings add column deleted_resumes jsonb;

alter table public.user_settings
  add constraint user_settings_deleted_resumes_check
  check (deleted_resumes is null or jsonb_typeof(deleted_resumes) = 'object') not valid;

lock table public.resume_tombstones in share row exclusive mode;

create function public.user_settings_from_resume_tombstones() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    update public.user_settings
    set deleted_resumes = deleted_resumes - old.id
    where user_id = old.user_id and (deleted_resumes ->> old.id)::bigint = old.deleted_at;
    return null;
  end if;
  insert into public.user_settings as s (user_id, updated_at, deleted_resumes)
  values (new.user_id, new.deleted_at, jsonb_build_object(new.id, new.deleted_at))
  on conflict (user_id) do update set deleted_resumes = coalesce(s.deleted_resumes, '{}') || excluded.deleted_resumes;
  return null;
end $$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.user_settings_from_resume_tombstones() from public, anon, authenticated;
  end if;
end $$;

create trigger to_user_settings after insert or update or delete on public.resume_tombstones
  for each row execute function public.user_settings_from_resume_tombstones();

-- Every stored row goes through the same copy its trigger makes; no value in the old table changes.
update public.resume_tombstones set deleted_at = deleted_at;
