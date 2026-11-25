import { createHash } from "node:crypto";
import type { Db } from "@/db/client";
import type { ContentLang } from "@/lib/i18n/languages";
import { checkEligibility } from "@/lib/eligibility/check";
import { blockedHint } from "@/lib/eligibility/facts";
import { isProfileStarted, type WorkProfile, type WorkRegion } from "@/lib/eligibility/profile";
import { DAY_MS } from "@/lib/time";
import { jobPlaceTokens } from "./job-places";
import {
  acceptedPlaces,
  lookingForOf,
  placeFit,
  roleOptions,
  roleTitle,
  titleFits,
  type PlaceFit,
} from "./looking-for";
import {
  ENGLISH_MATCH_COPY,
  KIND,
  kindOf,
  matchJob,
  type MatchCopy,
  PAST_KIND_WEIGHT,
  personFrom,
  unmatched,
  type EligibilityHint,
  type Kind,
  type MatchableJob,
} from "./match";
import { companyIndex, snapshotOf } from "./companies";
import { MAJOR_GROUPS, OCCUPATIONS, occupationOf, readTitle } from "./occupations";
import { matchCacheKey, readMatchCache, writeMatchCache } from "./match-cache";
import {
  indexWeights,
  poolOpenings,
  readStoredCounts,
  type PooledOpening,
  type PoolQuery,
  type StoredCounts,
} from "./match-index";
import { nearCityIds, nearsPoint } from "./near";
import {
  capPerCompany,
  compareRanked,
  levelFactor,
  levelGap,
  linearScore,
  ORDER_LIMITS,
  placePart,
  recencyPart,
  skillPart,
  zoneFactor,
  type Ranked,
} from "./order";
import { gateAllows, roleGate, type RoleGate } from "./role-gate";
import { familyFits } from "./roles";
import { personRole, roleSimilarity, sameness, SEMANTIC, type PersonRole } from "./semantic";
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
import { companyKey, sponsorRegions, visaLines, type VisaFacts } from "./visa";

const NO_RULES: EligibilityHint = { blocked: false, note: null };
const COPIES_CHECKED = 6;
const PLACES_SHOWN = 2;
const FREE_POOL = 60;

// Cached Matches pages carry their variant, so a new one never serves a page built on the old ids.
export const MATCH_VARIANT = "level-years-v1";

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

// Rows the compact-jobs migration copied hold the old rules text until the next rebuild reads it.
const LEGACY_FACTS = "\u0001";

function eligibilityOf(
  row: { location: string; facts: string },
  profile: WorkProfile | null,
  options: { now: number; deviceTimeZone: string; sponsors: WorkRegion[] },
): EligibilityHint {
  const checkOptions = {
    now: options.now,
    deviceTimeZone: options.deviceTimeZone || undefined,
    sponsorRegions: options.sponsors,
  };
  if (!row.facts.startsWith(LEGACY_FACTS)) return blockedHint(row.facts, profile, checkOptions);
  const text = row.facts.slice(1);
  if (!text && !row.location) return { blocked: false, note: null };
  const findings = checkEligibility({ location: row.location, text }, profile, checkOptions);
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
  // The post languages the list keeps (job-langs.ts); null or left out keeps every language.
  langs?: readonly ContentLang[] | null;
  // The reader's words for the reasons, notes and visa lines; English when left out.
  copy?: MatchCopy;
};

export type RankResult = Omit<JobMatchesResponse, "ok" | "requestId" | "resumeHash">;

function storedCounts(db: Db, request: RankRequest): Promise<StoredCounts | null> {
  return request.counts === undefined ? readStoredCounts(db) : Promise.resolve(request.counts);
}

type Check = (row: { location: string; facts: string }, visa: VisaFacts | null) => EligibilityHint;

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
  const copy = request.copy ?? ENGLISH_MATCH_COPY;
  const langs = request.langs ?? null;
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
      const match = matchJob(person, facts, hint, copy) ?? unmatched(facts, hint, copy);
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
    const stats = counts ?? (await jobStats(db, now));
    return {
      jobs: await withCompanies(db, counts, now, ranked.slice(start, start + JOB_PAGE_SIZE)),
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
    request.cache && counts && !nearsPoint(filters)
      ? matchCacheKey({
          variant: MATCH_VARIANT,
          builtAt: counts.builtAt,
          now,
          plan: request.free ? "free" : "pro",
          profileHash: profileHash(request.profile),
          inputs: [
            filters,
            lookingFor,
            page,
            request.workProfile,
            request.deviceTimeZone,
            // Only a list of fewer post languages, or in another language, has a key of its own.
            ...(langs ? [{ langs }] : []),
            ...(copy.locale === "en" ? [] : [{ locale: copy.locale }]),
          ],
        })
      : null;
  const cacheKey = keyFor(request.page);
  if (cacheKey) {
    const hit = await readMatchCache<RankResult>(db, request.userId, cacheKey);
    if (hit) return withSaved(db, request.userId, hit, counts, now);
  }

  // The index keeps the weights it was built with; if it can't be read, poolOpenings falls back too.
  const [weights, stats] = await Promise.all([
    counts ? indexWeights(db, counts).catch(() => skillWeights(db)) : skillWeights(db),
    counts ? Promise.resolve(counts) : jobStats(db, now),
  ]);
  const weight = (skill: string) => weights.get(skill) ?? DEFAULT_SKILL_WEIGHT;
  // Without stored title vectors (a new database, or before the first embedding run) the rules decide.
  const role = await personRole(db, lookingFor, request.profile).catch(() => null);
  const query = poolQueryOf(person, lookingFor, filters, weights, langs);
  const { places: accepted, gate } = query;
  const interns = query.interns === true;
  // Past the pages ranked here in full, each page reads the next openings in the index's own order.
  const deep =
    !request.free && !filters.eligibleOnly && request.page > CANDIDATE_POOL / JOB_PAGE_SIZE;
  const offset = deep ? (request.page - 1) * JOB_PAGE_SIZE : 0;
  const pool = await poolOpenings(
    db,
    { ...query, limit: request.free ? FREE_POOL : deep ? JOB_PAGE_SIZE : CANDIDATE_POOL, offset },
    counts,
    now,
  );

  const scored: Scored[] = [];
  for (const opening of pool.openings) {
    const fit = placeFit(opening.places, accepted);
    if (fit === "miss") continue;
    const { row } = opening;
    const read = factsOf(row, opening.kind);
    if (!gateAllows(gate ?? null, read) || (!interns && row.seniority === "intern")) continue;
    // A job the gate let in stays at least a neighbouring kind; its title then orders it.
    const floor = gate && kindOf(person, read).weight >= KIND.same ? KIND.same : 0;
    const facts = {
      ...read,
      kind: role ? titleKind(role, row.title, opening.kind, floor) : null,
    };
    if (!matchJob(person, facts)) continue;
    const { shown, others, hint } = pickCopy(opening, check, accepted);
    const match = matchJob(person, facts, hint, copy) ?? unmatched(facts, hint, copy);
    if (filters.eligibleOnly && match.blocked) continue;
    const gap = levelGap(person.seniority, row.seniority);
    const kind = kindOf(person, facts).weight;
    const parts = {
      role: Math.min(
        1,
        kind * (titleFits(row.title, lookingFor.title) ? ORDER_LIMITS.titleFit : 1),
      ),
      skills: skillPart(match, row.keywords, weight),
      level: levelFactor(gap) * zoneFactor(person, facts),
      recency: recencyPart(Math.min(row.postedAt, row.firstSeenAt), now),
      place: placePart(fit),
    };
    scored.push({
      match,
      company: row.company,
      postedAt: row.postedAt,
      firstSeenAt: row.firstSeenAt,
      far: Math.abs(gap) >= 2,
      pastKind: kind >= KIND.same && kind < KIND.own,
      closeness: linearScore(parts),
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
        visa: visaLines(opening.visa, now, copy.words.visa),
        position: 0,
        features: Object.values(parts).map((part) => Math.round(part * 1000) / 1000),
      },
    });
  }
  // Levels two or more steps away follow every nearer one instead of being dropped.
  const atLevel = (far: boolean) =>
    capPerCompany(scored.filter((item) => item.far === far).sort(compareRanked));
  const ranked = [...atLevel(false), ...atLevel(true)].map((item, index) => ({
    ...item.job,
    position: offset + index + 1,
  }));
  const firstSeen = new Map(scored.map((item) => [item.job.id, item.firstSeenAt]));

  const matching = Math.max(pool.groups, offset + ranked.length);
  // A deep page's own few jobs say nothing about the whole list, so it counts none as strong or new.
  const strong = deep ? 0 : ranked.filter((job) => job.match.label === "strong").length;
  const newToday = deep
    ? 0
    : ranked.filter((job) => (firstSeen.get(job.id) ?? 0) >= now - DAY_MS).length;
  const pageOf = (page: number): RankResult => ({
    jobs: deep ? ranked : ranked.slice((page - 1) * JOB_PAGE_SIZE, page * JOB_PAGE_SIZE),
    page,
    pageSize: JOB_PAGE_SIZE,
    total:
      request.free || filters.eligibleOnly
        ? ranked.length
        : Math.min(matching, MAX_JOB_PAGE * JOB_PAGE_SIZE),
    matching,
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
  return withSaved(db, request.userId, result, counts, now);
}

type Person = ReturnType<typeof personFrom>;

// What the match index query asks for a person, a role and filters; the map reads the same (map.ts).
export function poolQueryOf(
  person: Person,
  lookingFor: LookingFor,
  filters: JobFilters,
  weights: ReadonlyMap<string, number>,
  langs: readonly ContentLang[] | null,
): PoolQuery & { places: readonly string[] | null; gate: RoleGate | null } {
  const families = [...person.families];
  return {
    skills: [...person.skills],
    families: families.filter(([, w]) => w >= 1).map(([family]) => family) as RoleFamily[],
    pastFamilies: families
      .filter(([, w]) => w > 0 && w <= PAST_KIND_WEIGHT)
      .map(([family]) => family) as RoleFamily[],
    seniority: person.seniority,
    filters,
    weights,
    places: acceptedPlaces(lookingFor.place),
    kinds: {
      occupations: person.occupations,
      minors: person.minors,
      majors: person.majors,
      byFamily: person.families.size > 0,
    },
    // Only the person's own kind of work is shown, however many skills another job shares.
    gate: roleGate(lookingFor),
    interns: person.seniority === "intern",
    langs,
    near: nearCityIds(filters.near),
  };
}

// The employer's facts follow the latest build, so the cached page never holds them either.
async function withCompanies(
  db: Db,
  counts: StoredCounts | null,
  now: number,
  jobs: MatchedJob[],
): Promise<MatchedJob[]> {
  if (!counts || jobs.length === 0) return jobs;
  const index = await companyIndex(db, counts.builtAt).catch(() => null);
  if (!index) return jobs;
  return jobs.map((job) => {
    const facts = index.get(companyKey(job.company));
    return { ...job, employer: facts ? snapshotOf(facts, now) : null };
  });
}

// Saved jobs change between visits, so the cached page never holds them.
async function withSaved(
  db: Db,
  userId: string,
  result: RankResult,
  counts: StoredCounts | null,
  now: number,
): Promise<RankResult> {
  const [saved, total, jobs] = await Promise.all([
    savedIds(
      db,
      userId,
      result.jobs.map((job) => job.id),
    ),
    savedCount(db, userId),
    withCompanies(db, counts, now, result.jobs),
  ]);
  return {
    ...result,
    jobs: jobs.map((job) => ({ ...job, saved: saved.has(job.id) })),
    savedCount: total,
  };
}

// The job's kind of role by title vectors: its title's code when embedded, else what the index read.
function titleKind(
  role: PersonRole,
  title: string,
  read: PooledOpening["kind"],
  floor: number,
): Kind | null {
  if (!read?.code) return null;
  const similarity = roleSimilarity(role, read.code);
  const weight = Math.max(floor, sameness(similarity));
  const jobRole = roleTitle(title);
  const differs = role.title && !titleFits(title, role.title) && !titleFits(role.title, jobRole);
  return {
    weight,
    via: weight > 0 ? "title" : null,
    role:
      differs && similarity >= SEMANTIC.explain && jobRole
        ? { job: jobRole, person: roleTitle(role.title) }
        : null,
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
