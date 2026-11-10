import { createHash } from "node:crypto";
import type { Db } from "@/db/client";
import { checkEligibility } from "@/lib/eligibility/check";
import { isProfileStarted, type WorkProfile, type WorkRegion } from "@/lib/eligibility/profile";
import {
  acceptedPlaces,
  lookingForOf,
  placeFit,
  titleFits,
  jobPlaceTokens,
  type LookingFor,
  type PlaceFit,
} from "./looking-for";
import {
  kindWeight,
  matchJob,
  PAST_KIND_WEIGHT,
  personFrom,
  unmatched,
  type EligibilityHint,
  type MatchableJob,
} from "./match";
import { matchCacheKey, readMatchCache, writeMatchCache } from "./match-cache";
import { poolOpenings, readStoredCounts, type PooledOpening } from "./match-index";
import {
  capPerCompany,
  closeness,
  compareRanked,
  freshness,
  levelFactor,
  levelGap,
  ORDER_LIMITS,
  placeFactor,
  type Ranked,
} from "./order";
import {
  CANDIDATE_POOL,
  DEFAULT_SKILL_WEIGHT,
  jobStats,
  savedCandidates,
  savedCount,
  savedIds,
  skillWeights,
  toFeedJob,
  type CandidateRow,
} from "./records";
import {
  JOB_PAGE_SIZE,
  type JobFilters,
  type JobMatchesResponse,
  type MatchedJob,
  type MatchProfile,
  type RoleFamily,
} from "./types";
import { sponsorRegions, visaLines, type VisaFacts } from "./visa";

// Server-only. A match request: candidates from the database, then labels, work-rights rules and
// order, all by rules on our own server. No AI call; Pro all the same (see /api/jobs/matches).

const DAY_MS = 24 * 60 * 60 * 1_000;
const NO_RULES: EligibilityHint = { blocked: false, note: null };
// Copies of one opening checked for a place the person can take before giving up on it.
const COPIES_CHECKED = 6;
const PLACES_SHOWN = 2;
// Free sees its closest few (FREE_JOB_MATCHES); ranking this many leaves room for the
// per-company cap without scoring the whole pool.
const FREE_POOL = 60;

// Which ordering produced a list, logged with every impression so two can be compared later.
// v2 (2026-11-09): context rules for short skill names, role kind by title age, level and place in
// the order, the "Looking for" card.
export const MATCH_VARIANT = "weighted-v2";

function eligibilityOf(
  row: { location: string; rulesText: string },
  profile: WorkProfile | null,
  options: { now: number; deviceTimeZone: string; sponsors: WorkRegion[] },
): EligibilityHint {
  if (!row.rulesText && !row.location) return { blocked: false, note: null };
  const findings = checkEligibility({ location: row.location, text: row.rulesText }, profile, {
    now: options.now,
    deviceTimeZone: options.deviceTimeZone || undefined,
    sponsorRegions: options.sponsors,
  });
  const blocked = findings.find((finding) => finding.verdict === "blocked");
  return { blocked: Boolean(blocked), note: blocked?.note ?? null };
}

/**
 * Names one version of what matching was sent (skills, titles, years) without keeping any of it,
 * so impressions and actions from the same resume version line up in match_events.
 */
export function profileHash(profile: MatchProfile): string {
  const facts = JSON.stringify([[...profile.skills].sort(), profile.titles, profile.years]);
  return createHash("sha256").update(facts).digest("base64url").slice(0, 22);
}

export type RankRequest = {
  userId: string;
  view: "matches" | "saved";
  profile: MatchProfile;
  filters: JobFilters;
  page: number;
  workProfile: WorkProfile | null;
  // The card as the person sees it; null guesses it from the profile and work profile.
  lookingFor?: LookingFor | null;
  deviceTimeZone: string;
  now: number;
  // Free ranks only its closest few. Pro ranks the whole pool.
  free?: boolean;
  // Keep and reuse this page for the day (match_cache). The eval ranks afresh.
  cache?: boolean;
};

export type RankResult = Omit<JobMatchesResponse, "ok" | "requestId" | "resumeHash">;

type Check = (row: { location: string; rulesText: string }, visa: VisaFacts | null) => EligibilityHint;

// The copy to show: the first in a place the "Looking for" card names and the work profile
// allows; the others become "also in" places on the card.
function pickCopy(
  opening: PooledOpening,
  check: Check | null,
  accepted: readonly string[] | null,
): { shown: CandidateRow; others: string[]; hint: EligibilityHint } {
  const { row, visa } = opening;
  const rest = opening.copies.filter((copy) => copy.id !== row.id);
  let list = [row, ...rest];
  if (accepted !== null && list.length > 1) {
    const fits = (copy: CandidateRow): PlaceFit => placeFit(jobPlaceTokens(copy.location), accepted);
    const order: Record<PlaceFit, number> = { match: 0, unknown: 1, miss: 2 };
    list = [...list].sort((a, b) => order[fits(a)] - order[fits(b)]);
  }
  let shown = list[0]!;
  let hint = check ? check(shown, visa) : NO_RULES;
  if (check && hint.blocked) {
    for (const copy of list.slice(1, COPIES_CHECKED)) {
      const other = check(copy, visa);
      if (!other.blocked) {
        shown = copy;
        hint = other;
        break;
      }
    }
  }
  const others = [
    ...new Set(list.filter((copy) => copy.id !== shown.id).map((copy) => copy.location.trim())),
  ].filter((place) => place && place !== shown.location.trim());
  return { shown, others, hint };
}

type Scored = Ranked & { job: MatchedJob; far: boolean; firstSeenAt: number };

export async function rankJobs(db: Db, request: RankRequest): Promise<RankResult> {
  const { now, filters } = request;
  const lookingFor = request.lookingFor ?? lookingForOf(request.profile, request.workProfile);
  const person = personFrom(request.profile, lookingFor);
  const profileReady = request.workProfile !== null && isProfileStarted(request.workProfile);
  const options = { now, deviceTimeZone: request.deviceTimeZone };
  // Without a work profile nothing can be blocked, so the slow rules don't run at all.
  const check: Check | null = profileReady
    ? (row, visa) =>
        eligibilityOf(row, request.workProfile, { ...options, sponsors: sponsorRegions(visa, now) })
    : null;

  if (request.view === "saved") {
    const rows = await savedCandidates(db, request.userId);
    const ranked: MatchedJob[] = rows.map((row, index) => {
      const hint = check ? check(row, null) : NO_RULES;
      const facts = factsOf(row);
      const match = matchJob(person, facts, hint) ?? unmatched(facts, hint);
      return {
        ...toFeedJob(row),
        match,
        saved: true,
        otherPlaces: [],
        morePlaces: 0,
        visa: [],
        position: index + 1,
      };
    });
    const start = (request.page - 1) * JOB_PAGE_SIZE;
    const [stats, saved] = await Promise.all([jobStats(db), savedCount(db, request.userId)]);
    return {
      jobs: ranked.slice(start, start + JOB_PAGE_SIZE),
      page: request.page,
      pageSize: JOB_PAGE_SIZE,
      total: ranked.length,
      matching: ranked.length,
      capped: false,
      strong: ranked.filter((job) => job.match.label === "strong").length,
      newToday: rows.filter((row) => row.firstSeenAt >= now - DAY_MS).length,
      savedCount: saved,
      openJobs: stats.openJobs,
      checkedAt: stats.checkedAt,
      profileReady,
      lookingFor,
      variant: MATCH_VARIANT,
    };
  }

  const counts = await readStoredCounts(db);
  const cacheKey =
    request.cache && counts
      ? matchCacheKey({
          variant: MATCH_VARIANT,
          builtAt: counts.builtAt,
          now,
          plan: request.free ? "free" : "pro",
          profileHash: profileHash(request.profile),
          inputs: [filters, lookingFor, request.page, request.workProfile, request.deviceTimeZone],
        })
      : null;
  if (cacheKey) {
    const hit = await readMatchCache<RankResult>(db, request.userId, cacheKey);
    if (hit) return withSaved(db, request.userId, hit);
  }

  const [weights, stats] = await Promise.all([
    skillWeights(db),
    counts ? Promise.resolve(counts) : jobStats(db),
  ]);
  const weight = (skill: string) => weights.get(skill) ?? DEFAULT_SKILL_WEIGHT;
  const families = [...person.families];
  const accepted = acceptedPlaces(lookingFor.place);
  const pool = await poolOpenings(
    db,
    {
      skills: [...person.skills],
      families: families.filter(([, w]) => w >= 1).map(([family]) => family) as RoleFamily[],
      pastFamilies: families
        .filter(([, w]) => w > 0 && w <= PAST_KIND_WEIGHT)
        .map(([family]) => family) as RoleFamily[],
      seniority: person.seniority,
      filters,
      weights,
      places: accepted,
      limit: request.free ? FREE_POOL : CANDIDATE_POOL,
    },
    counts,
    now,
  );

  const scored: Scored[] = [];
  for (const opening of pool.openings) {
    const { row } = opening;
    const facts = factsOf(row);
    // Skills and titles first: they're cheap, and a job that fails them never needs the rules.
    if (!matchJob(person, facts)) continue;
    const { shown, others, hint } = pickCopy(opening, check, accepted);
    const match = matchJob(person, facts, hint) ?? unmatched(facts, hint);
    if (filters.eligibleOnly && match.blocked) continue;
    const gap = levelGap(person.seniority, row.seniority);
    const fit = placeFit(opening.places, accepted);
    const kind = kindWeight(person, row.title);
    scored.push({
      match,
      company: row.company,
      postedAt: row.postedAt,
      firstSeenAt: row.firstSeenAt,
      far: Math.abs(gap) >= 2,
      demoted: fit === "miss",
      pastKind: kind > 0 && kind < 1,
      closeness:
        closeness(match, row.keywords, weight, kind) *
        freshness(Math.min(row.postedAt, row.firstSeenAt), now) *
        levelFactor(gap) *
        placeFactor(fit) *
        (titleFits(row.title, lookingFor.title) ? ORDER_LIMITS.titleFit : 1),
      job: {
        ...toFeedJob(row),
        // The copy shown is a place the person can take; the rest of the card is the opening's.
        id: shown.id,
        source: shown.source,
        location: shown.location,
        remote: shown.remote,
        url: shown.url,
        match,
        saved: false,
        otherPlaces: others.slice(0, PLACES_SHOWN),
        morePlaces: Math.max(0, others.length - PLACES_SHOWN),
        visa: visaLines(opening.visa, now),
        position: 0,
      },
    });
  }
  // Two or more levels away only when nothing nearer is left.
  const near = scored.filter((item) => !item.far);
  const kept = near.length > 0 ? near : scored;
  kept.sort(compareRanked);
  const ranked = capPerCompany(kept).map((item, index) => ({
    ...item.job,
    position: index + 1,
  }));
  const firstSeen = new Map(kept.map((item) => [item.job.id, item.firstSeenAt]));

  const start = (request.page - 1) * JOB_PAGE_SIZE;
  const result: RankResult = {
    jobs: ranked.slice(start, start + JOB_PAGE_SIZE),
    page: request.page,
    pageSize: JOB_PAGE_SIZE,
    total: ranked.length,
    matching: Math.max(pool.groups, ranked.length),
    capped: pool.groups > CANDIDATE_POOL,
    strong: ranked.filter((job) => job.match.label === "strong").length,
    newToday: ranked.filter((job) => (firstSeen.get(job.id) ?? 0) >= now - DAY_MS).length,
    savedCount: 0,
    openJobs: stats.openJobs,
    checkedAt: stats.checkedAt,
    profileReady,
    lookingFor,
    variant: MATCH_VARIANT,
  };
  if (cacheKey) await writeMatchCache(db, request.userId, cacheKey, result, now);
  return withSaved(db, request.userId, result);
}

// Saved jobs change between visits; the cached page never holds them.
async function withSaved(db: Db, userId: string, result: RankResult): Promise<RankResult> {
  const [saved, total] = await Promise.all([
    savedIds(
      db,
      userId,
      result.jobs.map((job) => job.id),
    ),
    savedCount(db, userId),
  ]);
  return {
    ...result,
    jobs: result.jobs.map((job) => ({ ...job, saved: saved.has(job.id) })),
    savedCount: total,
  };
}

function factsOf(row: CandidateRow): MatchableJob {
  return {
    title: row.title,
    keywords: row.keywords,
    seniority: row.seniority,
    minYears: row.minYears,
  };
}
