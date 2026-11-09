import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getDb, type Db } from "@/db/client";
import { jobBoards } from "@/db/schema";
import type { CronContext, CronOutcome } from "@/lib/cron/run";
import { JobReadError } from "@/lib/jobs/errors";
import { safeFetch } from "@/lib/jobs/fetch";
import { log } from "@/lib/log";
import {
  FeedShapeError,
  parseAshby,
  parseGreenhouse,
  parseHimalayas,
  parseLever,
  parseRemoteOk,
  type RawJob,
} from "./parsers";
import { BOARD_SEEDS } from "./seeds";
import {
  boardFailed,
  FEED_TOKEN,
  refreshSkillWeights,
  saveJobs,
  syncBoards,
  tidyJobs,
  type SaveStats,
} from "./store";
import type { BoardSeed, BoardSource } from "./types";

// Server-only. The daily read of every source (GET /api/cron/jobs). Boards are read oldest-read
// first, a few at a time, each host no faster than its own pace, until the time budget runs out;
// the next run starts with whatever this one didn't reach. All reads go through the SSRF-safe
// transport, send no cookies and name the bot.

const HOUR_MS = 60 * 60 * 1_000;

export const INGEST_LIMITS = {
  // Whole company boards can be several megabytes of descriptions (Ashby's OpenAI board was 14 MB).
  maxBytes: 24 * 1024 * 1024,
  timeoutMs: 25_000,
  // Read in parallel, on different hosts where the queue allows.
  workers: 3,
  // A board read within this long isn't read again, so a second run the same day is cheap.
  refreshAfterMs: 20 * HOUR_MS,
  // Himalayas holds 100,000+ jobs, 20 per page, newest first: the newest 200 a day is plenty.
  himalayasPages: 10,
} as const;

// Time between requests to one host. Lever's robots.txt asks for a 1-second crawl delay;
// Himalayas allows 60 requests a minute; the others state none, so they get a gentle pace.
export const HOST_SPACING_MS: Record<string, number> = {
  "boards-api.greenhouse.io": 300,
  "api.lever.co": 1_000,
  "api.ashbyhq.com": 500,
  "himalayas.app": 1_000,
  "remoteok.com": 1_000,
};

export type IngestOptions = {
  db?: Db;
  seeds?: readonly BoardSeed[];
  // At most this many company boards this run (the dev script's --limit).
  maxBoards?: number;
  feeds?: boolean;
  himalayasPages?: number;
  // Time between requests per host, instead of HOST_SPACING_MS; hosts not named get none. Tests
  // pass {} to run without pauses.
  spacing?: Record<string, number>;
  workers?: number;
};

// Requests to one host start at least its spacing apart, across all workers.
function pacer(spacing: Record<string, number>, fallback: number) {
  const nextAt = new Map<string, number>();
  return async (url: URL) => {
    const gap = spacing[url.hostname] ?? fallback;
    const now = Date.now();
    const at = Math.max(now, nextAt.get(url.hostname) ?? 0);
    nextAt.set(url.hostname, at + gap);
    if (at > now) await new Promise((resolve) => setTimeout(resolve, at - now));
  };
}

type Pace = ReturnType<typeof pacer>;

async function getJson(url: URL, pace: Pace, deadline: number): Promise<unknown> {
  await pace(url);
  const res = await safeFetch(url, {
    kind: "json",
    deadline,
    maxBytes: INGEST_LIMITS.maxBytes,
    timeoutMs: INGEST_LIMITS.timeoutMs,
  });
  try {
    return JSON.parse(res.body) as unknown;
  } catch {
    throw new FeedShapeError(url.hostname);
  }
}

/** The board's API address. Lever boards in the EU answer on their own host. */
export function boardUrl(source: BoardSource, token: string): URL {
  const name = encodeURIComponent(token);
  switch (source) {
    case "greenhouse":
      return new URL(`https://boards-api.greenhouse.io/v1/boards/${name}/jobs?content=true`);
    case "lever":
      return new URL(`https://api.lever.co/v0/postings/${name}?mode=json`);
    case "ashby":
      return new URL(`https://api.ashbyhq.com/posting-api/job-board/${name}`);
  }
}

function parseBoard(source: BoardSource, json: unknown, company: string): RawJob[] {
  switch (source) {
    case "greenhouse":
      return parseGreenhouse(json, company);
    case "lever":
      return parseLever(json, company);
    case "ashby":
      return parseAshby(json, company);
  }
}

type Totals = SaveStats & {
  boards: number;
  boardsFailed: number;
  feeds: number;
  feedsFailed: number;
};

function add(totals: Totals, stats: SaveStats) {
  totals.added += stats.added;
  totals.updated += stats.updated;
  totals.seen += stats.seen;
  totals.duplicates += stats.duplicates;
  totals.closed += stats.closed;
}

function failureStatus(error: unknown): "not_found" | "failed" {
  return error instanceof JobReadError && error.reason === "not_found" ? "not_found" : "failed";
}

async function readFeeds(
  db: Db,
  pace: Pace,
  now: number,
  deadline: number,
  pages: number,
  totals: Totals,
  failed: string[],
): Promise<void> {
  const due = await db
    .select({ source: jobBoards.source, lastFetchedAt: jobBoards.lastFetchedAt })
    .from(jobBoards)
    .where(
      and(eq(jobBoards.token, FEED_TOKEN), inArray(jobBoards.source, ["himalayas", "remoteok"])),
    );
  for (const feed of due) {
    if (feed.lastFetchedAt !== null && now - feed.lastFetchedAt < INGEST_LIMITS.refreshAfterMs)
      continue;
    if (Date.now() >= deadline) return;
    try {
      let raws: RawJob[] = [];
      if (feed.source === "remoteok") {
        raws = parseRemoteOk(await getJson(new URL("https://remoteok.com/api"), pace, deadline));
      } else {
        let cursor: string | null = null;
        for (let page = 0; page < pages && Date.now() < deadline; page++) {
          const url = new URL("https://himalayas.app/jobs/api?limit=20");
          if (cursor) url.searchParams.set("cursor", cursor);
          const result = parseHimalayas(await getJson(url, pace, deadline));
          raws.push(...result.jobs);
          cursor = result.nextCursor;
          if (!cursor || result.jobs.length === 0) break;
        }
      }
      add(
        totals,
        await saveJobs(db, { source: feed.source, board: "" }, raws, Date.now(), {
          snapshot: false,
        }),
      );
      totals.feeds += 1;
    } catch (error) {
      totals.feedsFailed += 1;
      failed.push(feed.source);
      log.warn("jobs.feed_failed", {
        source: feed.source,
        reason:
          error instanceof JobReadError
            ? error.reason
            : error instanceof Error
              ? error.name
              : "unknown",
      });
      await boardFailed(db, feed.source, FEED_TOKEN, failureStatus(error), Date.now());
    }
  }
}

/** One ingest run. Idempotent: running it twice only finds less to read. */
export async function runJobsIngest(
  { now, deadline }: CronContext,
  options: IngestOptions = {},
): Promise<CronOutcome> {
  const db = options.db ?? (await getDb());
  const seeds = options.seeds ?? BOARD_SEEDS;
  const pace = options.spacing ? pacer(options.spacing, 0) : pacer(HOST_SPACING_MS, 1_000);
  const totals: Totals = {
    added: 0,
    updated: 0,
    seen: 0,
    duplicates: 0,
    closed: 0,
    boards: 0,
    boardsFailed: 0,
    feeds: 0,
    feedsFailed: 0,
  };
  const failed: string[] = [];

  totals.closed += await syncBoards(db, seeds, now);
  const company = new Map(seeds.map((seed) => [`${seed.ats}:${seed.token}`, seed.company]));
  const queue = (
    await db
      .select({
        source: jobBoards.source,
        token: jobBoards.token,
        lastFetchedAt: jobBoards.lastFetchedAt,
      })
      .from(jobBoards)
      .where(inArray(jobBoards.source, ["greenhouse", "lever", "ashby"]))
      .orderBy(sql`${jobBoards.lastFetchedAt} asc nulls first`, asc(jobBoards.token))
  )
    .filter(
      (board) =>
        board.lastFetchedAt === null || now - board.lastFetchedAt >= INGEST_LIMITS.refreshAfterMs,
    )
    .slice(0, options.maxBoards ?? Number.POSITIVE_INFINITY);

  if (options.feeds !== false) {
    await readFeeds(
      db,
      pace,
      now,
      deadline,
      options.himalayasPages ?? INGEST_LIMITS.himalayasPages,
      totals,
      failed,
    );
  }

  let next = 0;
  let stopped = false;
  const worker = async () => {
    for (;;) {
      if (Date.now() >= deadline) {
        stopped = true;
        return;
      }
      const board = queue[next++];
      if (!board) return;
      const source = board.source as BoardSource;
      try {
        const json = await getJson(boardUrl(source, board.token), pace, deadline);
        const raws = parseBoard(
          source,
          json,
          company.get(`${source}:${board.token}`) ?? board.token,
        );
        add(
          totals,
          await saveJobs(db, { source, board: board.token }, raws, Date.now(), { snapshot: true }),
        );
        totals.boards += 1;
      } catch (error) {
        // A board that fails is retried tomorrow; its jobs stay as they were.
        totals.boardsFailed += 1;
        if (!(error instanceof JobReadError || error instanceof FeedShapeError)) {
          log.error("jobs.board_failed", error, { source, token: board.token });
        }
        totals.closed += await boardFailed(
          db,
          source,
          board.token,
          failureStatus(error),
          Date.now(),
        );
      }
    }
  };
  await Promise.all(Array.from({ length: options.workers ?? INGEST_LIMITS.workers }, worker));

  const tidy = await tidyJobs(db, Date.now());
  const skills = await refreshSkillWeights(db, Date.now());
  return {
    stats: { ...totals, ...tidy, skills, boardsLeft: Math.max(0, queue.length - next) },
    complete: !stopped,
    // A board's own failure is routine (a renamed board, a slow host) and retried tomorrow; only a
    // feed failing marks the run, since each feed is one request a day.
    failed,
  };
}
