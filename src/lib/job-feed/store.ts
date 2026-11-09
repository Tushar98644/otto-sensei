import { and, count, eq, inArray, isNull, lt, notInArray, sql } from "drizzle-orm";
import type { PgInsertValue } from "drizzle-orm/pg-core";
import type { Db } from "@/db/client";
import { jobBoards, jobSkills, jobs } from "@/db/schema";
import { boilerplateLines, contentHash, normalizeJob, type NormalizedJob } from "./normalize";
import type { RawJob } from "./parsers";
import { BOARD_SOURCES, type BoardSeed, type JobSourceId } from "./types";

// Server-only. Writing what the ingest read. Every write is keyed by (source, external id), so a
// repeated or overlapping run only finds less to do.

const DAY_MS = 24 * 60 * 60 * 1_000;

export const STORE_LIMITS = {
  // Newest jobs kept per company board. 1,000 keeps every open job of the biggest boards (Databricks
  // had 922 on 2026-11-08), so the stored count matches what the boards list; the per-company cap in
  // matching (order.ts) is what stops one board crowding out the rest.
  perBoard: 1_000,
  // A job missing from this many reads of its board in a row is closed.
  missedRunsToClose: 2,
  // A board answering 404 this many times in a row is gone: its jobs close.
  notFoundToClose: 2,
  // The feeds (Himalayas, Remote OK) show the newest jobs only, so a job dropping off them says
  // nothing; their jobs close at their own end date or at this age.
  feedMaxAgeMs: 30 * DAY_MS,
  closedRetentionMs: 30 * DAY_MS,
  // Open and closed rows together. 2026-11-08: 27,833 open jobs on the 323 boards, and closed ones
  // stay 30 days, so 20,000 was trimming open jobs. 50,000 holds those plus a month of closed rows
  // with about a third to spare, and at the 5.9 KB a row measured on 2026-11-09 (text, search
  // vector and indexes) it is about 290 MB: inside Supabase Free's 500 MB with the other tables.
  maxRows: 50_000,
  writeChunk: 200,
} as const;

// One opening listed by an employer's own board beats the same one copied by a feed.
const SOURCE_PRIORITY: Record<JobSourceId, number> = {
  greenhouse: 0,
  lever: 0,
  ashby: 0,
  himalayas: 1,
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

/** Upserts the board rows for the seed list and the two feeds; drops boards no longer seeded. */
export async function syncBoards(
  db: Db,
  seeds: readonly BoardSeed[],
  now: number,
): Promise<number> {
  const rows = [
    ...seeds.map((seed) => ({ source: seed.ats, token: seed.token, company: seed.company })),
    { source: "himalayas" as const, token: FEED_TOKEN, company: "" },
    { source: "remoteok" as const, token: FEED_TOKEN, company: "" },
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

/**
 * Saves one read of a board or feed. `snapshot`: the read holds every open job of the board, so
 * jobs missing from it count a missed run (and close after two). Feeds aren't snapshots.
 */
export async function saveJobs(
  db: Db,
  scope: { source: JobSourceId; board: string },
  raws: readonly RawJob[],
  now: number,
  { snapshot }: { snapshot: boolean },
): Promise<SaveStats> {
  const stats: SaveStats = { added: 0, updated: 0, seen: 0, duplicates: 0, closed: 0 };
  // The newest first, one per external id.
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
        additions.push(normalizeJob(raw, now, boilerplate));
        continue;
      }
      seenIds.push(known.id);
      if (known.hash === contentHash(raw)) continue;
      await tx
        .update(jobs)
        .set({
          ...contentColumns(normalizeJob(raw, now, boilerplate)),
          board: scope.board,
          updatedAt: now,
        })
        .where(eq(jobs.id, known.id));
      stats.updated += 1;
    }

    // Seen again: the miss count starts over, and a job closed for going missing reopens.
    for (const part of chunks(seenIds, 500)) {
      await tx
        .update(jobs)
        .set({
          lastSeenAt: now,
          missedRuns: 0,
          closedAt: sql`case when ${jobs.closeReason} in ('gone', 'board_gone') then null else ${jobs.closedAt} end`,
          closeReason: sql`case when ${jobs.closeReason} in ('gone', 'board_gone') then null else ${jobs.closeReason} end`,
        })
        .where(inArray(jobs.id, part));
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
            lt(jobs.lastSeenAt, now),
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

/**
 * Records a failed read. It still moves the board to the back of the queue, so one broken board
 * can't hold up the rest. Two 404s in a row mean the board is gone, and its jobs close.
 */
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

/** Closes jobs past their end date or age, deletes long-closed rows, and keeps the row cap. */
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
        inArray(jobs.source, ["himalayas", "remoteok"]),
        lt(jobs.postedAt, now - STORE_LIMITS.feedMaxAgeMs),
      ),
    )
    .returning({ id: jobs.id });

  let deleted = 0;
  for (;;) {
    const stale = db
      .select({ id: jobs.id })
      .from(jobs)
      .where(lt(jobs.closedAt, now - STORE_LIMITS.closedRetentionMs))
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

// A skill no open job names can't match anything, so its weight never matters; one in every job
// still counts for a little.
const MIN_SKILL_WEIGHT = 0.05;

/**
 * Rewrites job_skills from the open jobs: how many name each skill, and its weight in matching,
 * ln(open jobs / jobs naming it). One grouped read of the keywords column, a few hundred rows out.
 */
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
