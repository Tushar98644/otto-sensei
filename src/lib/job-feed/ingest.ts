import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getDb, type Db } from "@/db/client";
import { jobBoards } from "@/db/schema";
import type { CronContext, CronOutcome } from "@/lib/cron/run";
import { env } from "@/lib/env";
import { JobReadError } from "@/lib/jobs/errors";
import { safeFetch } from "@/lib/jobs/fetch";
import { log } from "@/lib/log";
import { DAY_MS, HOUR_MS } from "@/lib/time";
import {
  FeedShapeError,
  parseAshby,
  parseGem,
  parseGreenhouse,
  parseHimalayas,
  parseJobicy,
  parseJobvite,
  parseLever,
  parsePersonio,
  parsePinpoint,
  parseRecruitee,
  parseRemoteOk,
  parseUsajobs,
  parseWorkable,
  USAJOBS_PAGE_SIZE,
  workdayBoard,
  workdayListUrl,
  type RawJob,
} from "./parsers";
import { joinLocation } from "./parsers/shared";
import { jobPlaceTokens } from "./job-places";
import { noteBoardsRead, readStoredCounts, rebuildMatchIndex } from "./match-index";
import { readWorkday, WORKDAY_LIMITS } from "./workday";
import { refreshVisaRegisters, VISA_REFRESH_AFTER_MS, visaCheckedAt } from "./visa-registers";
import { BOARD_SEEDS } from "./seeds";
import {
  boardFailed,
  dueAgain,
  FEED_TOKEN,
  jobsFileStats,
  openDedupeKeys,
  refreshSkillWeights,
  saveJobs,
  storedHashes,
  syncBoards,
  tidyJobs,
  type DedupeKeys,
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
  // Workers a Workday site may hold while other boards wait; it spends most of a read waiting on its own host.
  workdayWorkers: 2,
  refreshAfterMs: 20 * HOUR_MS,
  // A Workday site costs a request per 20 jobs listed and one per new post, so it's read every other day.
  workdayRefreshAfterMs: 44 * HOUR_MS,
  himalayasPages: 10,
  jobicyPages: 25,
  // 500 a page; the API answers at most 10,000 rows a query.
  usajobsPages: 20,
  // The closing rebuild's finishing passes, within a cron call's last minute.
  finishMs: 15_000,
} as const;

// Lever's robots.txt asks for 1 s and Himalayas allows 60/min; the rest get a gentle pace.
export const HOST_SPACING_MS: Record<string, number> = {
  "boards-api.greenhouse.io": 300,
  "api.lever.co": 1_000,
  "api.ashbyhq.com": 500,
  "apply.workable.com": 3_000,
  "recruitee.com": 1_000,
  "jobs.personio.de": 1_000,
  "api.gem.com": 500,
  "pinpointhq.com": 1_000,
  // Jobvite refused a second feed 5 s after a large one, never at 15 s.
  "app.jobvite.com": 15_000,
  "himalayas.app": 1_000,
  "remoteok.com": 1_000,
  "jobicy.com": 2_000,
  "data.usajobs.gov": 1_000,
  // Every Workday tenant is its own host, read one request at a time (owner decision 2026-11-22).
  "*.myworkdayjobs.com": 1_500,
};

export function paceKey(hostname: string, spacing: Record<string, number>): string {
  if (hostname in spacing) return hostname;
  const service = Object.keys(spacing).find(
    (key) => !key.startsWith("*.") && hostname.endsWith(`.${key}`),
  );
  return service ?? hostname;
}

function gapOf(hostname: string, spacing: Record<string, number>, fallback: number): number {
  const key = paceKey(hostname, spacing);
  if (key in spacing) return spacing[key]!;
  const each = Object.keys(spacing).find(
    (rule) => rule.startsWith("*.") && hostname.endsWith(rule.slice(1)),
  );
  return each ? spacing[each]! : fallback;
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
  // How long the closing rebuild may spend finishing rows the compact-jobs migration copied.
  finishMs?: number;
};

const SOURCE_HOSTS: Record<Exclude<BoardSource, "workday">, string> = {
  greenhouse: "boards-api.greenhouse.io",
  lever: "api.lever.co",
  ashby: "api.ashbyhq.com",
  workable: "apply.workable.com",
  recruitee: "recruitee.com",
  personio: "jobs.personio.de",
  gem: "api.gem.com",
  pinpoint: "pinpointhq.com",
  jobvite: "app.jobvite.com",
};

function boardHost(source: BoardSource, token: string): string {
  if (source !== "workday") return SOURCE_HOSTS[source];
  try {
    return workdayBoard(token).host;
  } catch {
    return token;
  }
}

function pacer(spacing: Record<string, number>, fallback: number) {
  const nextAt = new Map<string, number>();
  const wait = async (url: URL) => {
    const key = paceKey(url.hostname, spacing);
    const gap = gapOf(url.hostname, spacing, fallback);
    const now = Date.now();
    const at = Math.max(now, nextAt.get(key) ?? 0);
    nextAt.set(key, at + gap);
    if (at > now) await new Promise((resolve) => setTimeout(resolve, at - now));
  };
  wait.readyAt = (host: string) => nextAt.get(paceKey(host, spacing)) ?? 0;
  return wait;
}

type Pace = ReturnType<typeof pacer>;

const refreshAfter = (source: BoardSource) =>
  source === "workday" ? INGEST_LIMITS.workdayRefreshAfterMs : INGEST_LIMITS.refreshAfterMs;

const QUEUE_LOOKAHEAD = 50;

function takeBoard<T extends { source: string; token: string }>(
  queue: T[],
  pace: Pace,
  workday: boolean,
): T | undefined {
  let best = -1;
  let bestAt = Number.POSITIVE_INFINITY;
  const now = Date.now();
  for (let i = 0, looked = 0; i < queue.length && looked < QUEUE_LOOKAHEAD; i++) {
    const board = queue[i]!;
    if (board.source === "workday" && !workday) continue;
    looked += 1;
    const at = pace.readyAt(boardHost(board.source as BoardSource, board.token));
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

async function getText(
  url: URL,
  kind: "json" | "xml" | "text",
  pace: Pace,
  deadline: number,
  json?: unknown,
  headers?: Record<string, string>,
) {
  await pace(url);
  const res = await safeFetch(url, {
    kind,
    deadline,
    maxBytes: INGEST_LIMITS.maxBytes,
    timeoutMs: INGEST_LIMITS.timeoutMs,
    json,
    headers,
  });
  return res.body;
}

async function getJson(
  url: URL,
  pace: Pace,
  deadline: number,
  json?: unknown,
  headers?: Record<string, string>,
): Promise<unknown> {
  const body = await getText(url, "json", pace, deadline, json, headers);
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

// A Jobvite company id, as its careers page and feed links carry it.
const JOBVITE_ID = /^[A-Za-z0-9]{4,20}$/;

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
    case "gem":
      return new URL(`https://api.gem.com/job_board/v0/${name}/job_posts/`);
    case "pinpoint":
      return new URL(`https://${hostLabel(token)}.pinpointhq.com/postings.json`);
    case "jobvite":
      if (!JOBVITE_ID.test(token)) throw new FeedShapeError(`bad token ${token}`);
      return new URL(`https://app.jobvite.com/CompanyJobs/Xml.aspx?c=${token}`);
    case "workday":
      return workdayListUrl(workdayBoard(token));
  }
}

type BoardRead = { raws: RawJob[]; partial: boolean };

async function readBoard(
  db: Db,
  source: BoardSource,
  token: string,
  company: string,
  pace: Pace,
  deadline: number,
): Promise<BoardRead> {
  if (source === "workday") {
    return readWorkday(
      workdayBoard(token),
      company,
      {
        json: (url, body) => getJson(url, pace, deadline, body),
        text: (url) => getText(url, "text", pace, deadline),
      },
      (ids) => storedHashes(db, { source: "workday", board: token }, ids),
      { readAt: Date.now(), deadline },
    );
  }
  return { raws: await readList(source, token, company, pace, deadline), partial: false };
}

async function readList(
  source: Exclude<BoardSource, "workday">,
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
    case "gem":
      return parseGem(await getJson(url, pace, deadline), company);
    case "pinpoint":
      return parsePinpoint(await getJson(url, pace, deadline), company, url.hostname);
    case "jobvite":
      return parseJobvite(await getText(url, "xml", pace, deadline), company, token);
  }
}

type Totals = SaveStats & {
  boards: number;
  boardsFailed: number;
  boardsPartial: number;
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

// A post that names no place is in the employer's one country, so it shows only to people who can work there.
export function withPlace(raws: RawJob[], place: string | undefined): RawJob[] {
  if (!place) return raws;
  return raws.map((raw) =>
    jobPlaceTokens(raw.location).some((token) => token !== "*")
      ? raw
      : { ...raw, location: joinLocation([raw.location, place]) },
  );
}

function failureStatus(error: unknown): "not_found" | "failed" {
  return error instanceof JobReadError && error.reason === "not_found" ? "not_found" : "failed";
}

type UsajobsAccess = { key: string; email: string };

// USAJOBS stays off until the owner sets the key and the email it was registered with (docs/setup.md 10f).
function usajobsAccess(): UsajobsAccess | null {
  const { USAJOBS_API_KEY: key, USAJOBS_EMAIL: email } = env();
  return key && email ? { key, email } : null;
}

export function usajobsUrl(page: number): URL {
  const url = new URL("https://data.usajobs.gov/api/Search");
  url.search = new URLSearchParams({
    WhoMayApply: "Public",
    DatePosted: "30",
    SortField: "opendate",
    SortDirection: "desc",
    Fields: "full",
    ResultsPerPage: String(USAJOBS_PAGE_SIZE),
    Page: String(page),
  }).toString();
  return url;
}

async function readUsajobs(access: UsajobsAccess, pace: Pace, deadline: number) {
  // The API's own rule: the registered email as the user agent, and the key.
  const headers = { "user-agent": access.email, "authorization-key": access.key };
  const raws: RawJob[] = [];
  for (let page = 1; page <= INGEST_LIMITS.usajobsPages && Date.now() < deadline; page++) {
    const result = parseUsajobs(
      await getJson(usajobsUrl(page), pace, deadline, undefined, headers),
    );
    raws.push(...result.jobs);
    if (result.count < USAJOBS_PAGE_SIZE || page * USAJOBS_PAGE_SIZE >= result.total) break;
  }
  return raws;
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
  if (source === "usajobs") {
    const access = usajobsAccess();
    return access ? readUsajobs(access, pace, deadline) : [];
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
  dedupe: DedupeKeys,
): Promise<void> {
  const due = await db
    .select({ source: jobBoards.source, lastFetchedAt: jobBoards.lastFetchedAt })
    .from(jobBoards)
    .where(and(eq(jobBoards.token, FEED_TOKEN), inArray(jobBoards.source, [...FEED_SOURCES])));
  for (const feed of due) {
    if (feed.lastFetchedAt !== null && now - feed.lastFetchedAt < INGEST_LIMITS.refreshAfterMs)
      continue;
    if (feed.source === "usajobs" && !usajobsAccess()) continue;
    if (Date.now() >= deadline) return;
    const source = feed.source as FeedSource;
    try {
      const raws = await readFeed(source, feed.lastFetchedAt, pace, deadline, himalayasPages);
      add(
        totals,
        await saveJobs(db, { source, board: "" }, raws, Date.now(), { snapshot: false, dedupe }),
      );
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

async function refreshVisaIfDue(db: Db, deadline: number): Promise<number> {
  const checkedAt = await visaCheckedAt(db);
  if (checkedAt !== null && Date.now() - checkedAt < VISA_REFRESH_AFTER_MS) return -1;
  if (Date.now() >= deadline) return -1;
  try {
    return (await refreshVisaRegisters(db, Date.now())).companies;
  } catch (error) {
    log.warn("jobs.visa_registers_failed", {}, error);
    return -1;
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
    boardsPartial: 0,
    feeds: 0,
    feedsFailed: 0,
  };
  const failed: string[] = [];

  // First, so slow register downloads only shorten the board reads and the closing rebuild has the new facts.
  const visa = options.visa === false ? -1 : await refreshVisaIfDue(db, deadline);
  totals.closed += await syncBoards(db, seeds);
  const dedupe = await openDedupeKeys(db);
  const company = new Map(seeds.map((seed) => [`${seed.ats}:${seed.token}`, seed.company]));
  const place = new Map(seeds.map((seed) => [`${seed.ats}:${seed.token}`, seed.place]));
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
        board.lastFetchedAt === null ||
        now - board.lastFetchedAt >= refreshAfter(board.source as BoardSource),
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
          dedupe,
        );

  let stopped = false;
  let workdayBusy = 0;
  const worker = async () => {
    for (;;) {
      if (Date.now() >= deadline) {
        stopped = true;
        return;
      }
      // A Workday read needs a minute for its list, so none starts that close to the deadline.
      const early = deadline - Date.now() >= WORKDAY_LIMITS.startBeforeMs;
      const alone = queue.every((board) => board.source === "workday");
      const workday = early && (alone || workdayBusy < INGEST_LIMITS.workdayWorkers);
      const board = takeBoard(queue, pace, workday);
      if (!board) {
        if (queue.length > 0) stopped = true;
        return;
      }
      const source = board.source as BoardSource;
      if (source === "workday") workdayBusy += 1;
      try {
        const { raws, partial } = await readBoard(
          db,
          source,
          board.token,
          company.get(`${source}:${board.token}`) ?? board.token,
          pace,
          deadline,
        );
        const placed = withPlace(raws, place.get(`${source}:${board.token}`));
        add(
          totals,
          await saveJobs(db, { source, board: board.token }, placed, Date.now(), {
            snapshot: true,
            dedupe,
          }),
        );
        totals.boards += 1;
        if (partial) {
          totals.boardsPartial += 1;
          await dueAgain(db, source, board.token, Date.now() - refreshAfter(source));
        }
      } catch (error) {
        // Cut off by the call's own deadline: not the board's fault, so the next call reads it.
        if (error instanceof JobReadError && error.reason === "timeout" && Date.now() >= deadline) {
          stopped = true;
          continue;
        }
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
      } finally {
        if (source === "workday") workdayBusy -= 1;
      }
    }
  };
  await Promise.all([
    feeds,
    ...Array.from({ length: options.workers ?? INGEST_LIMITS.workers }, worker),
  ]);

  const tidy = await tidyJobs(db, Date.now());
  // A call that added, changed and closed nothing leaves the weights, the index and cached Matches pages as they are.
  const changed =
    visa > 0 ||
    totals.added + totals.updated + totals.closed > 0 ||
    tidy.expired + tidy.aged + tidy.trimmed > 0 ||
    (await readStoredCounts(db)) === null;
  const skills = changed ? await refreshSkillWeights(db, Date.now()) : -1;
  // Last, so the match index, stored counts and every cached match list name this run.
  const indexed = changed
    ? await rebuildMatchIndex(db, Date.now(), {
        finishMs: options.finishMs ?? INGEST_LIMITS.finishMs,
      })
    : await noteBoardsRead(db);
  return {
    stats: {
      ...totals,
      ...tidy,
      skills,
      visa,
      indexed: indexed ?? -1,
      indexSkipped: changed ? 0 : 1,
      boardsLeft: queue.length,
      ...(await jobsFileStats(db)),
    },
    // A board with posts left to read is due again, so the next call carries on with it.
    complete: !stopped && totals.boardsPartial === 0,
    failed,
  };
}
