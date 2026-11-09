import { roleFamily, SENIORITY_RANK, seniorityForYears, seniorityOf } from "./roles";
import { knownSkills } from "./skills";
import type { JobMatch, MatchLabel, MatchProfile, RoleFamily, Seniority } from "./types";

// Client-safe and pure. How one job lines up with one resume, as a label (Strong, Good, Stretch)
// and the plain reason behind it. There is deliberately no score: the reason names the skills
// found and not found, so the person can check every word of it against their own resume.

export type MatchPerson = {
  skills: ReadonlySet<string>;
  families: ReadonlySet<RoleFamily>;
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

/** The person as matching sees them, from what the browser sent. */
export function personFrom(profile: MatchProfile): MatchPerson {
  const families = new Set<RoleFamily>();
  for (const title of profile.titles) {
    const family = roleFamily(title);
    if (family) families.add(family);
  }
  // The latest title says the most about the level someone works at now; years fill in when it
  // has no marker, but never claim more than senior on their own.
  const latest = profile.titles[0];
  const fromTitle = latest ? seniorityOf(latest) : null;
  const fromYears = profile.years === null ? null : seniorityForYears(profile.years);
  let seniority: Seniority | null = fromTitle ?? fromYears;
  if (fromTitle && fromYears && SENIORITY_RANK[fromYears] > SENIORITY_RANK[fromTitle]) {
    seniority = fromYears;
  }
  return {
    skills: new Set(knownSkills(profile.skills)),
    families,
    seniority,
    years: profile.years,
  };
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
  const family = roleFamily(job.title);
  const sameKind = family !== null && person.families.has(family);

  if (!sameKind && found.length < 2) return null;

  let label: MatchLabel;
  if (sameKind && ((found.length >= 3 && coverage >= 0.5) || (total > 0 && found.length === total)))
    label = "strong";
  else if ((sameKind && (total === 0 || coverage >= 0.2)) || (found.length >= 4 && coverage >= 0.5))
    label = "good";
  else label = "stretch";

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
  } else if (total > 0) {
    reason = `The same kind of role as yours. Not found: ${list(missing, MAX_MISSING_SHOWN)}.`;
  } else {
    reason = "The same kind of role as yours. The post names no tools to compare.";
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
