import { createHash } from "node:crypto";
import type { Db } from "@/db/client";
import { checkEligibility } from "@/lib/eligibility/check";
import { isProfileStarted, type WorkProfile, type WorkRegion } from "@/lib/eligibility/profile";
import { DAY_MS } from "@/lib/time";
import { jobPlaceTokens } from "./job-places";
import {
  acceptedPlaces,
  lookingForOf,
  placeFit,
  roleOptions,
  titleFits,
  type PlaceFit,
} from "./looking-for";
import {
  KIND,
  kindOf,
  matchJob,
  PAST_KIND_WEIGHT,
  personFrom,
  unmatched,
  type EligibilityHint,
  type MatchableJob,
} from "./match";
import { MAJOR_GROUPS, OCCUPATIONS, occupationOf, readTitle } from "./occupations";
import { matchCacheKey, readMatchCache, writeMatchCache } from "./match-cache";
import {
  indexWeights,
  poolOpenings,
  readStoredCounts,
  type PooledOpening,
  type StoredCounts,
} from "./match-index";
import {
  capPerCompany,
  closeness,
  compareRanked,
  freshness,
  levelFactor,
  levelGap,
  ORDER_LIMITS,
  placeFactor,
  zoneFactor,
  type Ranked,
} from "./order";
import { familyFits } from "./roles";
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
  MAX_JOB_PAGE,
  type JobFilters,
  type JobMatchesResponse,
  type LookingFor,
  type MatchedJob,
  type MatchProfile,
  type OccupationOption,
  type RoleFamily,
} from "./types";
import { sponsorRegions, visaLines, type VisaFacts } from "./visa";

const NO_RULES: EligibilityHint = { blocked: false, note: null };
const COPIES_CHECKED = 6;
const PLACES_SHOWN = 2;
const FREE_POOL = 60;

export const MATCH_VARIANT = "occupation-v5";

export function occupationOption(code: string | null): OccupationOption | null {
  const occupation = occupationOf(code);
  return occupation
    ? { code: occupation.code, name: occupation.name, group: MAJOR_GROUPS[occupation.major] ?? "" }
    : null;
}

export function withOccupation(lookingFor: LookingFor): LookingFor {
  const occupation =
    lookingFor.occupation ?? (lookingFor.title ? readTitle(lookingFor.title).occupation : null);
  const family =
    lookingFor.family && familyFits(lookingFor.family, occupation) ? lookingFor.family : null;
  return { ...lookingFor, occupation, family };
}

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
  lookingFor?: LookingFor | null;
  deviceTimeZone: string;
  now: number;
  free?: boolean;
  cache?: boolean;
  // Already read by the caller; left out, they're read here.
  counts?: StoredCounts | null;
  // Writes the answer doesn't wait for (the day's cache); without it they're awaited here.
  defer?: (write: () => Promise<void>) => void;
};

export type RankResult = Omit<JobMatchesResponse, "ok" | "requestId" | "resumeHash">;

function storedCounts(db: Db, request: RankRequest): Promise<StoredCounts | null> {
  return request.counts === undefined ? readStoredCounts(db) : Promise.resolve(request.counts);
}

type Check = (
  row: { location: string; rulesText: string },
  visa: VisaFacts | null,
) => EligibilityHint;

function pickCopy(
  opening: PooledOpening,
  check: Check | null,
  accepted: readonly string[] | null,
): { shown: CandidateRow; others: string[]; hint: EligibilityHint } {
  const { row, visa } = opening;
  const rest = opening.copies.filter((copy) => copy.id !== row.id);
  let list = [row, ...rest];
  const fits = (copy: CandidateRow): PlaceFit => placeFit(jobPlaceTokens(copy.location), accepted);
  if (accepted !== null && list.length > 1) {
    const order: Record<PlaceFit, number> = { match: 0, unknown: 1, miss: 2 };
    list = [...list].sort((a, b) => order[fits(a)] - order[fits(b)]);
  }
  let shown = list[0]!;
  let hint = check ? check(shown, visa) : NO_RULES;
  if (check && hint.blocked) {
    for (const copy of list.slice(1, COPIES_CHECKED)) {
      if (fits(copy) === "miss") break;
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
  const lookingFor = withOccupation(
    request.lookingFor ?? lookingForOf(request.profile, request.workProfile),
  );
  const person = personFrom(request.profile, lookingFor, OCCUPATIONS);
  const shown = {
    lookingFor,
    occupation: occupationOption(lookingFor.occupation),
    roles: roleOptions(request.profile).map((role) => ({
      ...role,
      occupation: occupationOption(readTitle(role.title).occupation),
    })),
  };
  const profileReady = request.workProfile !== null && isProfileStarted(request.workProfile);
  const options = { now, deviceTimeZone: request.deviceTimeZone };
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
    const [counts, saved] = await Promise.all([
      storedCounts(db, request),
      savedCount(db, request.userId),
    ]);
    const stats = counts ?? (await jobStats(db));
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
      ...shown,
      variant: MATCH_VARIANT,
    };
  }

  const counts = await storedCounts(db, request);
  const keyFor = (page: number) =>
    request.cache && counts
      ? matchCacheKey({
          variant: MATCH_VARIANT,
          builtAt: counts.builtAt,
          now,
          plan: request.free ? "free" : "pro",
          profileHash: profileHash(request.profile),
          inputs: [filters, lookingFor, page, request.workProfile, request.deviceTimeZone],
        })
      : null;
  const cacheKey = keyFor(request.page);
  if (cacheKey) {
    const hit = await readMatchCache<RankResult>(db, request.userId, cacheKey);
    if (hit) return withSaved(db, request.userId, hit);
  }

  // The index keeps the weights it was built with; if it can't be read, poolOpenings falls back too.
  const [weights, stats] = await Promise.all([
    counts ? indexWeights(db, counts).catch(() => skillWeights(db)) : skillWeights(db),
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
      kinds: {
        occupations: person.occupations,
        minors: person.minors,
        majors: person.majors,
        byFamily: person.families.size > 0,
      },
    },
    counts,
    now,
  );

  const scored: Scored[] = [];
  for (const opening of pool.openings) {
    const fit = placeFit(opening.places, accepted);
    if (fit === "miss") continue;
    const { row } = opening;
    const facts = factsOf(row, opening.kind);
    if (!matchJob(person, facts)) continue;
    const { shown, others, hint } = pickCopy(opening, check, accepted);
    const match = matchJob(person, facts, hint) ?? unmatched(facts, hint);
    if (filters.eligibleOnly && match.blocked) continue;
    const gap = levelGap(person.seniority, row.seniority);
    const kind = kindOf(person, facts).weight;
    scored.push({
      match,
      company: row.company,
      postedAt: row.postedAt,
      firstSeenAt: row.firstSeenAt,
      far: Math.abs(gap) >= 2,
      pastKind: kind >= KIND.same && kind < KIND.own,
      closeness:
        closeness(match, row.keywords, weight, kind) *
        freshness(Math.min(row.postedAt, row.firstSeenAt), now) *
        levelFactor(gap) *
        zoneFactor(person, facts) *
        placeFactor(fit) *
        (titleFits(row.title, lookingFor.title) ? ORDER_LIMITS.titleFit : 1),
      job: {
        ...toFeedJob(row),
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
  const near = scored.filter((item) => !item.far);
  const kept = near.length > 0 ? near : scored;
  kept.sort(compareRanked);
  const ranked = capPerCompany(kept).map((item, index) => ({
    ...item.job,
    position: index + 1,
  }));
  const firstSeen = new Map(kept.map((item) => [item.job.id, item.firstSeenAt]));

  const strong = ranked.filter((job) => job.match.label === "strong").length;
  const newToday = ranked.filter((job) => (firstSeen.get(job.id) ?? 0) >= now - DAY_MS).length;
  const pageOf = (page: number): RankResult => ({
    jobs: ranked.slice((page - 1) * JOB_PAGE_SIZE, page * JOB_PAGE_SIZE),
    page,
    pageSize: JOB_PAGE_SIZE,
    total: ranked.length,
    matching: Math.max(pool.groups, ranked.length),
    capped: pool.groups > CANDIDATE_POOL,
    strong,
    newToday,
    savedCount: 0,
    openJobs: stats.openJobs,
    checkedAt: stats.checkedAt,
    profileReady,
    ...shown,
    variant: MATCH_VARIANT,
  });
  const result = pageOf(request.page);
  if (cacheKey) {
    // Next goes to the following page of this same ranking, so it's kept now too.
    const next = request.page + 1;
    const nextKey =
      !request.free && next <= MAX_JOB_PAGE && ranked.length > request.page * JOB_PAGE_SIZE
        ? keyFor(next)
        : null;
    const entries = [
      { key: cacheKey, value: result },
      ...(nextKey ? [{ key: nextKey, value: pageOf(next) }] : []),
    ];
    const write = () => writeMatchCache(db, request.userId, entries, now);
    if (request.defer) request.defer(write);
    else await write();
  }
  return withSaved(db, request.userId, result);
}

// Saved jobs change between visits, so the cached page never holds them.
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

function factsOf(row: CandidateRow, kind: PooledOpening["kind"] = null): MatchableJob {
  const read = kind ?? { ...readTitle(row.title), zone: null };
  const occupation = occupationOf(read.occupation);
  return {
    title: row.title,
    keywords: row.keywords,
    seniority: row.seniority,
    minYears: row.minYears,
    family: read.family,
    occupation: occupation?.code ?? null,
    occupationName: occupation?.name ?? null,
    zone: kind ? kind.zone : (occupation?.zone ?? null),
  };
}
