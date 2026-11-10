import { roleFamily, SENIORITY_RANK } from "./roles";
import { levelOf, type LookingFor } from "./looking-for";
import { knownSkills } from "./skills";
import type { JobMatch, MatchLabel, MatchProfile, RoleFamily, Seniority } from "./types";

// Client-safe and pure. How one job lines up with one resume, as a label (Strong, Good, Stretch)
// and the plain reason behind it. There is deliberately no score: the reason names the skills
// found and not found, so the person can check every word of it against their own resume.

export type MatchPerson = {
  skills: ReadonlySet<string>;
  // Kinds of role and how much each counts: 1 for the role looked for (the latest titled job,
  // unless the "Looking for" card says otherwise), PAST_KIND_WEIGHT for older titles. An old
  // "Business Analyst" title once made operations count fully for a product manager
  // (MATCHING-RESEARCH.md, Round 2: product-pm-mid fell 76 -> 55).
  families: ReadonlyMap<RoleFamily, number>;
  seniority: Seniority | null;
  years: number | null;
};

export type MatchableJob = {
  title: string;
  keywords: readonly string[];
  seniority: Seniority;
  minYears: number | null;
};

export type EligibilityHint = { blocked: boolean; note: string | null };

const MAX_FOUND_SHOWN = 5;
const MAX_MISSING_SHOWN = 3;
export const PAST_KIND_WEIGHT = 0.5;

/** The person as matching sees them, from what the browser sent and the "Looking for" card. */
export function personFrom(
  profile: MatchProfile,
  lookingFor?: Pick<LookingFor, "family" | "level"> | null,
): MatchPerson {
  const families = new Map<RoleFamily, number>();
  if (lookingFor?.family) families.set(lookingFor.family, 1);
  for (const title of profile.titles) {
    const family = roleFamily(title);
    if (!family || families.has(family)) continue;
    // The newest titled job is the role looked for unless the card names another.
    families.set(family, families.size === 0 ? 1 : PAST_KIND_WEIGHT);
  }
  return {
    skills: new Set(knownSkills(profile.skills)),
    families,
    seniority: lookingFor?.level ?? levelOf(profile),
    years: profile.years,
  };
}

/** How much the job's kind of role counts for this person: 1, PAST_KIND_WEIGHT or 0. */
export function kindWeight(person: MatchPerson, title: string): number {
  const family = roleFamily(title);
  return family === null ? 0 : (person.families.get(family) ?? 0);
}

function list(items: readonly string[], max: number): string {
  const shown = items.slice(0, max);
  const more = items.length - shown.length;
  return more > 0 ? `${shown.join(", ")} and ${more} more` : shown.join(", ");
}

function stepDown(label: MatchLabel): MatchLabel {
  return label === "strong" ? "good" : "stretch";
}

const LEVEL_WORDS: Record<Seniority, string> = {
  intern: "an internship",
  junior: "an entry-level role",
  mid: "a mid-level role",
  senior: "a senior role",
  lead: "a lead or staff role",
  director: "a director-level role",
};

/**
 * The label and reason for one job. null when the job shares nothing with the resume: no skill
 * in common, and a different kind of role (or one the titles don't name) with fewer than 2 skills.
 */
export function matchJob(
  person: MatchPerson,
  job: MatchableJob,
  eligibility: EligibilityHint = { blocked: false, note: null },
): JobMatch | null {
  const found = job.keywords.filter((skill) => person.skills.has(skill));
  const missing = job.keywords.filter((skill) => !person.skills.has(skill));
  const total = job.keywords.length;
  const coverage = total === 0 ? 0 : found.length / total;
  const weight = kindWeight(person, job.title);
  const sameKind = weight > 0;
  // A kind of role only an older title names: one label lower than the role looked for.
  const pastKind = sameKind && weight < 1;

  if (!sameKind && found.length < 2) return null;

  let label: MatchLabel;
  if (sameKind && ((found.length >= 3 && coverage >= 0.5) || (total > 0 && found.length === total)))
    label = "strong";
  else if ((sameKind && (total === 0 || coverage >= 0.2)) || (found.length >= 4 && coverage >= 0.5))
    label = "good";
  else label = "stretch";
  if (pastKind) label = stepDown(label);

  const notes: string[] = [];
  if (person.seniority) {
    const gap = SENIORITY_RANK[job.seniority] - SENIORITY_RANK[person.seniority];
    if (gap >= 2) {
      label = "stretch";
      notes.push(`This is ${LEVEL_WORDS[job.seniority]}, a step up from your latest title.`);
    } else if (gap <= -2 && label === "strong") {
      label = "good";
      notes.push(`This is ${LEVEL_WORDS[job.seniority]}, more junior than your latest title.`);
    }
  }
  if (job.minYears !== null && person.years !== null && person.years + 1 <= job.minYears) {
    label = stepDown(label);
    const shown = Math.max(0, Math.floor(person.years));
    notes.push(
      `Asks for ${job.minYears}+ years; your resume shows about ${shown === 1 ? "1 year" : `${shown} years`}.`,
    );
  }
  if (eligibility.blocked) {
    label = "stretch";
    if (eligibility.note) notes.push(eligibility.note);
  }

  let reason: string;
  if (found.length > 0) {
    reason = `Found in your resume: ${list(found, MAX_FOUND_SHOWN)}.`;
    if (missing.length > 0) reason += ` Not found: ${list(missing, MAX_MISSING_SHOWN)}.`;
  } else {
    const kind = pastKind ? "Like an earlier role on your resume." : "The same kind of role as yours.";
    reason =
      total > 0
        ? `${kind} Not found: ${list(missing, MAX_MISSING_SHOWN)}.`
        : `${kind} The post names no tools to compare.`;
  }
  return { label, found, missing, reason, notes, blocked: eligibility.blocked };
}

/** A saved job that shares nothing with the resume still shows, with no label. */
export function unmatched(job: MatchableJob, eligibility?: EligibilityHint): JobMatch {
  const missing = [...job.keywords];
  return {
    label: null,
    found: [],
    missing,
    reason:
      missing.length > 0
        ? `Nothing it names is in this resume. Not found: ${list(missing, MAX_MISSING_SHOWN)}.`
        : "This resume and this post have nothing in common that I can check.",
    notes: eligibility?.blocked && eligibility.note ? [eligibility.note] : [],
    blocked: eligibility?.blocked ?? false,
  };
}
