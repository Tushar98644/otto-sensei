-- One row per skill that posts name (src/lib/job-feed): the small id the match index stores for it and its rarity weight. Triggers copy the old app's writes until 20261123130900 drops job_skills and match_skills.
create table public.skills (
  skill text primary key,
  -- Given when an indexed opening first names the skill and never changed, since job_match.sids holds it.
  sid integer unique check (sid > 0),
  -- Open posts that name it and its IDF weight: 0 and null once none does.
  open_jobs integer not null default 0 check (open_jobs >= 0),
  weight real check (weight >= 0),
  updated_at bigint not null,
  check ((open_jobs > 0) = (weight is not null))
);

alter table public.skills enable row level security;

lock table public.job_skills, public.match_skills in share row exclusive mode;

create function public.skills_from_match_skills() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    update public.skills set sid = null where skill = old.skill and sid = old.sid;
    return null;
  end if;
  -- A skill keeps the id it already has, and an id the new app gave another skill stays with that one.
  begin
    insert into public.skills as s (skill, sid, updated_at)
    values (new.skill, new.sid, (extract(epoch from clock_timestamp()) * 1000)::bigint)
    on conflict (skill) do update set sid = excluded.sid where s.sid is null;
  exception when unique_violation then
    null;
  end;
  return null;
end $$;

create function public.skills_from_job_skills() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    update public.skills set open_jobs = 0, weight = null where skill = old.skill;
    return null;
  end if;
  insert into public.skills as s (skill, open_jobs, weight, updated_at)
  values (new.skill, new.open_jobs, new.weight, new.updated_at)
  on conflict (skill) do update set
    open_jobs = excluded.open_jobs, weight = excluded.weight, updated_at = excluded.updated_at;
  return null;
end $$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.skills_from_match_skills(), public.skills_from_job_skills()
      from public, anon, authenticated;
  end if;
end $$;

create trigger to_skills after insert or update or delete on public.match_skills
  for each row execute function public.skills_from_match_skills();
create trigger to_skills after insert or update or delete on public.job_skills
  for each row execute function public.skills_from_job_skills();

-- Every stored row goes through the same copy its trigger makes; no value in the old tables changes.
update public.match_skills set sid = sid;
update public.job_skills set updated_at = updated_at;
