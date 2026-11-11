import { and, count, eq, gt, inArray, isNull, lt, notInArray, or, sql } from "drizzle-orm";
import type { PgInsertValue } from "drizzle-orm/pg-core";
import type { Db } from "@/db/client";
import { applications, jobBoards, jobSkills, jobs, savedJobs } from "@/db/schema";
import { DAY_MS } from "@/lib/time";
import {
  boilerplateLines,
  contentHash,
  JOB_LIMITS,
  normalizeJob,
  type NormalizedJob,
} from "./normalize";
import type { RawJob } from "./parsers";
import { SOURCE_INFO } from "./sources";
import { BOARD_SOURCES, FEED_SOURCES, type BoardSeed, type JobSourceId } from "./types";

// Writes are keyed by (source, external id), so a repeated or overlapping run only finds less to
// do.

export const STORE_LIMITS = {
  // Keeps every open job of the biggest boards; matching's per-company cap stops crowding.
  perBoard: 1_000,
  // A job missing from this many reads of its board in a row is closed.
  missedRunsToClose: 2,
  // A board answering 404 this many times in a row is gone: its jobs close.
  notFoundToClose: 2,
  // Feeds show only the newest jobs, so dropping off says nothing; boards are read whole daily.
  feedMaxAgeMs: 30 * DAY_MS,
  // Saved or application-linked closed rows stay a month, so "This job has closed" still shows.
  closedRetentionMs: 7 * DAY_MS,
  referencedRetentionMs: 30 * DAY_MS,
  // A ceiling above the ~66,000 rows expected; at ~1.85 KB a row that's ~150 MB before bloat.
  maxRows: 80_000,
  writeChunk: 200,
} as const;

// One opening listed by an employer's own board beats the same one copied by a feed.
const SOURCE_PRIORITY: Record<JobSourceId, number> = {
  greenhouse: 0,
  lever: 0,
  ashby: 0,
  workable: 0,
  recruitee: 0,
  personio: 0,
  himalayas: 1,
  jobicy: 1,
  remoteok: 2,
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

const tsvector = (words: string) => sql`to_tsvector('simple', ${words})`;

function contentColumns(job: NormalizedJob) {
  return {
    company: job.company,
    title: job.title,
    location: job.location,
    remote: job.remote,
    employmentType: job.employmentType,
    seniority: job.seniority,
    family: job.family,
    occupation: job.occupation,
    minYears: job.minYears,
    postedAt: job.postedAt,
    validThrough: job.validThrough,
    url: job.url,
    description: job.description,
    rulesText: job.rulesText,
    keywords: job.keywords,
    search: tsvector(job.searchText),
    dedupeKey: job.dedupeKey,
    groupKey: job.groupKey,
    evergreen: job.evergreen,
    contentHash: job.contentHash,
  };
}

/** Drops boards no longer seeded. */
export async function syncBoards(
  db: Db,
  seeds: readonly BoardSeed[],
  now: number,
): Promise<number> {
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
      });
  }
  // A board taken off the list: its jobs close now instead of lingering unchecked.
  let dropped = 0;
  for (const source of BOARD_SOURCES) {
    const tokens = seeds.filter((seed) => seed.ats === source).map((seed) => seed.token);
    const gone = await db
      .delete(jobBoards)
      .where(
        tokens.length > 0
          ? and(eq(jobBoards.source, source), notInArray(jobBoards.token, tokens))
          : eq(jobBoards.source, source),
      )
      .returning({ token: jobBoards.token });
    for (const board of gone)
      dropped += await closeBoard(db, source, board.token, now, "board_gone");
  }
  return dropped;
}

async function closeBoard(
  db: Db,
  source: JobSourceId,
  board: string,
  now: number,
  reason: "board_gone" | "gone",
): Promise<number> {
  const closed = await db
    .update(jobs)
    .set({ closedAt: now, closeReason: reason, updatedAt: now })
    .where(and(eq(jobs.source, source), eq(jobs.board, board), isNull(jobs.closedAt)))
    .returning({ id: jobs.id });
  return closed.length;
}

// `snapshot`: the read holds every open job, so missing ones count a missed run. Feeds aren't.
export async function saveJobs(
  db: Db,
  scope: { source: JobSourceId; board: string },
  raws: readonly RawJob[],
  now: number,
  { snapshot }: { snapshot: boolean },
): Promise<SaveStats> {
  const stats: SaveStats = { added: 0, updated: 0, seen: 0, duplicates: 0, closed: 0 };
  const byId = new Map<string, RawJob>();
  for (const raw of [...raws].sort((a, b) => (b.postedAt ?? now) - (a.postedAt ?? now))) {
    if (!byId.has(raw.externalId)) byId.set(raw.externalId, raw);
  }
  const batch = [...byId.values()].slice(0, snapshot ? STORE_LIMITS.perBoard : byId.size);
  const feedCutoff = now - STORE_LIMITS.feedMaxAgeMs;
  const fresh = snapshot
    ? batch
    : batch.filter(
        (raw) => (raw.postedAt ?? now) >= feedCutoff && (raw.validThrough ?? now) >= now,
      );

  // Only a company's own board shares one intro across its jobs; a feed mixes companies.
  const boilerplate = snapshot ? boilerplateLines(fresh.map((raw) => raw.text)) : new Set<string>();
  // The text is kept only where it can't be read again (full-post.ts reads the rest live).
  const textChars = SOURCE_INFO[scope.source].liveText ? 0 : JOB_LIMITS.feedDescriptionChars;

  await db.transaction(async (tx) => {
    const existing = new Map<string, { id: string; hash: string }>();
    for (const part of chunks(
      fresh.map((raw) => raw.externalId),
      500,
    )) {
      const rows = await tx
        .select({ id: jobs.id, externalId: jobs.externalId, hash: jobs.contentHash })
        .from(jobs)
        .where(and(eq(jobs.source, scope.source), inArray(jobs.externalId, part)));
      for (const row of rows) existing.set(row.externalId, row);
    }

    const seenIds: string[] = [];
    const additions: NormalizedJob[] = [];
    for (const raw of fresh) {
      const known = existing.get(raw.externalId);
      if (!known) {
        additions.push(normalizeJob(raw, now, boilerplate, textChars));
        continue;
      }
      seenIds.push(known.id);
      if (known.hash === contentHash(raw)) continue;
      await tx
        .update(jobs)
        .set({
          ...contentColumns(normalizeJob(raw, now, boilerplate, textChars)),
          board: scope.board,
          lastSeenAt: now,
          updatedAt: now,
        })
        .where(eq(jobs.id, known.id));
      stats.updated += 1;
    }

    // Only rows seen again are written: rewriting unchanged rows leaves dead versions until vacuum.
    for (const part of chunks(seenIds, 500)) {
      await tx
        .update(jobs)
        .set({
          lastSeenAt: now,
          missedRuns: 0,
          closedAt: sql`case when ${jobs.closeReason} in ('gone', 'board_gone') then null else ${jobs.closedAt} end`,
          closeReason: sql`case when ${jobs.closeReason} in ('gone', 'board_gone') then null else ${jobs.closeReason} end`,
        })
        .where(
          and(
            inArray(jobs.id, part),
            or(gt(jobs.missedRuns, 0), inArray(jobs.closeReason, ["gone", "board_gone"])),
          ),
        );
    }
    stats.seen = seenIds.length;

    // One opening listed twice: the employer's own listing wins; within a source, the first stays.
    const keys = [...new Set(additions.map((job) => job.dedupeKey))];
    const open = new Map<string, { id: string; source: JobSourceId }>();
    for (const part of chunks(keys, 500)) {
      const rows = await tx
        .select({ id: jobs.id, source: jobs.source, key: jobs.dedupeKey })
        .from(jobs)
        .where(and(inArray(jobs.dedupeKey, part), isNull(jobs.closedAt)));
      for (const row of rows) open.set(row.key, row);
    }
    const mine = SOURCE_PRIORITY[scope.source];
    const inserts: PgInsertValue<typeof jobs>[] = [];
    const displaced: string[] = [];
    for (const job of additions) {
      const other = open.get(job.dedupeKey);
      if (other && SOURCE_PRIORITY[other.source] <= mine) {
        stats.duplicates += 1;
        continue;
      }
      if (other) displaced.push(other.id);
      const id = crypto.randomUUID();
      open.set(job.dedupeKey, { id, source: scope.source });
      inserts.push({
        id,
        source: scope.source,
        externalId: job.externalId,
        board: scope.board,
        ...contentColumns(job),
        firstSeenAt: now,
        lastSeenAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }
    for (const part of chunks(displaced, 500)) {
      const closed = await tx
        .update(jobs)
        .set({ closedAt: now, closeReason: "duplicate", updatedAt: now })
        .where(and(inArray(jobs.id, part), isNull(jobs.closedAt)))
        .returning({ id: jobs.id });
      stats.closed += closed.length;
    }
    for (const part of chunks(inserts)) {
      // Another source's id for this key can't collide; a racing run with the same id just skips.
      const added = await tx
        .insert(jobs)
        .values(part)
        .onConflictDoNothing({ target: [jobs.source, jobs.externalId] })
        .returning({ id: jobs.id });
      stats.added += added.length;
      for (const row of added) seenIds.push(row.id);
    }

    if (snapshot) {
      const missed = await tx
        .update(jobs)
        .set({
          missedRuns: sql`${jobs.missedRuns} + 1`,
          closedAt: sql`case when ${jobs.missedRuns} + 1 >= ${STORE_LIMITS.missedRunsToClose} then ${now}::bigint else null end`,
          closeReason: sql`case when ${jobs.missedRuns} + 1 >= ${STORE_LIMITS.missedRunsToClose} then 'gone' else null end`,
        })
        .where(
          and(
            eq(jobs.source, scope.source),
            eq(jobs.board, scope.board),
            isNull(jobs.closedAt),
            // Neither seen nor added by this read (at most perBoard ids).
            notInArray(jobs.id, seenIds),
          ),
        )
        .returning({ closedAt: jobs.closedAt });
      stats.closed += missed.filter((row) => row.closedAt !== null).length;
    }

    const [openCount] = await tx
      .select({ n: count() })
      .from(jobs)
      .where(
        and(eq(jobs.source, scope.source), eq(jobs.board, scope.board), isNull(jobs.closedAt)),
      );
    await tx
      .update(jobBoards)
      .set({ lastFetchedAt: now, lastStatus: "ok", failures: 0, openJobs: openCount?.n ?? 0 })
      .where(
        and(eq(jobBoards.source, scope.source), eq(jobBoards.token, scope.board || FEED_TOKEN)),
      );
  });
  return stats;
}

// Still moves the board to the back of the queue, so one broken board can't hold up the rest.
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
    .returning({ failures: jobBoards.failures });
  if (status === "not_found" && (row?.failures ?? 0) >= STORE_LIMITS.notFoundToClose) {
    return closeBoard(db, source, token === FEED_TOKEN ? "" : token, now, "board_gone");
  }
  return 0;
}

export type TidyStats = { expired: number; aged: number; deleted: number; trimmed: number };

export async function tidyJobs(db: Db, now: number): Promise<TidyStats> {
  const expired = await db
    .update(jobs)
    .set({ closedAt: now, closeReason: "expired", updatedAt: now })
    .where(and(isNull(jobs.closedAt), lt(jobs.validThrough, now)))
    .returning({ id: jobs.id });
  const aged = await db
    .update(jobs)
    .set({ closedAt: now, closeReason: "aged", updatedAt: now })
    .where(
      and(
        isNull(jobs.closedAt),
        inArray(jobs.source, [...FEED_SOURCES]),
        lt(jobs.postedAt, now - STORE_LIMITS.feedMaxAgeMs),
      ),
    )
    .returning({ id: jobs.id });

  let deleted = 0;
  for (;;) {
    const stale = db
      .select({ id: jobs.id })
      .from(jobs)
      .where(
        or(
          lt(jobs.closedAt, now - STORE_LIMITS.referencedRetentionMs),
          and(
            lt(jobs.closedAt, now - STORE_LIMITS.closedRetentionMs),
            sql`not exists (select 1 from ${savedJobs} where ${savedJobs.jobId} = ${jobs.id})`,
            sql`not exists (select 1 from ${applications} where ${applications.jobId} = ${jobs.id})`,
          ),
        ),
      )
      .limit(1_000);
    const gone = await db
      .delete(jobs)
      .where(sql`${jobs.id} in ${stale}`)
      .returning({ id: jobs.id });
    deleted += gone.length;
    if (gone.length < 1_000) break;
  }

  // Over the cap: closed rows go first, then the oldest open ones.
  const [total] = await db.select({ n: count() }).from(jobs);
  const excess = (total?.n ?? 0) - STORE_LIMITS.maxRows;
  let trimmed = 0;
  if (excess > 0) {
    const oldest = db
      .select({ id: jobs.id })
      .from(jobs)
      .orderBy(sql`${jobs.closedAt} is null`, sql`coalesce(${jobs.closedAt}, ${jobs.postedAt})`)
      .limit(excess);
    const cut = await db
      .delete(jobs)
      .where(sql`${jobs.id} in ${oldest}`)
      .returning({ id: jobs.id });
    trimmed = cut.length;
  }
  return { expired: expired.length, aged: aged.length, deleted, trimmed };
}

// A skill in every job still counts a little.
const MIN_SKILL_WEIGHT = 0.05;

// weight = ln(open jobs / jobs naming it).
export async function refreshSkillWeights(db: Db, now: number): Promise<number> {
  const counts = await db
    .select({ skill: sql<string>`k.skill`, n: sql<number>`count(*)::int` })
    .from(sql`${jobs} cross join lateral unnest(${jobs.keywords}) as k(skill)`)
    .where(isNull(jobs.closedAt))
    .groupBy(sql`k.skill`);
  const [open] = await db.select({ n: count() }).from(jobs).where(isNull(jobs.closedAt));
  const total = open?.n ?? 0;
  const rows = counts.map((row) => ({
    skill: row.skill,
    openJobs: row.n,
    weight: Math.max(MIN_SKILL_WEIGHT, Math.log(total / row.n)),
    updatedAt: now,
  }));
  await db.transaction(async (tx) => {
    await tx.delete(jobSkills);
    for (const part of chunks(rows, 500)) await tx.insert(jobSkills).values(part);
  });
  return rows.length;
}
