import { and, count, desc, eq, gte, inArray, isNull, max, or, sql, type SQL } from "drizzle-orm";
import type { Db } from "@/db/client";
import { lockUser } from "@/db/locks";
import { jobBoards, jobSkills, jobs, savedJobs } from "@/db/schema";
import { searchWords } from "./normalize";
import { ORDER_LIMITS } from "./order";
import {
  DEFAULT_FILTERS,
  JOB_PAGE_SIZE,
  LEVEL_SENIORITIES,
  SAVED_JOBS_LIMIT,
  SENIORITIES,
  type FeedJob,
  type JobFilters,
  type RoleFamily,
  type Seniority,
} from "./types";

// Server-only. Reading jobs for the lists, and each account's saved jobs. Lists read open jobs
// through jobs_open_posted_idx; a match request scores every open job that shares a skill or a
// kind of role with the resume, in SQL, and reads back only the best few hundred.

const DAY_MS = 24 * 60 * 60 * 1_000;
// Openings one match request ranks: the best this many by skill-weighted overlap, out of every
// open job (one per group of location copies). Work-rights rules cost about half a millisecond a
// job, so this also bounds a request.
export const CANDIDATE_POOL = 300;
// Open this long, a post is treated like a "general application" one: hidden from Matches.
export const EVERGREEN_AFTER_MS = 120 * DAY_MS;
// Weight of a skill job_skills doesn't know yet (before the first ingest, and in tests).
export const DEFAULT_SKILL_WEIGHT = 1;
// A post two or more levels above the latest title can only be a Stretch; it still makes the
// pool, just after close-level ones with the same overlap.
const LEVEL_UP_FACTOR = 0.5;

const LIST_COLUMNS = {
  id: jobs.id,
  source: jobs.source,
  company: jobs.company,
  title: jobs.title,
  location: jobs.location,
  remote: jobs.remote,
  employmentType: jobs.employmentType,
  seniority: jobs.seniority,
  postedAt: jobs.postedAt,
  url: jobs.url,
  keywords: jobs.keywords,
  closedAt: jobs.closedAt,
};

type ListRow = { [K in keyof typeof LIST_COLUMNS]: (typeof jobs.$inferSelect)[K] };

export function toFeedJob(row: ListRow): FeedJob {
  return {
    id: row.id,
    source: row.source,
    company: row.company,
    title: row.title,
    location: row.location,
    remote: row.remote,
    employmentType: row.employmentType,
    seniority: row.seniority,
    postedAt: row.postedAt,
    url: row.url,
    keywords: row.keywords,
    closed: row.closedAt !== null,
  };
}

// Prefix search on whole words: "front" finds "Frontend". Only letters and digits reach the
// query, so nothing typed can be tsquery syntax.
function wordsQuery(input: string): string | null {
  const words = searchWords(input).split(" ").filter(Boolean).slice(0, 6);
  return words.length === 0 ? null : words.map((word) => `${word}:*`).join(" & ");
}

function filterConditions(filters: JobFilters, now: number): SQL[] {
  const conditions: SQL[] = [isNull(jobs.closedAt)];
  if (filters.remote) conditions.push(eq(jobs.remote, true));
  for (const text of [filters.q, filters.place]) {
    const query = wordsQuery(text);
    if (query) conditions.push(sql`${jobs.search} @@ to_tsquery('simple', ${query})`);
  }
  if (filters.role) conditions.push(eq(jobs.family, filters.role));
  if (filters.level)
    conditions.push(inArray(jobs.seniority, [...LEVEL_SENIORITIES[filters.level]]));
  if (filters.postedWithin)
    conditions.push(gte(jobs.postedAt, now - filters.postedWithin * DAY_MS));
  return conditions;
}

/** One page of the newest open jobs: the public /jobs list. */
export async function listJobs(
  db: Db,
  filters: JobFilters,
  page: number,
  now = Date.now(),
): Promise<{ jobs: FeedJob[]; hasMore: boolean }> {
  const rows = await db
    .select(LIST_COLUMNS)
    .from(jobs)
    .where(and(...filterConditions(filters, now)))
    .orderBy(desc(jobs.postedAt), desc(jobs.id))
    .limit(JOB_PAGE_SIZE + 1)
    .offset((page - 1) * JOB_PAGE_SIZE);
  return {
    jobs: rows.slice(0, JOB_PAGE_SIZE).map(toFeedJob),
    hasMore: rows.length > JOB_PAGE_SIZE,
  };
}

export type CandidateRow = ListRow & {
  family: RoleFamily | null;
  minYears: number | null;
  rulesText: string;
  firstSeenAt: number;
  groupKey: string;
};

const CANDIDATE_COLUMNS = {
  ...LIST_COLUMNS,
  family: jobs.family,
  minYears: jobs.minYears,
  rulesText: jobs.rulesText,
  firstSeenAt: jobs.firstSeenAt,
  groupKey: jobs.groupKey,
};

// Another place the same opening is posted, for the card's "also in" and the work-rights check.
export type CopyRow = ListRow & { rulesText: string; groupKey: string };

export type MatchQuery = {
  skills: readonly string[];
  families: readonly RoleFamily[];
  seniority: Seniority | null;
  filters: JobFilters;
  weights: ReadonlyMap<string, number>;
};

export type CandidatePool = {
  // Best first by overlap, one row per group.
  rows: CandidateRow[];
  // Every open copy of each pooled group that has more than one, under the same filters.
  copies: Map<string, CopyRow[]>;
  // Matching groups in all: the pool holds the best CANDIDATE_POOL of them.
  groups: number;
};

/** Each skill's weight in matching, from the last ingest's job_skills. A few hundred rows. */
export async function skillWeights(db: Db): Promise<Map<string, number>> {
  const rows = await db
    .select({ skill: jobSkills.skill, weight: jobSkills.weight })
    .from(jobSkills);
  return new Map(rows.map((row) => [row.skill, row.weight]));
}

const textArray = (items: readonly string[]) =>
  sql`array[${sql.join(
    items.map((item) => sql`${item}`),
    sql`, `,
  )}]::text[]`;

// postgres.js hands back an array of rows, PGlite an object holding them.
function rowsOf<T>(result: unknown): T[] {
  return (Array.isArray(result) ? result : (result as { rows: T[] }).rows) as T[];
}

/** Open jobs that can be Matches at all: not filler, not open for months, within the filters. */
function matchableConditions(filters: JobFilters, now: number): SQL[] {
  return [
    ...filterConditions(filters, now),
    eq(jobs.evergreen, false),
    sql`least(${jobs.postedAt}, ${jobs.firstSeenAt}) >= ${now - EVERGREEN_AFTER_MS}::bigint`,
  ];
}

const GROUP = sql`coalesce(nullif(${jobs.groupKey}, ''), ${jobs.id}::text)`;

/**
 * The best CANDIDATE_POOL openings for a resume across every open job, scored in one statement:
 * the summed weight of the skills it shares with the resume, plus ORDER_LIMITS.familyWeight for
 * the same kind of role. Only jobs matchJob would label make it (the same kind of role, or 2+
 * shared skills), so `groups` is how many Matches there are in all. Location copies count once.
 */
export async function matchCandidates(
  db: Db,
  query: MatchQuery,
  now = Date.now(),
): Promise<CandidatePool> {
  const { skills, families, seniority, filters, weights } = query;
  if (skills.length === 0 && families.length === 0)
    return { rows: [], copies: new Map(), groups: 0 };
  const skillList = textArray(skills);
  const weightList = sql`array[${sql.join(
    skills.map((skill) => sql`${weights.get(skill) ?? DEFAULT_SKILL_WEIGHT}`),
    sql`, `,
  )}]::float8[]`;
  const familyList = textArray(families);
  const level = seniority === null ? null : SENIORITIES.indexOf(seniority);
  const levelOf = sql`array_position(${textArray(SENIORITIES)}, ${jobs.seniority})`;
  const levelFactor =
    level === null
      ? sql`1::float8`
      : sql`case when r.level - 1 - ${level}::int >= 2 then ${LEVEL_UP_FACTOR}::float8 else 1::float8 end`;

  const pooled = rowsOf<{ id: string; groups: number }>(
    await db.execute(sql`
      with person(skill, weight) as (select * from unnest(${skillList}, ${weightList})),
      reach as (
        select ${jobs.id} as id, ${GROUP} as grp, ${jobs.keywords} as keywords, ${jobs.postedAt} as posted_at,
          coalesce(${jobs.family} = any(${familyList}), false) as same_kind, ${levelOf} as level
        from ${jobs}
        where ${and(
          ...matchableConditions(filters, now),
          or(sql`${jobs.keywords} && ${skillList}`, sql`${jobs.family} = any(${familyList})`),
        )}
      ),
      hits as (
        select r.id, sum(p.weight) as overlap, count(*) as found
        from reach r cross join lateral unnest(r.keywords) as k(skill)
        join person p on p.skill = k.skill
        group by r.id
      ),
      scored as (
        select r.id, r.grp, r.posted_at,
          (coalesce(h.overlap, 0) + case when r.same_kind then ${ORDER_LIMITS.familyWeight}::float8 else 0 end)
            * ${levelFactor} as score
        from reach r left join hits h on h.id = r.id
        where r.same_kind or coalesce(h.found, 0) >= 2
      ),
      best as (
        select distinct on (grp) id, score, posted_at from scored order by grp, score desc, posted_at desc, id
      )
      select id::text as id, (count(*) over ())::int as groups
      from best
      order by score desc, posted_at desc, id
      limit ${CANDIDATE_POOL}::int
    `),
  );
  if (pooled.length === 0) return { rows: [], copies: new Map(), groups: 0 };

  const ids = pooled.map((row) => row.id);
  const found = await db.select(CANDIDATE_COLUMNS).from(jobs).where(inArray(jobs.id, ids));
  const byId = new Map(found.map((row) => [row.id, row]));
  const rows = ids
    .map((id) => byId.get(id))
    .filter((row): row is CandidateRow => row !== undefined);

  const keys = [...new Set(rows.map((row) => row.groupKey).filter(Boolean))];
  const copies = new Map<string, CopyRow[]>();
  if (keys.length > 0) {
    const others = await db
      .select({ ...LIST_COLUMNS, rulesText: jobs.rulesText, groupKey: jobs.groupKey })
      .from(jobs)
      .where(and(...matchableConditions(filters, now), inArray(jobs.groupKey, keys)))
      .orderBy(desc(jobs.postedAt), desc(jobs.id));
    for (const row of others) copies.set(row.groupKey, [...(copies.get(row.groupKey) ?? []), row]);
    for (const [key, list] of copies) if (list.length < 2) copies.delete(key);
  }
  return { rows, copies, groups: pooled[0]?.groups ?? 0 };
}

/** The account's saved jobs, newest save first, closed ones included. */
export async function savedCandidates(db: Db, userId: string): Promise<CandidateRow[]> {
  return db
    .select(CANDIDATE_COLUMNS)
    .from(savedJobs)
    .innerJoin(jobs, eq(jobs.id, savedJobs.jobId))
    .where(eq(savedJobs.userId, userId))
    .orderBy(desc(savedJobs.savedAt))
    .limit(SAVED_JOBS_LIMIT);
}

export async function savedIds(
  db: Db,
  userId: string,
  jobIds: readonly string[],
): Promise<Set<string>> {
  if (jobIds.length === 0) return new Set();
  const rows = await db
    .select({ jobId: savedJobs.jobId })
    .from(savedJobs)
    .where(and(eq(savedJobs.userId, userId), inArray(savedJobs.jobId, [...jobIds])));
  return new Set(rows.map((row) => row.jobId));
}

export async function savedCount(db: Db, userId: string): Promise<number> {
  const [row] = await db.select({ n: count() }).from(savedJobs).where(eq(savedJobs.userId, userId));
  return row?.n ?? 0;
}

/**
 * Open jobs, and the ones matching can show: one per group of location copies, leaving out
 * "general application" posts and posts open 120+ days. For the job counts the site states.
 */
export async function jobCounts(
  db: Db,
  now = Date.now(),
): Promise<{ open: number; matchable: number }> {
  const [open] = await db.select({ n: count() }).from(jobs).where(isNull(jobs.closedAt));
  const [matchable] = await db
    .select({ n: sql<number>`count(distinct ${GROUP})::int` })
    .from(jobs)
    .where(and(...matchableConditions(DEFAULT_FILTERS, now)));
  return { open: open?.n ?? 0, matchable: matchable?.n ?? 0 };
}

/** Open jobs overall and when a source was last read, for the page's fact line. */
export async function jobStats(db: Db): Promise<{ openJobs: number; checkedAt: number | null }> {
  const [open] = await db.select({ n: count() }).from(jobs).where(isNull(jobs.closedAt));
  const [read] = await db.select({ at: max(jobBoards.lastFetchedAt) }).from(jobBoards);
  return { openJobs: open?.n ?? 0, checkedAt: read?.at ?? null };
}

export type SaveJobResult = "saved" | "not_found" | "limit_reached" | "no_user";

/** Saves a job for the account. Idempotent; capped per account under the user's row lock. */
export async function saveJob(
  db: Db,
  userId: string,
  jobId: string,
  now = Date.now(),
): Promise<SaveJobResult> {
  return db.transaction(async (tx) => {
    if (!(await lockUser(tx, userId))) return "no_user";
    const [job] = await tx.select({ id: jobs.id }).from(jobs).where(eq(jobs.id, jobId)).limit(1);
    if (!job) return "not_found";
    const [already] = await tx
      .select({ jobId: savedJobs.jobId })
      .from(savedJobs)
      .where(and(eq(savedJobs.userId, userId), eq(savedJobs.jobId, jobId)))
      .limit(1);
    if (already) return "saved";
    const [total] = await tx
      .select({ n: count() })
      .from(savedJobs)
      .where(eq(savedJobs.userId, userId));
    if ((total?.n ?? 0) >= SAVED_JOBS_LIMIT) return "limit_reached";
    await tx.insert(savedJobs).values({ userId, jobId, savedAt: now }).onConflictDoNothing();
    return "saved";
  });
}

export async function unsaveJob(db: Db, userId: string, jobId: string): Promise<void> {
  await db.delete(savedJobs).where(and(eq(savedJobs.userId, userId), eq(savedJobs.jobId, jobId)));
}

export type JobDetail = FeedJob & {
  description: string;
  validThrough: number | null;
  employmentType: FeedJob["employmentType"];
};

/** One job with its text, for /jobs/:id. */
export async function jobById(db: Db, id: string): Promise<JobDetail | null> {
  const [row] = await db
    .select({ ...LIST_COLUMNS, description: jobs.description, validThrough: jobs.validThrough })
    .from(jobs)
    .where(eq(jobs.id, id))
    .limit(1);
  if (!row) return null;
  return { ...toFeedJob(row), description: row.description, validThrough: row.validThrough };
}
