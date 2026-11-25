import { and, count, eq, gt, inArray, notInArray, sql, type SQL } from "drizzle-orm";
import type { Db, Tx } from "@/db/client";
import { jobBoards, listings, skills, titles } from "@/db/schema";
import { DAY_MS } from "@/lib/time";
import {
  boardRange,
  familyCode,
  levelCode,
  listingId,
  packOccupation,
  readFlags,
  REBUILD_FLAGS,
  toMinutes,
} from "./codes";
import { jobCity } from "./job-city";
import {
  boilerplateLines,
  contentHash,
  JOB_LIMITS,
  normalizeJob,
  type NormalizedJob,
} from "./normalize";
import type { RawJob } from "./parsers";
import { rowsOf } from "./records";
import { SOURCE_INFO } from "./sources";
import { titleId, today } from "./title-vectors";
import { BOARD_SOURCES, FEED_SOURCES, type BoardSeed, type JobSourceId } from "./types";

export const STORE_LIMITS = {
  perBoard: 1_000,
  missedRunsToClose: 2,
  notFoundToClose: 2,
  feedMaxAgeMs: 30 * DAY_MS,
  // About 250 bytes a listing with its titles (2026-11-24): ~45 MB at the cap, of Supabase Free's 500 MB.
  maxRows: 150_000,
  writeChunk: 200,
} as const;

const SOURCE_PRIORITY: Record<JobSourceId, number> = {
  greenhouse: 0,
  lever: 0,
  ashby: 0,
  workable: 0,
  recruitee: 0,
  personio: 0,
  workday: 0,
  gem: 0,
  pinpoint: 0,
  jobvite: 0,
  himalayas: 1,
  jobicy: 1,
  remoteok: 2,
  usajobs: 0,
};

export const FEED_TOKEN = "feed";

export type SaveStats = {
  added: number;
  updated: number;
  seen: number;
  duplicates: number;
  closed: number;
};

function chunks<T>(items: readonly T[], size: number = STORE_LIMITS.writeChunk): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export type Board = {
  id: number;
  source: JobSourceId;
  token: string;
  company: string;
  urlTemplate: string;
};

const BOARD_COLUMNS = {
  id: jobBoards.id,
  source: jobBoards.source,
  token: jobBoards.token,
  company: jobBoards.company,
  urlTemplate: jobBoards.urlTemplate,
};

// The board's row, made when a read comes before the seed list has it.
export async function boardOf(db: Db | Tx, source: JobSourceId, token: string): Promise<Board> {
  const [found] = await db
    .select(BOARD_COLUMNS)
    .from(jobBoards)
    .where(and(eq(jobBoards.source, source), eq(jobBoards.token, token)))
    .limit(1);
  if (found) return found;
  await db.insert(jobBoards).values({ source, token }).onConflictDoNothing();
  return boardOf(db, source, token);
}

// A Workday id is "{tenant}/{site}{path}", and its board is that site: the listing keeps the path.
export function listingExt(source: JobSourceId, token: string, externalId: string): string {
  if (source !== "workday") return externalId;
  const [host = "", site = ""] = token.split("/");
  const prefix = `${host.split(".")[0]}/${site}`;
  return externalId.startsWith(prefix) ? externalId.slice(prefix.length) : externalId;
}

// The board's links as one pattern, kept once found, so a listing stores its link only when it differs.
function templateOf(board: Board, pairs: readonly { ext: string; url: string }[]): string {
  if (board.urlTemplate) return board.urlTemplate;
  const counts = new Map<string, number>();
  for (const { ext, url } of pairs) {
    if (!ext || !url.includes(ext)) continue;
    const template = url.replaceAll(ext, "{id}");
    counts.set(template, (counts.get(template) ?? 0) + 1);
  }
  let best = "";
  let most = 0;
  for (const [template, n] of counts) {
    if (n > most || (n === most && template < best)) [best, most] = [template, n];
  }
  return best.length <= 2_048 ? best : "";
}

// Ids stay small (ranking sends one weight per id) and never change, since listings.skills holds them.
export async function skillIds(
  db: Db,
  named: Iterable<string>,
  now: number,
): Promise<Map<string, number>> {
  const read = async (from: Db | Tx) =>
    new Map(
      (
        await from
          .select({ skill: skills.skill, sid: skills.sid })
          .from(skills)
          .where(sql`${skills.sid} is not null`)
      ).map((row) => [row.skill, row.sid!]),
    );
  const ids = await read(db);
  const missing = [...new Set(named)].filter((skill) => !ids.has(skill));
  if (missing.length === 0) return ids;
  return db.transaction(async (tx) => {
    await lockSkills(tx);
    const settled = await read(tx);
    let next = Math.max(0, ...settled.values()) + 1;
    const added = missing
      .filter((skill) => !settled.has(skill))
      .map((skill) => ({ skill, sid: next++, updatedAt: now }));
    for (const part of chunks(added, 1_000)) {
      await tx
        .insert(skills)
        .values(part)
        .onConflictDoUpdate({
          target: skills.skill,
          set: { sid: sql.raw(`excluded.${skills.sid.name}`) },
        });
    }
    for (const { skill, sid } of added) settled.set(skill, sid);
    return settled;
  });
}

// The open duplicate keys, read once a run and kept in memory: an index over them would cost ~25 bytes a job.
export type DedupeKeys = Map<number, { id: number; priority: number }>;

export async function openDedupeKeys(db: Db, keys?: readonly number[]): Promise<DedupeKeys> {
  const out: DedupeKeys = new Map();
  const read = async (where: SQL | undefined) => {
    const rows = await db
      .select({ id: listings.id, dedupe: listings.dedupe, source: jobBoards.source })
      .from(listings)
      .innerJoin(jobBoards, eq(jobBoards.id, listings.board))
      .where(where);
    for (const row of rows)
      out.set(row.dedupe, { id: row.id, priority: SOURCE_PRIORITY[row.source] });
  };
  if (!keys) await read(undefined);
  else for (const part of chunks(keys, 500)) await read(inArray(listings.dedupe, part));
  return out;
}

type Prepared = { id: number; ext: string; job: NormalizedJob };

type Row = Omit<
  typeof listings.$inferInsert,
  "id" | "ext" | "seen" | "missed" | "board" | "oplaces"
>;

function rowOf(
  job: NormalizedJob,
  board: Board,
  ext: string,
  template: string,
  sids: ReadonlyMap<string, number>,
  canonical: ReadonlyMap<number, string>,
): Row {
  const title = titleId(job.titleKey);
  return {
    title,
    dedupe: job.dedupeKey,
    posted: toMinutes(job.postedAt),
    valid: job.validThrough === null ? 0 : Math.max(0, toMinutes(job.validThrough)),
    grp: job.groupKey,
    hash: job.contentHash,
    occ: packOccupation(job.occupation),
    level: levelCode(job.seniority),
    family: familyCode(job.family),
    minYears: job.minYears ?? 0,
    flags: readFlags(job),
    titleText: canonical.get(title) === job.title ? "" : job.title,
    location: job.location,
    places: job.places,
    company: job.company === board.company ? "" : job.company,
    url: template && template.replaceAll("{id}", ext) === job.url ? "" : job.url,
    facts: job.facts,
    skills: job.keywords.flatMap((skill) => sids.get(skill) ?? []),
    post: job.description,
    city: jobCity(job.location, job.places),
  };
}

// The type each rewritten column is sent as.
const REWRITE_TYPES = {
  title: "bigint",
  dedupe: "bigint",
  posted: "integer",
  valid: "integer",
  grp: "integer",
  hash: "integer",
  occ: "integer",
  level: "smallint",
  family: "smallint",
  minYears: "smallint",
  flags: "smallint",
  titleText: "text",
  location: "text",
  places: "text",
  company: "text",
  url: "text",
  facts: "text",
  skills: "smallint[]",
  post: "text",
  city: "integer",
} as const satisfies Record<keyof Row, string>;

const REWRITE_KEYS = Object.keys(REWRITE_TYPES) as (keyof typeof REWRITE_TYPES)[];

function rewriteSet(): Record<string, SQL> {
  const set: Record<string, SQL> = {};
  for (const key of REWRITE_KEYS) {
    const name = sql.identifier(listings[key].name);
    set[key] =
      key === "flags" ? sql`(${listings.flags} & ${REBUILD_FLAGS}) | v.${name}` : sql`v.${name}`;
  }
  return set;
}

function rewriteValues(part: { id: number; row: Row }[]): SQL {
  const rows = part.map(({ id, row }) => {
    const cells = REWRITE_KEYS.map(
      (key) => sql`${sql.param(row[key], listings[key])}::${sql.raw(REWRITE_TYPES[key])}`,
    );
    return sql`(${id}::bigint, ${sql.join(cells, sql`, `)})`;
  });
  const names = sql.join(
    ["id", ...REWRITE_KEYS.map((key) => listings[key].name)].map((name) => sql.identifier(name)),
    sql`, `,
  );
  return sql`(values ${sql.join(rows, sql`, `)}) as v(${names})`;
}

export async function syncBoards(db: Db, seeds: readonly BoardSeed[]): Promise<number> {
  const rows = [
    ...seeds.map((seed) => ({ source: seed.ats, token: seed.token, company: seed.company })),
    ...FEED_SOURCES.map((source) => ({ source, token: FEED_TOKEN, company: "" })),
  ];
  for (const part of chunks(rows, 500)) {
    await db
      .insert(jobBoards)
      .values(part)
      .onConflictDoUpdate({
        target: [jobBoards.source, jobBoards.token],
        set: { company: sql`excluded.company` },
        setWhere: sql`${jobBoards.company} is distinct from excluded.company`,
      });
  }
  let dropped = 0;
  for (const source of BOARD_SOURCES) {
    const tokens = seeds.filter((seed) => seed.ats === source).map((seed) => seed.token);
    const gone = await db
      .select({ id: jobBoards.id })
      .from(jobBoards)
      .where(
        tokens.length > 0
          ? and(eq(jobBoards.source, source), notInArray(jobBoards.token, tokens))
          : eq(jobBoards.source, source),
      );
    for (const board of gone) {
      dropped += await closeBoard(db, board.id);
      await db.delete(jobBoards).where(eq(jobBoards.id, board.id));
    }
  }
  return dropped;
}

const inBoard = (board: number) => {
  const [low, high] = boardRange(board);
  return sql`${listings.id} between ${low} and ${high}`;
};

// A closed job is deleted at once: saved jobs and applications keep their own snapshot of it.
async function closeBoard(db: Db | Tx, board: number): Promise<number> {
  const closed = await db.delete(listings).where(inBoard(board)).returning({ id: listings.id });
  return closed.length;
}

export type SaveOptions = { snapshot: boolean; dedupe?: DedupeKeys };

export async function saveJobs(
  db: Db,
  scope: { source: JobSourceId; board: string },
  raws: readonly RawJob[],
  now: number,
  { snapshot, dedupe }: SaveOptions,
): Promise<SaveStats> {
  const stats: SaveStats = { added: 0, updated: 0, seen: 0, duplicates: 0, closed: 0 };
  const board = await boardOf(db, scope.source, scope.board || FEED_TOKEN);
  const byId = new Map<string, RawJob>();
  for (const raw of [...raws].sort((a, b) => (b.postedAt ?? now) - (a.postedAt ?? now))) {
    if (raw.title.trim() && !byId.has(raw.externalId)) byId.set(raw.externalId, raw);
  }
  const batch = [...byId.values()].slice(0, snapshot ? STORE_LIMITS.perBoard : byId.size);
  const feedCutoff = now - STORE_LIMITS.feedMaxAgeMs;
  const fresh = (
    snapshot
      ? batch
      : batch.filter(
          (raw) => (raw.postedAt ?? now) >= feedCutoff && (raw.validThrough ?? now) >= now,
        )
  ).map((raw) => {
    const ext = listingExt(scope.source, board.token, raw.externalId);
    return { raw, ext, id: listingId(board.id, ext) };
  });

  const read = fresh.filter(({ raw }) => !raw.listingOnly).map(({ raw }) => raw.text);
  const boilerplate = snapshot ? boilerplateLines(read) : new Set<string>();
  const textChars = SOURCE_INFO[scope.source].liveText ? 0 : JOB_LIMITS.feedDescriptionChars;
  const template = templateOf(
    board,
    fresh.map(({ raw, ext }) => ({ ext, url: raw.url })),
  );
  if (template !== board.urlTemplate) {
    await db.update(jobBoards).set({ urlTemplate: template }).where(eq(jobBoards.id, board.id));
  }

  const existing = new Map<number, number>();
  for (const part of chunks(
    fresh.map(({ id }) => id),
    500,
  )) {
    const rows = await db
      .select({ id: listings.id, hash: listings.hash })
      .from(listings)
      .where(inArray(listings.id, part));
    for (const row of rows) existing.set(row.id, row.hash);
  }

  const seenIds: number[] = [];
  const additions: Prepared[] = [];
  const changed: Prepared[] = [];
  for (const { raw, ext, id } of fresh) {
    const known = existing.get(id);
    if (known === undefined) {
      if (!raw.listingOnly)
        additions.push({ id, ext, job: normalizeJob(raw, now, boilerplate, textChars) });
      continue;
    }
    seenIds.push(id);
    if (raw.listingOnly || known === contentHash(raw)) continue;
    changed.push({ id, ext, job: normalizeJob(raw, now, boilerplate, textChars) });
  }
  const written = [...additions, ...changed];
  const sids = await skillIds(
    db,
    written.flatMap(({ job }) => job.keywords),
    now,
  );
  const canonical = await noteJobTitles(db, written, now);

  // Earlier boards and feeds win a tie; a feed's copy of a board's job is dropped either way.
  const keys =
    dedupe ?? (await openDedupeKeys(db, [...new Set(additions.map(({ job }) => job.dedupeKey))]));
  const mine = SOURCE_PRIORITY[scope.source];
  const inserts: (typeof listings.$inferInsert)[] = [];
  const displaced: number[] = [];
  for (const { id, ext, job } of additions) {
    const other = keys.get(job.dedupeKey);
    if (other && other.id !== id && other.priority <= mine) {
      stats.duplicates += 1;
      continue;
    }
    if (other && other.id !== id) displaced.push(other.id);
    keys.set(job.dedupeKey, { id, priority: mine });
    inserts.push({
      id,
      board: board.id,
      ext,
      seen: toMinutes(now),
      ...rowOf(job, board, ext, template, sids, canonical),
    });
  }

  await db.transaction(async (tx) => {
    for (const part of chunks(changed)) {
      const rewritten = await tx
        .update(listings)
        .set(rewriteSet())
        .from(
          rewriteValues(
            part.map(({ id, ext, job }) => ({
              id,
              row: rowOf(job, board, ext, template, sids, canonical),
            })),
          ),
        )
        .where(sql`${listings.id} = v.id`)
        .returning({ id: listings.id });
      stats.updated += rewritten.length;
    }

    for (const part of chunks(seenIds, 500)) {
      await tx
        .update(listings)
        .set({ missed: 0 })
        .where(and(inArray(listings.id, part), gt(listings.missed, 0)));
    }
    stats.seen = seenIds.length;

    for (const part of chunks(displaced, 500)) {
      const gone = await tx
        .delete(listings)
        .where(inArray(listings.id, part))
        .returning({ id: listings.id });
      stats.closed += gone.length;
    }
    for (const part of chunks(inserts)) {
      // A racing run with the same job just skips it.
      const added = await tx
        .insert(listings)
        .values(part)
        .onConflictDoNothing({ target: listings.id })
        .returning({ id: listings.id });
      stats.added += added.length;
      for (const row of added) seenIds.push(row.id);
    }

    if (snapshot) {
      const unseen = seenIds.length > 0 ? notInArray(listings.id, seenIds) : undefined;
      const gone = await tx
        .delete(listings)
        .where(
          and(
            inBoard(board.id),
            unseen,
            sql`${listings.missed} + 1 >= ${STORE_LIMITS.missedRunsToClose}`,
          ),
        )
        .returning({ id: listings.id });
      stats.closed += gone.length;
      await tx
        .update(listings)
        .set({ missed: sql`${listings.missed} + 1` })
        .where(and(inBoard(board.id), unseen));
    }

    const [open] = await tx.select({ n: count() }).from(listings).where(inBoard(board.id));
    await tx
      .update(jobBoards)
      .set({ lastFetchedAt: now, lastStatus: "ok", failures: 0, openJobs: open?.n ?? 0 })
      .where(eq(jobBoards.id, board.id));
  });
  return stats;
}

// Each title is noted once; a job that writes it differently from its first writing keeps its own text.
async function noteJobTitles(
  db: Db,
  jobs: readonly Prepared[],
  now: number,
): Promise<Map<number, string>> {
  const first = new Map<number, string>();
  for (const { job } of jobs) {
    const id = titleId(job.titleKey);
    if (!first.has(id)) first.set(id, job.title);
  }
  const canonical = new Map<number, string>();
  for (const part of chunks([...first], 500)) {
    await db
      .insert(titles)
      .values(part.map(([id, text]) => ({ id, text, seen: today(now) })))
      .onConflictDoNothing({ target: titles.id });
    const rows = await db
      .select({ id: titles.id, text: titles.text })
      .from(titles)
      .where(
        inArray(
          titles.id,
          part.map(([id]) => id),
        ),
      );
    for (const row of rows) canonical.set(row.id, row.text);
  }
  return canonical;
}

// The content hashes of a Workday site's stored jobs, by the ids its list gives.
export async function storedHashes(
  db: Db,
  scope: { source: JobSourceId; board: string },
  externalIds: readonly string[],
): Promise<Map<string, number>> {
  const board = await boardOf(db, scope.source, scope.board);
  const byId = new Map(
    externalIds.map((externalId) => [
      listingId(board.id, listingExt(scope.source, board.token, externalId)),
      externalId,
    ]),
  );
  const out = new Map<string, number>();
  for (const part of chunks([...byId.keys()], 500)) {
    const rows = await db
      .select({ id: listings.id, hash: listings.hash })
      .from(listings)
      .where(inArray(listings.id, part));
    for (const row of rows) {
      const externalId = byId.get(row.id);
      if (externalId !== undefined) out.set(externalId, row.hash);
    }
  }
  return out;
}

export async function dueAgain(
  db: Db,
  source: JobSourceId,
  token: string,
  at: number,
): Promise<void> {
  await db
    .update(jobBoards)
    .set({ lastFetchedAt: at })
    .where(and(eq(jobBoards.source, source), eq(jobBoards.token, token)));
}

export async function boardFailed(
  db: Db,
  source: JobSourceId,
  token: string,
  status: "not_found" | "failed",
  now: number,
): Promise<number> {
  const [row] = await db
    .update(jobBoards)
    .set({
      lastFetchedAt: now,
      lastStatus: status,
      failures: sql`case when ${jobBoards.lastStatus} = ${status} then ${jobBoards.failures} + 1 else 1 end`,
    })
    .where(and(eq(jobBoards.source, source), eq(jobBoards.token, token)))
    .returning({ id: jobBoards.id, failures: jobBoards.failures });
  if (row && status === "not_found" && row.failures >= STORE_LIMITS.notFoundToClose) {
    return closeBoard(db, row.id);
  }
  return 0;
}

export type TidyStats = { expired: number; aged: number; trimmed: number };

export async function tidyJobs(db: Db, now: number): Promise<TidyStats> {
  const expired = await db
    .delete(listings)
    .where(sql`${listings.valid} > 0 and ${listings.valid} < ${toMinutes(now)}`)
    .returning({ id: listings.id });
  const feeds = await db
    .select({ id: jobBoards.id })
    .from(jobBoards)
    .where(and(inArray(jobBoards.source, [...FEED_SOURCES]), eq(jobBoards.token, FEED_TOKEN)));
  let aged = 0;
  for (const feed of feeds) {
    const gone = await db
      .delete(listings)
      .where(
        and(
          inBoard(feed.id),
          sql`${listings.posted} < ${toMinutes(now - STORE_LIMITS.feedMaxAgeMs)}`,
        ),
      )
      .returning({ id: listings.id });
    aged += gone.length;
  }

  const [total] = await db.select({ n: count() }).from(listings);
  const excess = (total?.n ?? 0) - STORE_LIMITS.maxRows;
  let trimmed = 0;
  if (excess > 0) {
    const oldest = db
      .select({ id: listings.id })
      .from(listings)
      .orderBy(listings.posted)
      .limit(excess);
    const cut = await db
      .delete(listings)
      .where(sql`${listings.id} in ${oldest}`)
      .returning({ id: listings.id });
    trimmed = cut.length;
  }
  return { expired: expired.length, aged, trimmed };
}

export type JobsFileStats = { jobsFileMb: number; jobsDeadRows: number };

// Rewritten rows leave space the file keeps until a vacuum full, and the 500 MB database cap counts it.
export async function jobsFileStats(db: Db): Promise<JobsFileStats> {
  try {
    const [row] = rowsOf<{ mb: number; dead: number }>(
      await db.execute(sql`
        select round(pg_table_size('public.listings'::regclass) / 1048576.0, 1)::float8 as mb,
          coalesce((select n_dead_tup from pg_stat_user_tables where relid = 'public.listings'::regclass), 0)::int as dead`),
    );
    return { jobsFileMb: row?.mb ?? -1, jobsDeadRows: row?.dead ?? -1 };
  } catch {
    return { jobsFileMb: -1, jobsDeadRows: -1 };
  }
}

const MIN_SKILL_WEIGHT = 0.05;

export async function refreshSkillWeights(db: Db, now: number): Promise<number> {
  const counts = await db
    .select({ sid: sql<number>`k.sid`, n: sql<number>`count(*)::int` })
    .from(sql`${listings} cross join lateral unnest(${listings.skills}) as k(sid)`)
    .groupBy(sql`k.sid`);
  const [open] = await db.select({ n: count() }).from(listings);
  const total = open?.n ?? 0;
  const names = new Map(
    (
      await db
        .select({ skill: skills.skill, sid: skills.sid })
        .from(skills)
        .where(sql`${skills.sid} is not null`)
    ).map((row) => [row.sid!, row.skill]),
  );
  const rows = counts.flatMap((row) => {
    const skill = names.get(row.sid);
    return skill
      ? [
          {
            skill,
            openJobs: row.n,
            weight: Math.max(MIN_SKILL_WEIGHT, Math.log(total / row.n)),
            updatedAt: now,
          },
        ]
      : [];
  });
  await db.transaction(async (tx) => {
    await lockSkills(tx);
    // A skill no open post names keeps its id and loses its weight.
    await tx
      .update(skills)
      .set({ openJobs: 0, weight: null, updatedAt: now })
      .where(
        and(
          gt(skills.openJobs, 0),
          notInArray(
            skills.skill,
            rows.map((row) => row.skill),
          ),
        ),
      );
    for (const part of chunks(rows, 500)) {
      await tx
        .insert(skills)
        .values(part)
        .onConflictDoUpdate({
          target: skills.skill,
          set: {
            openJobs: sql.raw(`excluded.${skills.openJobs.name}`),
            weight: sql.raw(`excluded.${skills.weight.name}`),
            updatedAt: now,
          },
        });
    }
  });
  return rows.length;
}

// Weights and new skill ids are written one run at a time, so two runs never give out one id twice.
export async function lockSkills(tx: Tx): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext('job-feed:skills'))`);
}
