import { JobReadError } from "@/lib/jobs/errors";
import { contentHash } from "./normalize";
import {
  countryFacet,
  isTargetCountry,
  parseWorkdayJob,
  parseWorkdayList,
  workdayJobUrl,
  workdayListBody,
  workdayListingJob,
  workdayListUrl,
  workdayRobotsUrl,
  WORKDAY_PAGE_SIZE,
  type WorkdayBoard,
  type WorkdayListing,
} from "./parsers/workday";
import type { RawJob } from "./parsers";
import { robotsAllows } from "./robots";

export const WORKDAY_LIMITS = {
  // Newest first, US jobs, then the other target countries, then the rest, so one giant tenant can't crowd out the others.
  perBoard: 300,
  // Each post is its own request, read only when the job is new or its listing changed.
  postsPerRead: 120,
  readMs: 180_000,
  saveMarginMs: 15_000,
  startBeforeMs: 60_000,
} as const;

export type WorkdayFetch = {
  json: (url: URL, body?: unknown) => Promise<unknown>;
  text: (url: URL) => Promise<string>;
};

export type WorkdayRead = { raws: RawJob[]; partial: boolean };

const ROBOT = "OttoResumeBot";

// The US comes first (owner priority, 2026-11-23), then the other target countries, then the rest.
const FIRST_COUNTRY = "US";

// A missing robots.txt allows everything (RFC 9309); any other failure stops the read.
async function allowed(board: WorkdayBoard, get: WorkdayFetch): Promise<boolean> {
  let body: string;
  try {
    body = await get.text(workdayRobotsUrl(board));
  } catch (error) {
    const missing =
      error instanceof JobReadError &&
      (error.reason === "not_found" ||
        (error.reason === "unreachable" && /^http_4\d\d$/.test(error.detail ?? "")));
    if (missing) return true;
    throw error;
  }
  const base = `/wday/cxs/${board.tenant}/${board.site}`;
  return robotsAllows(body, ROBOT, `${base}/jobs`) && robotsAllows(body, ROBOT, `${base}/job/`);
}

async function listAll(board: WorkdayBoard, get: WorkdayFetch): Promise<WorkdayListing[]> {
  const url = workdayListUrl(board);
  const first = parseWorkdayList(await get.json(url, workdayListBody(0)));
  const countries = countryFacet(first.facets);
  const values = countries?.values ?? [];
  const target = (code: string | null) => code !== null && isTargetCountry(code);
  const tiers = [
    values.filter((value) => value.code === FIRST_COUNTRY),
    values.filter((value) => value.code !== FIRST_COUNTRY && target(value.code)),
    values.filter((value) => !target(value.code)),
  ].filter((tier) => tier.length > 0);
  const passes: (Record<string, string[]> | null)[] =
    countries && tiers.length > 1
      ? tiers.map((tier) => ({ [countries.parameter]: tier.map((value) => value.id) }))
      : [null];

  const out = new Map<string, WorkdayListing>();
  for (const facets of passes) {
    let page = facets ? parseWorkdayList(await get.json(url, workdayListBody(0, facets))) : first;
    // Only the first page of a search carries its total.
    const total = page.total;
    let offset = 0;
    for (;;) {
      for (const listing of page.listings) {
        if (out.size >= WORKDAY_LIMITS.perBoard) return [...out.values()];
        if (!out.has(listing.externalPath)) out.set(listing.externalPath, listing);
      }
      offset += page.listings.length;
      const short = page.listings.length < WORKDAY_PAGE_SIZE;
      if (page.listings.length === 0 || (total > 0 ? offset >= total : short)) break;
      page = parseWorkdayList(await get.json(url, workdayListBody(offset, facets ?? {})));
    }
  }
  return [...out.values()];
}

export async function readWorkday(
  board: WorkdayBoard,
  company: string,
  get: WorkdayFetch,
  storedHashes: (externalIds: string[]) => Promise<Map<string, string>>,
  { readAt, deadline }: { readAt: number; deadline: number },
): Promise<WorkdayRead> {
  if (!(await allowed(board, get))) throw new JobReadError("blocked", { detail: "robots" });
  const listings = await listAll(board, get);
  const listed = listings.flatMap((listing) => {
    const raw = workdayListingJob(board, listing, company, readAt);
    return raw ? [{ listing, raw }] : [];
  });
  const stored = await storedHashes(listed.map(({ raw }) => raw.externalId));
  const stopAt = Math.min(
    deadline - WORKDAY_LIMITS.saveMarginMs,
    Date.now() + WORKDAY_LIMITS.readMs,
  );

  // Sites post one job many times under one title and place; the store keeps one, so only one is read.
  const twin = (listing: WorkdayListing) => `${listing.title}\u0000${listing.locationsText}`;
  const kept = new Set(
    listed.filter(({ raw }) => stored.has(raw.externalId)).map(({ listing }) => twin(listing)),
  );

  const raws: RawJob[] = [];
  let posts = 0;
  let partial = false;
  for (const { listing, raw } of listed) {
    const known = stored.has(raw.externalId);
    if (stored.get(raw.externalId) === contentHash(raw)) {
      raws.push(raw);
      continue;
    }
    if (!known && kept.has(twin(listing))) continue;
    if (partial || posts >= WORKDAY_LIMITS.postsPerRead || Date.now() >= stopAt) {
      partial = true;
      if (known) raws.push(raw);
      continue;
    }
    posts += 1;
    kept.add(twin(listing));
    try {
      const job = parseWorkdayJob(
        await get.json(workdayJobUrl(board, listing.externalPath)),
        board,
        listing,
        company,
        readAt,
      );
      if (job) raws.push(job);
    } catch (error) {
      const reason = error instanceof JobReadError ? error.reason : null;
      // A post that closed since the list just drops; a slow or refusing host ends this read's posts.
      if (reason !== "not_found" && known) raws.push(raw);
      if (reason === "timeout" || reason === "blocked") partial = true;
    }
  }
  return { raws, partial };
}
