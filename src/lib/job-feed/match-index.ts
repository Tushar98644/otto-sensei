import { and, count, desc, inArray, isNull, max, or, sql, type SQL } from "drizzle-orm";
import type { Db } from "@/db/client";
import { companyVisa, jobBoards, jobCountsRow, jobMatch, jobs, matchSkills } from "@/db/schema";
import { log } from "@/lib/log";
import { jobPlaceTokens } from "./looking-for";
import { PAST_KIND_WEIGHT } from "./match";
import { ORDER_LIMITS } from "./order";
import {
  CANDIDATE_COLUMNS,
  CANDIDATE_POOL,
  DEFAULT_SKILL_WEIGHT,
  EVERGREEN_AFTER_MS,
  jobCounts,
  jobStats,
  matchableConditions,
  matchCandidates,
  rowsOf,
  skillWeights,
  type CandidateRow,
  type MatchQuery,
  wordsQuery,
} from "./records";
import { companyKey, type VisaFacts } from "./visa";
import { DEFAULT_FILTERS, LEVEL_SENIORITIES, SENIORITIES, type JobFilters } from "./types";

// Server-only. The narrow job_match table (20261109006200_match_index.sql): one row per opening
// Matches may show, with integer skill ids, rebuilt at the end of each ingest, so a match request
// scores a 5 MB table instead of the wide jobs one (MATCHING-RESEARCH.md, Round 2 (d)). Until the
// migration has run and an ingest has built it, matching falls back to the query on jobs
// (matchCandidates), so a deploy never breaks between the code and its migration.

const CHUNK = 1_000;

export type StoredCounts = {
  openJobs: number;
  matchable: number;
  checkedAt: number | null;
  // The ingest run that built job_match; cached match lists name it.
  builtAt: number;
};

function missingTable(error: unknown): boolean {
  for (let e: unknown = error, depth = 0; e && depth < 4; depth++) {
    const code = (e as { code?: unknown }).code;
    if (code === "42P01") return true;
    e = (e as { cause?: unknown }).cause;
  }
  return false;
}

/** The counts the last ingest wrote, or null before the migration or the first rebuild. */
export async function readStoredCounts(db: Db): Promise<StoredCounts | null> {
  try {
    const [row] = await db.select().from(jobCountsRow).limit(1);
    return row
      ? {
          openJobs: row.openJobs,
          matchable: row.matchable,
          checkedAt: row.checkedAt,
          builtAt: row.builtAt,
        }
      : null;
  } catch (error) {
    if (missingTable(error)) return null;
    throw error;
  }
}

type SkillTable = { ids: Map<string, number>; weights: Map<string, number>; maxSid: number };

// Skill ids and weights change only at an ingest, so a process keeps them until the next one.
let skillCache: { builtAt: number; table: SkillTable } | null = null;

async function skillTable(db: Db, builtAt: number): Promise<SkillTable> {
  if (skillCache?.builtAt === builtAt) return skillCache.table;
  const [rows, weights] = await Promise.all([db.select().from(matchSkills), skillWeights(db)]);
  const ids = new Map(rows.map((row) => [row.skill, row.sid]));
  const table = { ids, weights, maxSid: Math.max(0, ...ids.values()) };
  skillCache = { builtAt, table };
  return table;
}

// Postgres array literals as one bound parameter each: '{1,4,9}', '{"g:eu","US"}'.
const intArray = (values: readonly number[]) => `{${values.join(",")}}`;
const textArrayLiteral = (values: readonly string[]) =>
  `{${values.map((value) => `"${value.replace(/["\\]/g, "")}"`).join(",")}}`;

/** Rewrites job_match and job_counts from the open jobs. Returns the openings written. */
export async function rebuildMatchIndex(db: Db, now: number): Promise<number | null> {
  // Before the migration there is nothing to build.
  try {
    await db.select({ sid: matchSkills.sid }).from(matchSkills).limit(1);
  } catch (error) {
    if (missingTable(error)) return null;
    throw error;
  }

  const rows = await db
    .select({
      id: jobs.id,
      groupKey: jobs.groupKey,
      company: jobs.company,
      family: jobs.family,
      seniority: jobs.seniority,
      keywords: jobs.keywords,
      location: jobs.location,
      remote: jobs.remote,
      postedAt: jobs.postedAt,
      firstSeenAt: jobs.firstSeenAt,
    })
    .from(jobs)
    .where(and(...matchableConditions(DEFAULT_FILTERS, now)))
    .orderBy(desc(jobs.postedAt), desc(jobs.id));

  // New skills get the next free id; ids already given never change.
  const known = await db.select().from(matchSkills);
  const ids = new Map(known.map((row) => [row.skill, row.sid]));
  let next = Math.max(0, ...ids.values()) + 1;
  const added: { sid: number; skill: string }[] = [];
  for (const row of rows) {
    for (const skill of row.keywords) {
      if (ids.has(skill)) continue;
      ids.set(skill, next);
      added.push({ sid: next, skill });
      next += 1;
    }
  }
  for (let i = 0; i < added.length; i += CHUNK) {
    await db
      .insert(matchSkills)
      .values(added.slice(i, i + CHUNK))
      .onConflictDoNothing();
  }
  if (added.length > 0) {
    // A racing run may have taken an id first: read back what the table holds.
    const settled = await db.select().from(matchSkills);
    ids.clear();
    for (const row of settled) ids.set(row.skill, row.sid);
  }

  const visa = new Map<string, VisaFacts>();
  try {
    for (const row of await db.select().from(companyVisa)) {
      visa.set(row.companyKey, { ukSponsor: row.ukName !== null, h1bYear: row.h1bYear });
    }
  } catch (error) {
    if (!missingTable(error)) throw error;
  }

  type Opening = typeof jobMatch.$inferInsert;
  const openings = new Map<string, Opening & { placeSet: Set<string> }>();
  for (const row of rows) {
    const grp = row.groupKey || row.id;
    const places = jobPlaceTokens(row.location);
    const seenAt = Math.min(row.postedAt, row.firstSeenAt);
    const known = openings.get(grp);
    if (known) {
      for (const place of places) known.placeSet.add(place);
      known.remote = known.remote || row.remote;
      known.seenAt = Math.min(known.seenAt, seenAt);
      continue;
    }
    const facts = visa.get(companyKey(row.company));
    // Rows come newest first, so the first copy of each opening is the one stored.
    openings.set(grp, {
      id: row.id,
      grp,
      company: row.company,
      family: row.family,
      level: SENIORITIES.indexOf(row.seniority),
      sids: [...new Set(row.keywords.flatMap((skill) => ids.get(skill) ?? []))].sort(
        (a, b) => a - b,
      ),
      places: [],
      placeSet: new Set(places),
      remote: row.remote,
      postedAt: row.postedAt,
      seenAt,
      ukSponsor: facts?.ukSponsor ?? false,
      h1bYear: facts?.h1bYear ?? null,
    });
  }
  const values: Opening[] = [...openings.values()].map(({ placeSet, ...opening }) => ({
    ...opening,
    places: [...placeSet].sort(),
  }));

  const [open] = await db.select({ n: count() }).from(jobs).where(isNull(jobs.closedAt));
  const [read] = await db.select({ at: max(jobBoards.lastFetchedAt) }).from(jobBoards);
  await db.transaction(async (tx) => {
    await tx.delete(jobMatch);
    for (let i = 0; i < values.length; i += CHUNK)
      await tx.insert(jobMatch).values(values.slice(i, i + CHUNK));
    const counts = {
      openJobs: open?.n ?? 0,
      matchable: values.length,
      checkedAt: read?.at ?? null,
      builtAt: now,
    };
    await tx
      .insert(jobCountsRow)
      .values({ id: 1, ...counts })
      .onConflictDoUpdate({ target: jobCountsRow.id, set: counts });
  });
  return values.length;
}

/** Open jobs and when a board was last read: the stored row, else counted (before the migration). */
export async function storedJobStats(
  db: Db,
): Promise<{ openJobs: number; checkedAt: number | null }> {
  const counts = await readStoredCounts(db);
  return counts ?? jobStats(db);
}

/** The counts the site states: the stored row, else counted. */
export async function storedJobCounts(
  db: Db,
  now = Date.now(),
): Promise<{ open: number; matchable: number }> {
  const counts = await readStoredCounts(db);
  return counts ? { open: counts.openJobs, matchable: counts.matchable } : jobCounts(db, now);
}

/** One opening a match request ranks: the copy that scored, every open copy, where they are. */
export type PooledOpening = {
  row: CandidateRow;
  // Every open copy under the filters, newest first, `row` included.
  copies: CandidateRow[];
  places: string[];
  visa: VisaFacts | null;
};

export type OpeningPool = {
  openings: PooledOpening[];
  // Matching openings in all, of the level asked for when there are any.
  groups: number;
  source: "index" | "jobs";
};

export type PoolQuery = MatchQuery & {
  // Place tokens the "Looking for" card accepts, or null for anywhere (looking-for.ts).
  places: readonly string[] | null;
  limit?: number;
};

// The same text search as /jobs, on any open copy of the opening.
function textMatch(filters: JobFilters): SQL | null {
  const queries = [filters.q, filters.place].flatMap((text) => wordsQuery(text) ?? []);
  if (queries.length === 0) return null;
  return and(
    ...queries.map(
      (
        query,
      ) => sql`exists (select 1 from ${jobs} j where (j.id = m.id or (m.grp = j.group_key and j.group_key <> ''))
        and j.closed_at is null and j.search @@ to_tsquery('simple', ${query}))`,
    ),
  )!;
}

async function indexedPool(
  db: Db,
  query: PoolQuery,
  counts: StoredCounts,
  now: number,
): Promise<OpeningPool> {
  const { filters } = query;
  const table = await skillTable(db, counts.builtAt);
  const families = [...query.families];
  const past = query.pastFamilies ?? [];
  const reachFamilies = [...families, ...past];
  const sids = query.skills.flatMap((skill) => table.ids.get(skill) ?? []).sort((a, b) => a - b);
  if (sids.length === 0 && reachFamilies.length === 0)
    return { openings: [], groups: 0, source: "index" };
  // Weight of each skill id, 0 when not on the resume: the SQL sums w[id] over a job's ids.
  const dense = Array.from({ length: Math.max(table.maxSid, 1) }, () => 0);
  for (const skill of query.skills) {
    const sid = table.ids.get(skill);
    if (sid !== undefined) dense[sid - 1] = query.weights.get(skill) ?? DEFAULT_SKILL_WEIGHT;
  }
  const level = query.seniority === null ? null : SENIORITIES.indexOf(query.seniority);
  const w = sql`${intArray(dense)}::float8[]`;
  const conditions: SQL[] = [
    sql`m.seen_at >= ${now - EVERGREEN_AFTER_MS}::bigint`,
    sql`(m.sids operator(pg_catalog.&&) ${intArray(sids)}::int[] or m.family = any(${textArrayLiteral(reachFamilies)}::text[]))`,
    sql`(m.family = any(${textArrayLiteral(reachFamilies)}::text[]) or h.found >= 2)`,
  ];
  if (filters.remote) conditions.push(sql`m.remote`);
  if (filters.role) conditions.push(sql`m.family = ${filters.role}`);
  if (filters.level) {
    const levels = LEVEL_SENIORITIES[filters.level].map((item) => SENIORITIES.indexOf(item));
    conditions.push(sql`m.level = any(${intArray(levels)}::int[])`);
  }
  if (filters.postedWithin)
    conditions.push(
      sql`m.posted_at >= ${now - filters.postedWithin * 24 * 60 * 60 * 1_000}::bigint`,
    );
  const text = textMatch(filters);
  if (text) conditions.push(text);

  const gap = level === null ? sql`0` : sql`(m.level - ${level}::int)`;
  const accepted = query.places;
  const placeFactor =
    accepted === null
      ? sql`1::float8`
      : sql`case when cardinality(m.places) = 0 then 1::float8
          when m.places && ${textArrayLiteral(accepted)}::text[] then ${ORDER_LIMITS.placeMatch}::float8
          else ${ORDER_LIMITS.placeMiss}::float8 end`;
  const pooled = rowsOf<{
    id: string;
    grp: string;
    places: string[];
    uk_sponsor: boolean;
    h1b_year: number | null;
    groups: number;
    near_groups: number;
  }>(
    await db.execute(sql`
      with scored as (
        select m.id, m.grp, m.places, m.uk_sponsor, m.h1b_year, m.posted_at,
          (h.overlap + case when m.family = any(${textArrayLiteral(families)}::text[]) then ${ORDER_LIMITS.familyWeight}::float8
              when m.family = any(${textArrayLiteral(past)}::text[]) then ${ORDER_LIMITS.familyWeight * PAST_KIND_WEIGHT}::float8 else 0 end)
            * case ${gap} when 0 then 1::float8 when 1 then ${ORDER_LIMITS.oneUp}::float8
                when -1 then ${ORDER_LIMITS.oneDown}::float8 else ${ORDER_LIMITS.farLevel}::float8 end
            * ${placeFactor} as score,
          abs(${gap}) <= 1 as near
        from ${jobMatch} m
        cross join lateral (
          select coalesce(sum((${w})[i]), 0) as overlap, count(*) filter (where (${w})[i] > 0) as found
          from unnest(m.sids) i
        ) h
        where ${and(...conditions)}
      )
      select id::text as id, grp, places, uk_sponsor, h1b_year,
        (count(*) over ())::int as groups, (count(*) filter (where near) over ())::int as near_groups
      from scored
      order by near desc, score desc, posted_at desc, id
      limit ${query.limit ?? CANDIDATE_POOL}::int
    `),
  );
  if (pooled.length === 0) return { openings: [], groups: 0, source: "index" };

  // Every open copy of the pooled openings under the filters, in one read.
  const ids = pooled.map((row) => row.id);
  const groupKeys = pooled.map((row) => row.grp).filter((grp) => !ids.includes(grp));
  const copies = await db
    .select(CANDIDATE_COLUMNS)
    .from(jobs)
    .where(
      and(
        ...matchableConditions(filters, now),
        groupKeys.length > 0
          ? or(inArray(jobs.id, ids), inArray(jobs.groupKey, groupKeys))
          : inArray(jobs.id, ids),
      ),
    )
    .orderBy(desc(jobs.postedAt), desc(jobs.id));
  const byGroup = new Map<string, CandidateRow[]>();
  for (const copy of copies) {
    const grp = copy.groupKey || copy.id;
    byGroup.set(grp, [...(byGroup.get(grp) ?? []), copy]);
  }
  const near = pooled[0]?.near_groups ?? 0;
  const openings: PooledOpening[] = [];
  for (const item of pooled) {
    const list = byGroup.get(item.grp) ?? [];
    // The stored copy, or the newest one the filters still allow.
    const row = list.find((copy) => copy.id === item.id) ?? list[0];
    if (!row) continue;
    openings.push({
      row,
      copies: list,
      places: item.places,
      visa:
        item.uk_sponsor || item.h1b_year !== null
          ? { ukSponsor: item.uk_sponsor, h1bYear: item.h1b_year }
          : null,
    });
  }
  return {
    openings,
    groups: near > 0 ? near : (pooled[0]?.groups ?? 0),
    source: "index",
  };
}

async function jobsPool(db: Db, query: PoolQuery, now: number): Promise<OpeningPool> {
  const pool = await matchCandidates(db, query, now);
  return {
    openings: pool.rows.map((row) => {
      const copies = pool.copies.get(row.groupKey) ?? [row];
      const places = [...new Set(copies.flatMap((copy) => jobPlaceTokens(copy.location)))].sort();
      return { row, copies, places, visa: null };
    }),
    groups: pool.groups,
    source: "jobs",
  };
}

/**
 * The best openings for a resume: from job_match when the last ingest built it, else from jobs.
 * `counts` is readStoredCounts(db), read once per request by the caller.
 */
export async function poolOpenings(
  db: Db,
  query: PoolQuery,
  counts: StoredCounts | null,
  now: number,
): Promise<OpeningPool> {
  if (counts) {
    try {
      return await indexedPool(db, query, counts, now);
    } catch (error) {
      // A half-applied migration or a renamed column must cost speed, not the list.
      log.error("jobs.index_query_failed", error);
    }
  }
  return jobsPool(db, query, now);
}
