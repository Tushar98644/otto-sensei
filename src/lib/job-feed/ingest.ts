import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getDb, type Db } from "@/db/client";
import { jobBoards } from "@/db/schema";
import type { CronContext, CronOutcome } from "@/lib/cron/run";
import { JobReadError } from "@/lib/jobs/errors";
import { safeFetch } from "@/lib/jobs/fetch";
import { log } from "@/lib/log";
import { DAY_MS, HOUR_MS } from "@/lib/time";
import {
  FeedShapeError,
  parseAshby,
  parseGreenhouse,
  parseHimalayas,
  parseJobicy,
  parseLever,
  parsePersonio,
  parseRecruitee,
  parseRemoteOk,
  parseWorkable,
  type RawJob,
} from "./parsers";
import { rebuildMatchIndex } from "./match-index";
import { refreshVisaRegisters, VISA_REFRESH_AFTER_MS, visaCheckedAt } from "./visa-registers";
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
import {
  BOARD_SOURCES,
  FEED_SOURCES,
  type BoardSeed,
  type BoardSource,
  type FeedSource,
} from "./types";

export const INGEST_LIMITS = {
  maxBytes: 24 * 1024 * 1024,
  timeoutMs: 25_000,
  // More workers would outrun the 5-connection database pool.
  workers: 4,
  refreshAfterMs: 20 * HOUR_MS,
  himalayasPages: 10,
  jobicyPages: 25,
} as const;

// Lever's robots.txt asks for 1 s and Himalayas allows 60/min; the rest get a gentle pace.
export const HOST_SPACING_MS: Record<string, number> = {
  "boards-api.greenhouse.io": 300,
  "api.lever.co": 1_000,
  "api.ashbyhq.com": 500,
  "apply.workable.com": 3_000,
  "recruitee.com": 1_000,
  "jobs.personio.de": 1_000,
  "himalayas.app": 1_000,
  "remoteok.com": 1_000,
  "jobicy.com": 2_000,
};

export function paceKey(hostname: string, spacing: Record<string, number>): string {
  if (hostname in spacing) return hostname;
  const service = Object.keys(spacing).find((key) => hostname.endsWith(`.${key}`));
  return service ?? hostname;
}

export type IngestOptions = {
  db?: Db;
  seeds?: readonly BoardSeed[];
  maxBoards?: number;
  feeds?: boolean;
  himalayasPages?: number;
  spacing?: Record<string, number>;
  workers?: number;
  visa?: boolean;
};

const SOURCE_HOSTS: Record<BoardSource, string> = {
  greenhouse: "boards-api.greenhouse.io",
  lever: "api.lever.co",
  ashby: "api.ashbyhq.com",
  workable: "apply.workable.com",
  recruitee: "recruitee.com",
  personio: "jobs.personio.de",
};

function pacer(spacing: Record<string, number>, fallback: number) {
  const nextAt = new Map<string, number>();
  const wait = async (url: URL) => {
    const key = paceKey(url.hostname, spacing);
    const gap = spacing[key] ?? fallback;
    const now = Date.now();
    const at = Math.max(now, nextAt.get(key) ?? 0);
    nextAt.set(key, at + gap);
    if (at > now) await new Promise((resolve) => setTimeout(resolve, at - now));
  };
  wait.readyAt = (source: BoardSource) => nextAt.get(paceKey(SOURCE_HOSTS[source], spacing)) ?? 0;
  return wait;
}

type Pace = ReturnType<typeof pacer>;

const QUEUE_LOOKAHEAD = 50;

function takeBoard<T extends { source: string }>(queue: T[], pace: Pace): T | undefined {
  let best = -1;
  let bestAt = Number.POSITIVE_INFINITY;
  const now = Date.now();
  for (let i = 0; i < Math.min(queue.length, QUEUE_LOOKAHEAD); i++) {
    const at = pace.readyAt(queue[i]!.source as BoardSource);
    if (at <= now) {
      best = i;
      break;
    }
    if (at < bestAt) {
      bestAt = at;
      best = i;
    }
  }
  return best === -1 ? undefined : queue.splice(best, 1)[0];
}

async function getText(url: URL, kind: "json" | "xml", pace: Pace, deadline: number) {
  await pace(url);
  const res = await safeFetch(url, {
    kind,
    deadline,
    maxBytes: INGEST_LIMITS.maxBytes,
    timeoutMs: INGEST_LIMITS.timeoutMs,
  });
  return res.body;
}

async function getJson(url: URL, pace: Pace, deadline: number): Promise<unknown> {
  const body = await getText(url, "json", pace, deadline);
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new FeedShapeError(url.hostname);
  }
}

// Recruitee and Personio put the company in the host name, so a token must be one DNS label.
const HOST_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

function hostLabel(token: string): string {
  if (!HOST_LABEL.test(token)) throw new FeedShapeError(`bad token ${token}`);
  return token;
}

export function boardUrl(source: BoardSource, token: string): URL {
  const name = encodeURIComponent(token);
  switch (source) {
    case "greenhouse":
      return new URL(`https://boards-api.greenhouse.io/v1/boards/${name}/jobs?content=true`);
    case "lever":
      return new URL(`https://api.lever.co/v0/postings/${name}?mode=json`);
    case "ashby":
      return new URL(`https://api.ashbyhq.com/posting-api/job-board/${name}`);
    case "workable":
      return new URL(`https://apply.workable.com/api/v1/widget/accounts/${name}?details=true`);
    case "recruitee":
      return new URL(`https://${hostLabel(token)}.recruitee.com/api/offers/`);
    case "personio":
      return new URL(`https://${hostLabel(token)}.jobs.personio.de/xml?language=en`);
  }
}

async function readBoard(
  source: BoardSource,
  token: string,
  company: string,
  pace: Pace,
  deadline: number,
): Promise<RawJob[]> {
  const url = boardUrl(source, token);
  switch (source) {
    case "greenhouse":
      return parseGreenhouse(await getJson(url, pace, deadline), company);
    case "lever":
      return parseLever(await getJson(url, pace, deadline), company);
    case "ashby":
      return parseAshby(await getJson(url, pace, deadline), company);
    case "workable":
      return parseWorkable(await getJson(url, pace, deadline), company, token);
    case "recruitee":
      return parseRecruitee(await getJson(url, pace, deadline), company, token);
    case "personio":
      return parsePersonio(await getText(url, "xml", pace, deadline), company, url.hostname);
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

async function readFeed(
  source: FeedSource,
  lastFetchedAt: number | null,
  pace: Pace,
  deadline: number,
  himalayasPages: number,
): Promise<RawJob[]> {
  if (source === "remoteok") {
    return parseRemoteOk(await getJson(new URL("https://remoteok.com/api"), pace, deadline));
  }
  const raws: RawJob[] = [];
  let cursor: string | null = null;
  if (source === "himalayas") {
    for (let page = 0; page < himalayasPages && Date.now() < deadline; page++) {
      const url = new URL("https://himalayas.app/jobs/api?limit=20");
      if (cursor) url.searchParams.set("cursor", cursor);
      const result = parseHimalayas(await getJson(url, pace, deadline));
      raws.push(...result.jobs);
      cursor = result.nextCursor;
      if (!cursor || result.jobs.length === 0) break;
    }
    return raws;
  }
  // A day of overlap, so a job published during the last pass's 3-hour delay isn't missed.
  const seenUpTo = lastFetchedAt === null ? Number.NEGATIVE_INFINITY : lastFetchedAt - DAY_MS;
  for (let page = 0; page < INGEST_LIMITS.jobicyPages && Date.now() < deadline; page++) {
    const url = new URL("https://jobicy.com/api/jobs?count=100");
    if (cursor) url.searchParams.set("cursor", cursor);
    const result = parseJobicy(await getJson(url, pace, deadline));
    raws.push(...result.jobs);
    cursor = result.nextCursor;
    const oldest = Math.min(...result.jobs.map((job) => job.postedAt ?? Number.POSITIVE_INFINITY));
    if (!cursor || result.jobs.length === 0 || oldest < seenUpTo) break;
  }
  return raws;
}

async function readFeeds(
  db: Db,
  pace: Pace,
  now: number,
  deadline: number,
  himalayasPages: number,
  totals: Totals,
  failed: string[],
): Promise<void> {
  const due = await db
    .select({ source: jobBoards.source, lastFetchedAt: jobBoards.lastFetchedAt })
    .from(jobBoards)
    .where(and(eq(jobBoards.token, FEED_TOKEN), inArray(jobBoards.source, [...FEED_SOURCES])));
  for (const feed of due) {
    if (feed.lastFetchedAt !== null && now - feed.lastFetchedAt < INGEST_LIMITS.refreshAfterMs)
      continue;
    if (Date.now() >= deadline) return;
    const source = feed.source as FeedSource;
    try {
      const raws = await readFeed(source, feed.lastFetchedAt, pace, deadline, himalayasPages);
      add(totals, await saveJobs(db, { source, board: "" }, raws, Date.now(), { snapshot: false }));
      totals.feeds += 1;
    } catch (error) {
      totals.feedsFailed += 1;
      failed.push(source);
      log.warn("jobs.feed_failed", {
        source,
        reason:
          error instanceof JobReadError
            ? error.reason
            : error instanceof Error
              ? error.name
              : "unknown",
      });
      await boardFailed(db, source, FEED_TOKEN, failureStatus(error), Date.now());
    }
  }
}

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
      .where(inArray(jobBoards.source, [...BOARD_SOURCES]))
      .orderBy(sql`${jobBoards.lastFetchedAt} asc nulls first`, asc(jobBoards.token))
  )
    .filter(
      (board) =>
        board.lastFetchedAt === null || now - board.lastFetchedAt >= INGEST_LIMITS.refreshAfterMs,
    )
    .slice(0, options.maxBoards ?? Number.POSITIVE_INFINITY);

  const feeds =
    options.feeds === false
      ? Promise.resolve()
      : readFeeds(
          db,
          pace,
          now,
          deadline,
          options.himalayasPages ?? INGEST_LIMITS.himalayasPages,
          totals,
          failed,
        );

  let stopped = false;
  const worker = async () => {
    for (;;) {
      if (Date.now() >= deadline) {
        stopped = true;
        return;
      }
      const board = takeBoard(queue, pace);
      if (!board) return;
      const source = board.source as BoardSource;
      try {
        const raws = await readBoard(
          source,
          board.token,
          company.get(`${source}:${board.token}`) ?? board.token,
          pace,
          deadline,
        );
        add(
          totals,
          await saveJobs(db, { source, board: board.token }, raws, Date.now(), { snapshot: true }),
        );
        totals.boards += 1;
      } catch (error) {
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
  await Promise.all([
    feeds,
    ...Array.from({ length: options.workers ?? INGEST_LIMITS.workers }, worker),
  ]);

  const tidy = await tidyJobs(db, Date.now());
  const skills = await refreshSkillWeights(db, Date.now());
  let visa = -1;
  const visaAt = options.visa === false ? Date.now() : await visaCheckedAt(db);
  if ((visaAt === null || Date.now() - visaAt >= VISA_REFRESH_AFTER_MS) && Date.now() < deadline) {
    try {
      visa = (await refreshVisaRegisters(db, Date.now())).companies;
    } catch (error) {
      log.warn("jobs.visa_registers_failed", {}, error);
    }
  }
  // Last, so the match index, stored counts and every cached match list name this run.
  const indexed = await rebuildMatchIndex(db, Date.now());
  return {
    stats: {
      ...totals,
      ...tidy,
      skills,
      visa,
      indexed: indexed ?? -1,
      boardsLeft: queue.length,
    },
    complete: !stopped,
    failed,
  };
}
