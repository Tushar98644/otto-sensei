-- Jobs in one compact table (docs/database.md): listings replaces jobs and job_match, titles replaces
-- title_vectors. Open jobs are copied in here; saved jobs, applications and messages move to the new ids
-- and keep a snapshot of their job. The old tables stay, untouched, until 20261124120900 drops them,
-- so the old app runs through the deploy. Job rows are derived data: what SQL can't compute exactly
-- (title keys of non-lead copies, compact work-rights facts) the first rebuild after this finishes.
set local statement_timeout = '10min';

-- The same hashes as src/lib/job-feed/codes.ts: the top bits of sha256.
create function pg_temp.top_bits(value text, skip integer) returns bigint
  language sql immutable as $$
    select (('x' || encode(substr(sha256(convert_to(value, 'UTF8')), 1, 8), 'hex'))::bit(64) >> skip)::bigint
  $$;

create function pg_temp.pack_occupation(code text) returns integer
  language sql immutable as $$
    select case when code ~ '^\d{2}-[0-9X]\d{3}\.\d{2}$' then
      substr(code, 1, 2)::integer * 10000000
        + (case substr(code, 4, 1) when 'X' then 10 else substr(code, 4, 1)::integer end) * 100000
        + substr(code, 5, 3)::integer * 100 + substr(code, 9, 2)::integer
      else 0 end
  $$;

-- A listing's id: its board in the top bits, then 38 bits of the hash of board and job id.
create function public.compact_job_id(board smallint, ext text) returns bigint
  language sql immutable as $$
    select (board::bigint << 38)
      | ((('x' || encode(substr(sha256(convert_to(board::text || ':' || ext, 'UTF8')), 1, 8), 'hex'))::bit(64) >> 26)::bigint)
  $$;

-- The public id: the number in a UUID's shape (src/lib/job-feed/codes.ts publicJobId).
create function public.compact_job_uuid(id bigint) returns uuid
  language sql immutable as $$
    select ('00000000-0000-4' || substr(h, 1, 3) || '-8' || substr(h, 4, 3) || '-' || substr(h, 7, 12))::uuid
    from (select lpad(to_hex(id), 18, '0') as h) hex
  $$;

-- The id a board's job keeps relative to its board: a Workday id without its tenant and site.
create function public.compact_job_ext(source text, token text, external_id text) returns text
  language sql immutable as $$
    select case
      when source = 'workday' and starts_with(external_id,
        split_part(split_part(token, '/', 1), '.', 1) || '/' || split_part(token, '/', 2))
      then substr(external_id,
        length(split_part(split_part(token, '/', 1), '.', 1) || '/' || split_part(token, '/', 2)) + 1)
      else external_id end
  $$;

create sequence public.job_boards_id_seq as smallint;
-- job_boards holds about 1,200 rows, so filling the column rewrites it in milliseconds.
alter table public.job_boards
  -- squawk-ignore adding-field-with-default
  add column id smallint not null default nextval('public.job_boards_id_seq'),
  -- A job's link with its own id as {id}, when the board's links follow one pattern.
  add column url_template text not null default '' check (char_length(url_template) <= 2048);
alter sequence public.job_boards_id_seq owned by public.job_boards.id;
create unique index job_boards_id_key on public.job_boards (id);

update public.job_boards b set url_template = t.template
from (
  select distinct on (source, board) source, board, template
  from (
    select j.source, coalesce(nullif(j.board, ''), 'feed') as board,
      replace(j.url, e.ext, '{id}') as template
    from public.jobs j
    cross join lateral (select public.compact_job_ext(j.source, j.board, j.external_id) as ext) e
    where j.closed_at is null and e.ext <> '' and strpos(j.url, e.ext) > 0
  ) fits
  group by source, board, template
  order by source, board, count(*) desc, template
) t
where t.source = b.source and t.board = b.token;

create table public.titles (
  -- The top 53 bits of sha256 of the title's key (titleVectorKey).
  id bigint primary key check (id >= 0),
  -- As first written: a job whose title is written otherwise keeps its own in listings.title_text.
  text text not null check (char_length(text) between 1 and 300),
  -- 64 bytes (src/lib/job-feed/title-code.ts); 256 for a vector kept from title_vectors until the next rebuild.
  code bytea check (octet_length(code) in (64, 256)),
  -- Its nearest occupation (packed O*NET code) and how near, times 10,000.
  occ integer check (occ >= 0),
  sim smallint check (sim between -10000 and 10000),
  -- The day (since 1970) a job or a person's chosen role last carried it.
  seen integer not null
);
create index titles_waiting_idx on public.titles (seen) where code is null;
alter table public.titles enable row level security;

insert into public.titles (id, text, code, occ, sim, seen)
select pg_temp.top_bits(key, 11), key, vec, nullif(pg_temp.pack_occupation(occs[1]), 0),
  round(sims[1] * 10000)::smallint, (seen_at / 86400000)::integer
from public.title_vectors;

-- Each open job's title key: the rebuild's own for leads, the same steps in SQL for the rest.
create temporary table compact_keys on commit drop as
select j.id, coalesce(nullif(m.tkey, ''), left(lower(btrim(regexp_replace(j.title, '\s+', ' ', 'g'))), 120)) as key
from public.jobs j
left join public.job_match m on m.id = j.id
where j.closed_at is null;

-- Seen on day 0: a key SQL got wrong goes at the first rebuild, once no listing carries it.
insert into public.titles (id, text, seen)
select pg_temp.top_bits(k.key, 11), min(j.title), 0
from compact_keys k join public.jobs j on j.id = k.id
where k.key <> ''
group by k.key
on conflict (id) do nothing;

update public.titles t set text = c.text
from (
  select pg_temp.top_bits(k.key, 11) as id, min(j.title) as text
  from compact_keys k join public.jobs j on j.id = k.id
  where k.key <> ''
  group by k.key
) c
where c.id = t.id and t.text is distinct from c.text;

-- The openings the last rebuild found, and how many fresh copies each has (as the rebuild counts them).
create temporary table compact_groups on commit drop as
select coalesce(nullif(group_key, ''), id::text) as grp, count(*) as copies
from public.jobs
where closed_at is null and not evergreen
  and least(posted_at, first_seen_at) >= (extract(epoch from now()) * 1000)::bigint - 90 * 86400000::bigint
group by 1;

-- A skill every open post names gets its id now, so listings can hold ids only.
insert into public.skills as s (skill, sid, updated_at)
select skill, (select coalesce(max(sid), 0) from public.skills) + row_number() over (order by skill),
  (extract(epoch from now()) * 1000)::bigint
from (select distinct unnest(keywords) as skill from public.jobs where closed_at is null) named
where not exists (select 1 from public.skills k where k.skill = named.skill and k.sid is not null)
on conflict (skill) do update set sid = excluded.sid where s.sid is null;

create table public.listings (
  id bigint primary key check (id > 0),
  title bigint not null,
  dedupe bigint not null,
  -- Minutes since 1970; valid 0 is no end date.
  posted integer not null,
  seen integer not null,
  valid integer not null default 0 check (valid >= 0),
  grp integer not null,
  hash integer not null,
  occ integer not null default 0 check (occ >= 0),
  board smallint not null references public.job_boards (id) on delete cascade,
  level smallint not null check (level between 0 and 5),
  family smallint not null default 0 check (family between 0 and 11),
  min_years smallint not null default 0 check (min_years between 0 and 20),
  flags smallint not null default 0 check (flags >= 0),
  missed smallint not null default 0 check (missed >= 0),
  ext text not null check (char_length(ext) between 1 and 300),
  title_text text not null default '' check (char_length(title_text) <= 200),
  location text not null default '' check (char_length(location) <= 300),
  places text not null default '' check (char_length(places) <= 2000),
  oplaces text not null default '' check (char_length(oplaces) <= 2000),
  company text not null default '' check (char_length(company) <= 200),
  url text not null default '' check (char_length(url) <= 2048),
  facts text not null default '' check (char_length(facts) <= 2000),
  skills smallint[] not null default '{}',
  -- Only the sources whose posts can't be read again (Himalayas, Remote OK), at most 6,000 characters.
  post text not null default '' check (char_length(post) <= 6000)
) with (autovacuum_vacuum_scale_factor = 0.02, autovacuum_vacuum_threshold = 1000);
alter table public.listings enable row level security;

-- flags: 1 remote, 2 general application, 4 lead of its opening, 8 opening remote, 16 copy of a lead,
-- 32 has copies, then the job type (1 + its index in EMPLOYMENT_TYPES) from bit 6.
-- facts: chr(1) and the old rules_text until the rebuild reads it into compact facts.
insert into public.listings (id, title, dedupe, posted, seen, valid, grp, hash, occ, board, level,
  family, min_years, flags, missed, ext, title_text, location, places, company, url, facts, skills, post)
select
  public.compact_job_id(b.id, e.ext),
  t.id,
  (('x' || j.dedupe_key)::bit(64) >> 11)::bigint,
  (j.posted_at / 60000)::integer,
  (j.first_seen_at / 60000)::integer,
  coalesce(j.valid_through / 60000, 0)::integer,
  ('x' || left(coalesce(nullif(j.group_key, ''), md5(j.id::text)), 8))::bit(32)::integer,
  ('x' || encode(substr(decode(translate(left(j.content_hash, 8), '-_', '+/'), 'base64'), 1, 4), 'hex'))::bit(32)::integer,
  pg_temp.pack_occupation(case when m.id is not null then m.occ else j.occupation end),
  b.id,
  array_position(array['intern', 'junior', 'mid', 'senior', 'lead', 'director']::text[], j.seniority) - 1,
  coalesce(array_position(array['engineering', 'data', 'design', 'product', 'marketing', 'sales',
    'support', 'operations', 'people', 'finance', 'legal']::text[],
    case when m.id is not null then m.family else j.family end), 0),
  coalesce(j.min_years, 0),
  (case when j.remote then 1 else 0 end)
    | (case when j.evergreen then 2 else 0 end)
    | (case when m.id is not null then 4 else 0 end)
    | (case when m.remote then 8 else 0 end)
    | (case when o.id is not null and o.id <> j.id and not j.evergreen
        and least(j.posted_at, j.first_seen_at) >= (extract(epoch from now()) * 1000)::bigint - 90 * 86400000::bigint
        then 16 else 0 end)
    | (case when m.id is not null and o.copies > 1 then 32 else 0 end)
    | (coalesce(array_position(array['full_time', 'part_time', 'contract', 'internship', 'temporary']::text[], j.employment_type), 0) << 6),
  j.missed_runs,
  e.ext,
  case when j.title = t.text then '' else j.title end,
  j.location,
  coalesce(array_to_string(o.places, ' '), ''),
  case when j.company = b.company then '' else j.company end,
  case when b.url_template <> '' and replace(b.url_template, '{id}', e.ext) = j.url then '' else j.url end,
  chr(1) || j.rules_text,
  coalesce(array(
    select s.sid::smallint from unnest(j.keywords) with ordinality as k(skill, n)
    join public.skills s on s.skill = k.skill order by k.n), '{}'),
  case when j.source in ('himalayas', 'remoteok') then j.description else '' end
from public.jobs j
join public.job_boards b on b.source = j.source and b.token = coalesce(nullif(j.board, ''), 'feed')
join compact_keys k on k.id = j.id
join public.titles t on t.id = pg_temp.top_bits(k.key, 11)
cross join lateral (select public.compact_job_ext(j.source, j.board, j.external_id) as ext) e
left join public.job_match m on m.id = j.id
left join (
  select g.grp, g.id, g.places, coalesce(c.copies, 1) as copies
  from public.job_match g left join compact_groups c on c.grp = g.grp
) o on o.grp = coalesce(nullif(j.group_key, ''), j.id::text)
where j.closed_at is null and e.ext <> ''
on conflict (id) do nothing;

create index listings_copies_idx on public.listings (board, grp) where (flags & 16) <> 0;
create index listings_valid_idx on public.listings (valid) where valid > 0;
-- The few links no board pattern rebuilds, to link an application by its link.
create index listings_url_idx on public.listings (url) where url <> '';

-- What a saved job or an application keeps of its job once the job is gone (JobSnapshot).
create function public.compact_job_snapshot(j public.jobs) returns jsonb
  language sql stable as $$
    select jsonb_build_object('source', j.source, 'company', j.company, 'title', j.title,
      'location', j.location, 'remote', j.remote, 'employmentType', j.employment_type,
      'seniority', j.seniority, 'postedAt', j.posted_at, 'url', j.url, 'keywords', to_jsonb(j.keywords))
  $$;

-- The new id of an old job, null when its board is gone.
create function public.compact_job_ref(old uuid) returns uuid
  language sql stable as $$
    select public.compact_job_uuid(public.compact_job_id(b.id, public.compact_job_ext(j.source, j.board, j.external_id)))
    from public.jobs j
    join public.job_boards b on b.source = j.source and b.token = coalesce(nullif(j.board, ''), 'feed')
    where j.id = old
  $$;

-- A job a saved job or an application names is deleted when it closes; each keeps a snapshot instead.
-- squawk-ignore ban-drop-constraint
alter table public.saved_jobs drop constraint saved_jobs_job_id_fkey;
-- squawk-ignore ban-drop-constraint
alter table public.applications drop constraint applications_job_id_fkey;
alter table public.saved_jobs add column job jsonb;
alter table public.applications add column job jsonb;

update public.saved_jobs s
set job = public.compact_job_snapshot(j), job_id = coalesce(public.compact_job_ref(j.id), s.job_id)
from public.jobs j where j.id = s.job_id;

update public.applications a
set job = public.compact_job_snapshot(j), job_id = coalesce(public.compact_job_ref(j.id), a.job_id)
from public.jobs j where j.id = a.job_id;

update public.writings w
set job_id = coalesce(public.compact_job_ref(w.job_id), w.job_id)
where w.job_id is not null and exists (select 1 from public.jobs j where j.id = w.job_id);

-- The old app still writes old ids during the deploy: each is moved to its new id, with the snapshot.
create function public.compact_job_refs() returns trigger language plpgsql as $$
declare
  old_job public.jobs;
begin
  if new.job_id is null then
    return new;
  end if;
  select * into old_job from public.jobs where id = new.job_id;
  if not found then
    return new;
  end if;
  if tg_table_name in ('saved_jobs', 'applications') then
    new.job := public.compact_job_snapshot(old_job);
  end if;
  new.job_id := coalesce(public.compact_job_ref(old_job.id), new.job_id);
  return new;
end $$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.compact_job_refs(), public.compact_job_ref(uuid),
      public.compact_job_snapshot(public.jobs), public.compact_job_id(smallint, text),
      public.compact_job_uuid(bigint), public.compact_job_ext(text, text, text)
      from public, anon, authenticated;
  end if;
end $$;

create trigger compact_job_refs before insert or update of job_id on public.saved_jobs
  for each row execute function public.compact_job_refs();
create trigger compact_job_refs before insert or update of job_id on public.applications
  for each row execute function public.compact_job_refs();
create trigger compact_job_refs before insert or update of job_id on public.writings
  for each row execute function public.compact_job_refs();

drop index public.saved_jobs_job_idx;
