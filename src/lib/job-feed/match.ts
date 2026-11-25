import type { Locale } from "@/i18n/config";
import { fmt, selectPlural } from "@/i18n/format";
import englishWords from "@/i18n/messages/en/match-reasons";
import { roleFamily, SENIORITY_RANK } from "./roles";
import { levelOf, type LookingFor } from "./looking-for";
import { knownSkills } from "./skills";
import type { JobMatch, MatchLabel, MatchProfile, RoleFamily, Seniority } from "./types";

export type MatchPerson = {
  skills: ReadonlySet<string>;
  families: ReadonlyMap<RoleFamily, number>;
  occupations: ReadonlyMap<string, number>;
  titled: ReadonlyMap<string, number>;
  minors: ReadonlyMap<string, number>;
  majors: ReadonlyMap<string, number>;
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
  family?: RoleFamily | null;
  occupation?: string | null;
  occupationName?: string | null;
  zone?: number | null;
  // How near the job's title is to the person's role by title vectors, when both have one.
  kind?: Kind | null;
};

export type EligibilityHint = { blocked: boolean; note: string | null };

export type TitleKind = { family: RoleFamily | null; occupation: string | null };

export type OccupationReader = {
  read(title: string): TitleKind;
  neighbours(code: string): { close: readonly string[]; related: readonly string[] };
  zone(code: string): number | null;
};

export const FAMILIES_ONLY: OccupationReader = {
  read: (title) => ({ family: roleFamily(title), occupation: null }),
  neighbours: () => ({ close: [], related: [] }),
  zone: () => null,
};

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
  via: "family" | "same" | "close" | "group" | "title" | null;
  // The job's role and the person's when their titles differ but mean the same work.
  role?: { job: string; person: string } | null;
};

export function kindOf(
  person: MatchPerson,
  job: Pick<MatchableJob, "title" | "family" | "occupation" | "kind">,
): Kind {
  if (job.kind) return job.kind;
  const family = job.family !== undefined ? job.family : roleFamily(job.title);
  const code = job.occupation ?? null;
  const exact = code ? (person.occupations.get(code) ?? 0) : 0;
  if (family && person.families.size > 0) {
    const weight = person.families.get(family) ?? 0;
    if (weight > 0) return { weight, via: "family" };
    // "Software Engineer, Marketing Technology" files under marketing but is the very same occupation.
    return exact >= 1 ? { weight: exact, via: "same" } : { weight: 0, via: null };
  }
  if (!code) return { weight: 0, via: null };
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

export type JobMatchWords = typeof englishWords;
// The words a reason is written in and the locale that picks their plural forms.
export type MatchCopy = { words: JobMatchWords; locale: Locale };
export const ENGLISH_MATCH_COPY: MatchCopy = { words: englishWords, locale: "en" };

function list(items: readonly string[], max: number, words: JobMatchWords): string {
  const shown = items.slice(0, max);
  const more = items.length - shown.length;
  return more > 0 ? fmt(words.list, { items: shown.join(", "), count: more }) : shown.join(", ");
}

function stepDown(label: MatchLabel): MatchLabel {
  return label === "strong" ? "good" : "stretch";
}

export function matchJob(
  person: MatchPerson,
  job: MatchableJob,
  eligibility: EligibilityHint = { blocked: false, note: null },
  { words, locale }: MatchCopy = ENGLISH_MATCH_COPY,
): JobMatch | null {
  const found = job.keywords.filter((skill) => person.skills.has(skill));
  const missing = job.keywords.filter((skill) => !person.skills.has(skill));
  const total = job.keywords.length;
  const coverage = total === 0 ? 0 : found.length / total;
  const kind = kindOf(person, job);
  const sameKind = kind.weight >= KIND.same;
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
      notes.push(fmt(words.stepUp, { level: words.levels[job.seniority] }));
    } else if (gap <= -2 && label === "strong") {
      label = "good";
      notes.push(fmt(words.stepDown, { level: words.levels[job.seniority] }));
    }
  }
  if (
    person.zone !== null &&
    job.zone &&
    job.occupation &&
    job.occupation !== person.occupation &&
    job.zone - person.zone >= 2
  ) {
    label = "stretch";
    notes.push(words.training);
  }
  if (job.minYears !== null && person.years !== null && person.years + 1 <= job.minYears) {
    label = stepDown(label);
    const count = Math.max(0, Math.floor(person.years));
    const shown = fmt(selectPlural(locale, words.yearsShown, count), { count });
    notes.push(fmt(words.years, { asked: job.minYears, shown }));
  }
  if (eligibility.blocked) {
    label = "stretch";
    if (eligibility.note) notes.push(eligibility.note);
  }

  let reason: string;
  const role = kind.role
    ? fmt(words.roleMatch, { job: kind.role.job, person: kind.role.person })
    : "";
  if (found.length > 0) {
    reason = fmt(words.found, { list: list(found, MAX_FOUND_SHOWN, words) });
    if (missing.length > 0)
      reason += ` ${fmt(words.notFound, { list: list(missing, MAX_MISSING_SHOWN, words) })}`;
  } else {
    const what = kindLine(kind, pastKind, job.occupationName ?? null, words);
    reason =
      total > 0
        ? `${what} ${fmt(words.notFound, { list: list(missing, MAX_MISSING_SHOWN, words) })}`
        : `${what} ${words.noTools}`;
  }
  return { label, found, missing, reason: role + reason, notes, blocked: eligibility.blocked };
}

function kindLine(
  kind: Kind,
  pastKind: boolean,
  name: string | null,
  words: JobMatchWords,
): string {
  const { kind: lines } = words;
  if (kind.via === "same" && !pastKind) return name ? fmt(lines.sameNamed, { name }) : lines.same;
  if (kind.via === "close") return name ? fmt(lines.closeNamed, { name }) : lines.close;
  if (kind.via === "group") return name ? fmt(lines.groupNamed, { name }) : lines.group;
  if (kind.via === "title") return pastKind ? lines.neighbour : lines.sameRole;
  return pastKind ? lines.earlier : lines.sameRole;
}

export function unmatched(
  job: MatchableJob,
  eligibility?: EligibilityHint,
  { words }: MatchCopy = ENGLISH_MATCH_COPY,
): JobMatch {
  const missing = [...job.keywords];
  return {
    label: null,
    found: [],
    missing,
    reason:
      missing.length > 0
        ? `${words.nothing} ${fmt(words.notFound, { list: list(missing, MAX_MISSING_SHOWN, words) })}`
        : words.nothingToCheck,
    notes: eligibility?.blocked && eligibility.note ? [eligibility.note] : [],
    blocked: eligibility?.blocked ?? false,
  };
}
