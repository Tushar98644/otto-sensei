import { and, count, desc, eq, inArray, max, sql, type SQL } from "drizzle-orm";
import type { Db, Tx } from "@/db/client";
import { lockUser } from "@/db/locks";
import { applications, jobBoards, listings, savedJobs, skills, titles } from "@/db/schema";
import { DAY_MS } from "@/lib/time";
import {
  employmentTypeOf,
  familyOf,
  FLAG,
  fromMinutes,
  jobUrlOf,
  listingIdOf,
  publicJobId,
  seniorityOf,
  toMinutes,
  unpackOccupation,
} from "./codes";
import { searchWords } from "./normalize";
import { readTitle } from "./occupations";
import { titleCodeFrom, type TitleCode } from "./title-code";
import {
  SAVED_JOBS_LIMIT,
  type FeedJob,
  type JobSnapshot,
  type JobSourceId,
  type RoleFamily,
  type SavedJob,
} from "./types";

export const CANDIDATE_POOL = 300;
// A job counts as posted when the board says, or when first read if that's earlier or the date is missing.
export const FRESH_FOR_MS = 90 * DAY_MS;
export const DEFAULT_SKILL_WEIGHT = 1;

// A job as ranking and the pages read it: a listing with its title and board, or a saved snapshot.
export type CandidateRow = FeedJob & {
  // The listing's own id; 0 for a job that's gone.
  listing: number;
  board: number;
  ext: string;
  token: string;
  grp: number;
  flags: number;
  family: RoleFamily | null;
  occupation: string | null;
  minYears: number | null;
  facts: string;
  places: string;
  oplaces: string;
  firstSeenAt: number;
  validThrough: number | null;
  code: TitleCode | null;
  post: string;
};

export function toFeedJob(row: FeedJob): FeedJob {
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
    closed: row.closed,
  };
}

// Only letters and digits are matched, as the search box always did.
export function queryWords(input: string): string[] {
  return searchWords(input).split(" ").filter(Boolean).slice(0, 6);
}

// Every word starts a word of the job's title, company, place or skills.
export function matchesWords(
  row: Pick<FeedJob, "title" | "company" | "location" | "keywords">,
  words: readonly string[],
): boolean {
  if (words.length === 0) return true;
  const tokens = searchWords(
    `${row.title} ${row.company} ${row.location} ${row.keywords.join(" ")}`,
  ).split(" ");
  return words.every((word) => tokens.some((token) => token.startsWith(word)));
}

// Skill names by id; a new id the cache hasn't seen reads the table again.
let skillCache: { at: number; names: Map<number, string> } | null = null;
const SKILL_CACHE_MS = 10 * 60_000;

export async function skillNames(
  db: Db | Tx,
  needed: Iterable<number> = [],
): Promise<Map<number, string>> {
  const now = Date.now();
  const cached = skillCache;
  if (
    cached &&
    now - cached.at < SKILL_CACHE_MS &&
    [...needed].every((sid) => cached.names.has(sid))
  )
    return cached.names;
  const rows = await db
    .select({ skill: skills.skill, sid: skills.sid })
    .from(skills)
    .where(sql`${skills.sid} is not null`);
  const names = new Map(rows.map((row) => [row.sid!, row.skill]));
  skillCache = { at: now, names };
  return names;
}

const ROW_COLUMNS = {
  id: listings.id,
  board: listings.board,
  ext: listings.ext,
  titleText: listings.titleText,
  title: titles.text,
  code: titles.code,
  location: listings.location,
  places: listings.places,
  oplaces: listings.oplaces,
  company: listings.company,
  url: listings.url,
  posted: listings.posted,
  seen: listings.seen,
  valid: listings.valid,
  grp: listings.grp,
  occ: listings.occ,
  level: listings.level,
  family: listings.family,
  minYears: listings.minYears,
  flags: listings.flags,
  facts: listings.facts,
  skills: listings.skills,
  post: listings.post,
  source: jobBoards.source,
  token: jobBoards.token,
  boardCompany: jobBoards.company,
  template: jobBoards.urlTemplate,
};

const selectRows = (db: Db | Tx, where: SQL) =>
  db
    .select(ROW_COLUMNS)
    .from(listings)
    .innerJoin(titles, eq(titles.id, listings.title))
    .innerJoin(jobBoards, eq(jobBoards.id, listings.board))
    .where(where);

type Stored = Awaited<ReturnType<typeof selectRows>>[number];

function candidateOf(row: Stored, names: ReadonlyMap<number, string>): CandidateRow {
  return {
    id: publicJobId(row.id),
    listing: row.id,
    board: row.board,
    ext: row.ext,
    token: row.token,
    source: row.source as JobSourceId,
    company: row.company || row.boardCompany,
    title: row.titleText || row.title,
    location: row.location,
    remote: (row.flags & FLAG.remote) !== 0,
    employmentType: employmentTypeOf(row.flags),
    seniority: seniorityOf(row.level),
    postedAt: fromMinutes(row.posted),
    url: jobUrlOf(row.template, row.ext, row.url),
    keywords: row.skills.flatMap((sid) => names.get(sid) ?? []),
    closed: false,
    grp: row.grp,
    flags: row.flags,
    family: familyOf(row.family),
    occupation: unpackOccupation(row.occ),
    minYears: row.minYears || null,
    facts: row.facts,
    places: row.places,
    oplaces: row.oplaces,
    firstSeenAt: fromMinutes(row.seen),
    validThrough: row.valid ? fromMinutes(row.valid) : null,
    code: titleCodeFrom(row.code),
    post: row.post,
  };
}

async function readRows(db: Db | Tx, where: SQL): Promise<CandidateRow[]> {
  const rows = await selectRows(db, where);
  const names = await skillNames(
    db,
    rows.flatMap((row) => row.skills),
  );
  return rows.map((row) => candidateOf(row, names));
}

export async function listingRows(db: Db | Tx, ids: readonly number[]): Promise<CandidateRow[]> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return [];
  const out: CandidateRow[] = [];
  for (let i = 0; i < unique.length; i += 1_000)
    out.push(...(await readRows(db, inArray(listings.id, unique.slice(i, i + 1_000)))));
  return out;
}

// The copies of the given openings that the last rebuild found, by board and group.
export async function copyRows(
  db: Db,
  groups: readonly { board: number; grp: number }[],
): Promise<CandidateRow[]> {
  if (groups.length === 0) return [];
  const boards = sql.join(
    groups.map((group) => sql`${group.board}`),
    sql`, `,
  );
  const grps = sql.join(
    groups.map((group) => sql`${group.grp}`),
    sql`, `,
  );
  // The literal matches listings_copies_idx's predicate, so the planner can use it.
  return readRows(
    db,
    sql`(${listings.flags} & ${sql.raw(String(FLAG.copy))}) <> 0 and (${listings.board}, ${listings.grp}) in
      (select * from unnest(array[${boards}]::smallint[], array[${grps}]::integer[]))`,
  );
}

// A gone job, from what a saved job or application kept of it.
export function snapshotRow(id: string, job: JobSnapshot): CandidateRow {
  const read = readTitle(job.title);
  return {
    ...job,
    keywords: job.keywords ?? [],
    id,
    closed: true,
    listing: 0,
    board: 0,
    ext: "",
    token: "",
    grp: 0,
    flags: 0,
    family: read.family,
    occupation: read.occupation,
    minYears: null,
    facts: "",
    places: "",
    oplaces: "",
    firstSeenAt: job.postedAt,
    validThrough: null,
    code: null,
    post: "",
  };
}

export function snapshotOf(row: FeedJob): JobSnapshot {
  return {
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
  };
}

export async function readSkills(
  db: Db,
): Promise<{ ids: Map<string, number>; weights: Map<string, number> }> {
  const rows = await db
    .select({ skill: skills.skill, sid: skills.sid, weight: skills.weight })
    .from(skills);
  const ids = new Map<string, number>();
  const weights = new Map<string, number>();
  for (const row of rows) {
    if (row.sid !== null) ids.set(row.skill, row.sid);
    if (row.weight !== null) weights.set(row.skill, row.weight);
  }
  return { ids, weights };
}

export async function skillWeights(db: Db): Promise<Map<string, number>> {
  return (await readSkills(db)).weights;
}

// postgres.js hands back an array of rows, PGlite an object holding them.
export function rowsOf<T>(result: unknown): T[] {
  return (Array.isArray(result) ? result : (result as { rows: T[] }).rows) as T[];
}

// Listings anyone could be shown: not a general application, first posted within 90 days.
export function shownConditions(now: number): SQL {
  return sql`(${listings.flags} & ${FLAG.evergreen}) = 0 and least(${listings.posted}, ${listings.seen}) >= ${toMinutes(now - FRESH_FOR_MS)}`;
}

// The saved jobs' rows, newest first: the listing while it's open, the snapshot once it's gone.
export async function savedCandidates(
  db: Db,
  userId: string,
): Promise<(CandidateRow & { savedAt: number })[]> {
  const saved = await db
    .select({ jobId: savedJobs.jobId, savedAt: savedJobs.savedAt, job: savedJobs.job })
    .from(savedJobs)
    .where(eq(savedJobs.userId, userId))
    .orderBy(desc(savedJobs.savedAt), desc(savedJobs.jobId))
    .limit(SAVED_JOBS_LIMIT);
  const live = new Map(
    (
      await listingRows(
        db,
        saved.flatMap((row) => listingIdOf(row.jobId) ?? []),
      )
    ).map((row) => [row.id, row]),
  );
  return saved.flatMap((row) => {
    const found = live.get(row.jobId) ?? (row.job ? snapshotRow(row.jobId, row.job) : null);
    return found ? [{ ...found, savedAt: row.savedAt }] : [];
  });
}

export async function listSavedJobs(db: Db, userId: string): Promise<SavedJob[]> {
  return (await savedCandidates(db, userId)).map((row) => ({
    ...toFeedJob(row),
    savedAt: row.savedAt,
  }));
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

// Open jobs anyone could be shown: the public count says no more than that.
export async function countShownJobs(db: Db, now: number): Promise<number> {
  const [open] = await db.select({ n: count() }).from(listings).where(shownConditions(now));
  return open?.n ?? 0;
}

export async function jobCounts(
  db: Db,
  now = Date.now(),
): Promise<{ open: number; matchable: number }> {
  const [row] = await db
    .select({
      open: count(),
      matchable: sql<number>`count(*) filter (where (${listings.flags} & ${FLAG.lead}) <> 0)::int`,
    })
    .from(listings)
    .where(shownConditions(now));
  return { open: row?.open ?? 0, matchable: row?.matchable ?? 0 };
}

export async function jobStats(
  db: Db,
  now = Date.now(),
): Promise<{ openJobs: number; checkedAt: number | null }> {
  const [open, [read]] = await Promise.all([
    countShownJobs(db, now),
    db.select({ at: max(jobBoards.lastFetchedAt) }).from(jobBoards),
  ]);
  return { openJobs: open, checkedAt: read?.at ?? null };
}

export type SaveJobResult = "saved" | "already_saved" | "not_found" | "limit_reached" | "no_user";

export async function saveJob(
  db: Db,
  userId: string,
  jobId: string,
  now = Date.now(),
): Promise<SaveJobResult> {
  const listing = listingIdOf(jobId);
  return db.transaction(async (tx) => {
    if (!(await lockUser(tx, userId))) return "no_user";
    const [job] = listing === null ? [] : await listingRows(tx, [listing]);
    if (!job) return "not_found";
    const [already] = await tx
      .select({ jobId: savedJobs.jobId })
      .from(savedJobs)
      .where(and(eq(savedJobs.userId, userId), eq(savedJobs.jobId, jobId)))
      .limit(1);
    if (already) return "already_saved";
    const [total] = await tx
      .select({ n: count() })
      .from(savedJobs)
      .where(eq(savedJobs.userId, userId));
    if ((total?.n ?? 0) >= SAVED_JOBS_LIMIT) return "limit_reached";
    await tx
      .insert(savedJobs)
      .values({ userId, jobId, savedAt: now, job: snapshotOf(job) })
      .onConflictDoNothing();
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
  board: string;
  externalId: string;
};

function detailOf(row: CandidateRow): JobDetail {
  return {
    ...toFeedJob(row),
    description: row.post,
    validThrough: row.validThrough,
    board: row.token === "feed" ? "" : row.token,
    externalId: row.ext,
  };
}

export async function jobById(db: Db, id: string): Promise<JobDetail | null> {
  const listing = listingIdOf(id);
  const [row] = listing === null ? [] : await listingRows(db, [listing]);
  return row ? detailOf(row) : null;
}

// A job that's gone, as the account's saved job or application kept it.
export async function keptJob(db: Db, userId: string, id: string): Promise<JobDetail | null> {
  const [saved] = await db
    .select({ job: savedJobs.job })
    .from(savedJobs)
    .where(and(eq(savedJobs.userId, userId), eq(savedJobs.jobId, id)))
    .limit(1);
  const [applied] = saved?.job
    ? []
    : await db
        .select({ job: applications.job })
        .from(applications)
        .where(and(eq(applications.userId, userId), eq(applications.jobId, id)))
        .limit(1);
  const job = saved?.job ?? applied?.job;
  return job ? detailOf(snapshotRow(id, job)) : null;
}
