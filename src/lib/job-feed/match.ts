import { roleFamily, SENIORITY_RANK } from "./roles";
import { levelOf, type LookingFor } from "./looking-for";
import { knownSkills } from "./skills";
import type { JobMatch, MatchLabel, MatchProfile, RoleFamily, Seniority } from "./types";

// No score on purpose: the reason names skills found and missing, so the person can check it.

export type MatchPerson = {
  skills: ReadonlySet<string>;
  // 1 for the role looked for, PAST_KIND_WEIGHT for older titles, so an old title can't dominate.
  families: ReadonlyMap<RoleFamily, number>;
  // Looked-for occupation 1, O*NET neighbours less (KIND), older titles half; SOC groups likewise.
  occupations: ReadonlyMap<string, number>;
  // Before neighbours are added.
  titled: ReadonlyMap<string, number>;
  minors: ReadonlyMap<string, number>;
  majors: ReadonlyMap<string, number>;
  // O*NET Job Zone (1-5), for "needs more training" notes.
  occupation: string | null;
  zone: number | null;
  seniority: Seniority | null;
  years: number | null;
};

export type MatchableJob = {
  title: string;
  keywords: readonly string[];
  seniority: Seniority;
  minYears: number | null;
  // Read at ingest (normalize.ts); left out, the kind is read from the title alone.
  family?: RoleFamily | null;
  occupation?: string | null;
  occupationName?: string | null;
  zone?: number | null;
};

export type EligibilityHint = { blocked: boolean; note: string | null };

export type TitleKind = { family: RoleFamily | null; occupation: string | null };

export type OccupationReader = {
  read(title: string): TitleKind;
  neighbours(code: string): { close: readonly string[]; related: readonly string[] };
  zone(code: string): number | null;
};

// Without occupation data (the frozen newest-v0 ordering, client code): kinds of role only.
export const FAMILIES_ONLY: OccupationReader = {
  read: (title) => ({ family: roleFamily(title), occupation: null }),
  neighbours: () => ({ close: [], related: [] }),
  zone: () => null,
};

// O*NET's closest five related occupations, its next five, the same SOC minor group, the same major
// group. From SAME_KIND up it's the person's own kind of work; below OWN_KIND, one label lower.
export const KIND = {
  close: 0.85,
  related: 0.7,
  minor: 0.3,
  major: 0.1,
  own: 0.85,
  same: 0.3,
} as const;

const MAX_FOUND_SHOWN = 5;
const MAX_MISSING_SHOWN = 3;
export const PAST_KIND_WEIGHT = 0.5;

const majorOf = (code: string) => code.slice(0, 2);
const minorOf = (code: string) => code.slice(0, 4);

// `reader` reads each title's kind of role and occupation (the server passes the O*NET lookup).
export function personFrom(
  profile: MatchProfile,
  lookingFor?: (Pick<LookingFor, "family" | "level"> & { occupation?: string | null }) | null,
  reader: OccupationReader = FAMILIES_ONLY,
): MatchPerson {
  const families = new Map<RoleFamily, number>();
  const direct = new Map<string, number>();
  if (lookingFor?.family) families.set(lookingFor.family, 1);
  if (lookingFor?.occupation) direct.set(lookingFor.occupation, 1);
  for (const title of profile.titles) {
    const { family, occupation } = reader.read(title);
    // The newest titled job is the role looked for unless the card names another.
    if (family && !families.has(family))
      families.set(family, families.size === 0 ? 1 : PAST_KIND_WEIGHT);
    if (occupation && !direct.has(occupation))
      direct.set(occupation, direct.size === 0 ? 1 : PAST_KIND_WEIGHT);
  }
  const occupations = new Map<string, number>();
  const minors = new Map<string, number>();
  const majors = new Map<string, number>();
  const raise = (map: Map<string, number>, key: string, weight: number) => {
    if (weight > (map.get(key) ?? 0)) map.set(key, weight);
  };
  for (const [code, weight] of direct) {
    raise(occupations, code, weight);
    const { close, related } = reader.neighbours(code);
    for (const other of close) raise(occupations, other, weight * KIND.close);
    for (const other of related) raise(occupations, other, weight * KIND.related);
    raise(minors, minorOf(code), weight * KIND.minor);
    raise(majors, majorOf(code), weight * KIND.major);
  }
  const occupation = [...direct].find(([, weight]) => weight === 1)?.[0] ?? null;
  return {
    skills: new Set(knownSkills(profile.skills)),
    families,
    occupations,
    titled: direct,
    minors,
    majors,
    occupation,
    zone: occupation ? reader.zone(occupation) : null,
    seniority: lookingFor?.level ?? levelOf(profile),
    years: profile.years,
  };
}

export type Kind = {
  weight: number;
  via: "family" | "same" | "close" | "group" | null;
};

// Office and tech jobs by kind of role (tuned on the test set); everything else by occupation.
export function kindOf(
  person: MatchPerson,
  job: Pick<MatchableJob, "title" | "family" | "occupation">,
): Kind {
  const family = job.family !== undefined ? job.family : roleFamily(job.title);
  if (family && person.families.size > 0) {
    const weight = person.families.get(family) ?? 0;
    return { weight, via: weight > 0 ? "family" : null };
  }
  const code = job.occupation ?? null;
  if (!code) return { weight: 0, via: null };
  const exact = person.occupations.get(code) ?? 0;
  const group = Math.max(
    person.minors.get(minorOf(code)) ?? 0,
    person.majors.get(majorOf(code)) ?? 0,
  );
  if (exact > 0 && exact >= group)
    return { weight: exact, via: person.titled.has(code) ? "same" : "close" };
  return { weight: group, via: group > 0 ? "group" : null };
}

export function kindWeight(
  person: MatchPerson,
  job: Pick<MatchableJob, "title" | "family" | "occupation">,
): number {
  return kindOf(person, job).weight;
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

// null when the job shares nothing: no skill in common, and a different kind of role (or one the
// titles don't name) with fewer than 2 skills.
export function matchJob(
  person: MatchPerson,
  job: MatchableJob,
  eligibility: EligibilityHint = { blocked: false, note: null },
): JobMatch | null {
  const found = job.keywords.filter((skill) => person.skills.has(skill));
  const missing = job.keywords.filter((skill) => !person.skills.has(skill));
  const total = job.keywords.length;
  const coverage = total === 0 ? 0 : found.length / total;
  const kind = kindOf(person, job);
  const sameKind = kind.weight >= KIND.same;
  // A kind of work only an older title names, or one next to the looked-for one: one label lower.
  const pastKind = sameKind && kind.weight < KIND.own;

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
  // O*NET Job Zones: 1 is little preparation, 5 extensive.
  if (
    person.zone !== null &&
    job.zone &&
    job.occupation &&
    job.occupation !== person.occupation &&
    job.zone - person.zone >= 2
  ) {
    label = "stretch";
    notes.push("Jobs like this usually need more training or experience than your latest role.");
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
    const what = kindLine(kind, pastKind, job.occupationName ?? null);
    reason =
      total > 0
        ? `${what} Not found: ${list(missing, MAX_MISSING_SHOWN)}.`
        : `${what} The post names no tools to compare.`;
  }
  return { label, found, missing, reason, notes, blocked: eligibility.blocked };
}

function kindLine(kind: Kind, pastKind: boolean, name: string | null): string {
  const named = name ? `: ${name}` : "";
  if (kind.via === "same" && !pastKind) return `The same occupation as yours${named}.`;
  if (kind.via === "close") return `A closely related occupation${named}.`;
  if (kind.via === "group") return `A related kind of work${named}.`;
  return pastKind ? "Like an earlier role on your resume." : "The same kind of role as yours.";
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
