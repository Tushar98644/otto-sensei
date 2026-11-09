import { createHash } from "node:crypto";
import type { Db } from "@/db/client";
import { checkEligibility } from "@/lib/eligibility/check";
import { isProfileStarted, type WorkProfile } from "@/lib/eligibility/profile";
import { matchJob, personFrom, unmatched, type EligibilityHint, type MatchableJob } from "./match";
import { capPerCompany, closeness, compareRanked, freshness, type Ranked } from "./order";
import {
  CANDIDATE_POOL,
  DEFAULT_SKILL_WEIGHT,
  jobStats,
  matchCandidates,
  savedCandidates,
  savedCount,
  savedIds,
  skillWeights,
  toFeedJob,
  type CandidateRow,
  type CopyRow,
} from "./records";
import { roleFamily } from "./roles";
import {
  JOB_PAGE_SIZE,
  type JobFilters,
  type JobMatchesResponse,
  type MatchedJob,
  type MatchProfile,
  type RoleFamily,
} from "./types";

// Server-only. A match request: candidates from the database, then labels, work-rights rules and
// order, all by rules on our own server. No AI call; Pro all the same (see /api/jobs/matches).

const DAY_MS = 24 * 60 * 60 * 1_000;
const NO_RULES: EligibilityHint = { blocked: false, note: null };
// Copies of one opening checked for a place the person can take before giving up on it.
const COPIES_CHECKED = 6;
const PLACES_SHOWN = 2;

// Which ordering produced a list, logged with every impression so two can be compared later.
export const MATCH_VARIANT = "weighted-v1";

function eligibilityOf(
  row: { location: string; rulesText: string },
  profile: WorkProfile | null,
  options: { now: number; deviceTimeZone: string },
): EligibilityHint {
  if (!row.rulesText && !row.location) return { blocked: false, note: null };
  const findings = checkEligibility({ location: row.location, text: row.rulesText }, profile, {
    now: options.now,
    deviceTimeZone: options.deviceTimeZone || undefined,
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
  deviceTimeZone: string;
  now: number;
};

export type RankResult = Omit<JobMatchesResponse, "ok" | "requestId" | "resumeHash">;

// The copy to show: the first place the person can take, when the work profile says one of
// them is blocked. The others become "also in" places on the card.
function pickCopy(
  row: CandidateRow,
  copies: readonly CopyRow[] | undefined,
  check: ((row: CopyRow | CandidateRow) => EligibilityHint) | null,
): { shown: CopyRow | CandidateRow; others: string[]; hint: EligibilityHint } {
  const list: (CopyRow | CandidateRow)[] = copies
    ? [row, ...copies.filter((copy) => copy.id !== row.id)]
    : [row];
  let shown: CopyRow | CandidateRow = row;
  let hint = check ? check(row) : NO_RULES;
  if (check && hint.blocked) {
    for (const copy of list.slice(1, COPIES_CHECKED)) {
      const other = check(copy);
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

export async function rankJobs(db: Db, request: RankRequest): Promise<RankResult> {
  const { now, filters } = request;
  const person = personFrom(request.profile);
  const profileReady = request.workProfile !== null && isProfileStarted(request.workProfile);
  const options = { now, deviceTimeZone: request.deviceTimeZone };
  // Without a work profile nothing can be blocked, so the slow rules don't run at all.
  const check = profileReady
    ? (row: { location: string; rulesText: string }) =>
        eligibilityOf(row, request.workProfile, options)
    : null;

  const firstSeen = new Map<string, number>();
  let ranked: MatchedJob[] = [];
  let groups = 0;

  if (request.view === "saved") {
    const rows = await savedCandidates(db, request.userId);
    ranked = rows.map((row, index) => {
      const hint = check ? check(row) : NO_RULES;
      const facts = factsOf(row);
      const match = matchJob(person, facts, hint) ?? unmatched(facts, hint);
      firstSeen.set(row.id, row.firstSeenAt);
      return {
        ...toFeedJob(row),
        match,
        saved: true,
        otherPlaces: [],
        morePlaces: 0,
        position: index + 1,
      };
    });
    groups = ranked.length;
  } else {
    const weights = await skillWeights(db);
    const weight = (skill: string) => weights.get(skill) ?? DEFAULT_SKILL_WEIGHT;
    const pool = await matchCandidates(
      db,
      {
        skills: [...person.skills],
        families: [...person.families] as RoleFamily[],
        seniority: person.seniority,
        filters,
        weights,
      },
      now,
    );
    groups = pool.groups;
    const scored: (Ranked & { job: MatchedJob })[] = [];
    for (const row of pool.rows) {
      const facts = factsOf(row);
      // Skills and titles first: they're cheap, and a job that fails them never needs the rules.
      if (!matchJob(person, facts)) continue;
      const { shown, others, hint } = pickCopy(row, pool.copies.get(row.groupKey), check);
      const match = matchJob(person, facts, hint) ?? unmatched(facts, hint);
      if (filters.eligibleOnly && match.blocked) continue;
      const family = roleFamily(row.title);
      const sameKind = family !== null && person.families.has(family);
      firstSeen.set(shown.id, row.firstSeenAt);
      scored.push({
        match,
        company: row.company,
        postedAt: row.postedAt,
        closeness:
          closeness(match, row.keywords, weight, sameKind) *
          freshness(Math.min(row.postedAt, row.firstSeenAt), now),
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
          position: 0,
        },
      });
    }
    scored.sort(compareRanked);
    ranked = capPerCompany(scored).map((item, index) => ({ ...item.job, position: index + 1 }));
  }

  const start = (request.page - 1) * JOB_PAGE_SIZE;
  const page = ranked.slice(start, start + JOB_PAGE_SIZE);
  if (request.view === "matches") {
    const saved = await savedIds(
      db,
      request.userId,
      page.map((job) => job.id),
    );
    for (const job of page) job.saved = saved.has(job.id);
  }
  const stats = await jobStats(db);
  return {
    jobs: page,
    page: request.page,
    pageSize: JOB_PAGE_SIZE,
    total: ranked.length,
    matching: request.view === "matches" ? groups : ranked.length,
    capped: request.view === "matches" && groups > CANDIDATE_POOL,
    strong: ranked.filter((job) => job.match.label === "strong").length,
    newToday: ranked.filter((job) => (firstSeen.get(job.id) ?? 0) >= now - DAY_MS).length,
    savedCount: await savedCount(db, request.userId),
    openJobs: stats.openJobs,
    checkedAt: stats.checkedAt,
    profileReady,
    variant: MATCH_VARIANT,
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
