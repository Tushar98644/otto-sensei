import { checkEligibility } from "@/lib/eligibility/check";
import { REGION_NAMES, WORK_REGIONS, type WorkProfile } from "@/lib/eligibility/profile";
import type { EligibilityFinding } from "@/lib/eligibility/types";
import type { ExtensionProfile } from "@/lib/extension/types";
import { jobPlaces } from "@/lib/job-feed/job-places";
import { acceptedPlaces, placeFit, placeLabel } from "@/lib/job-feed/looking-for";
import type { PlaceChoice } from "@/lib/job-feed/types";
import type { MatchCheck, MatchRow } from "@/lib/match-check/check";
import { matchCheckFromText } from "@/lib/match-check/from-text";
import { pluralKey, t, wordsLang, type MessageKey } from "./i18n";
import type { JobPost } from "./page/post";

export type SkillsSummary = {
  found: number;
  total: number;
  missing: string[];
  rows: MatchRow[];
};

export type EligibilityTone = "ok" | "check" | "blocked" | "none";

export type EligibilityLine = {
  tone: EligibilityTone;
  text: string;
  findings: EligibilityFinding[];
};

export type BadgeMatch = { skills: SkillsSummary | null; eligibility: EligibilityLine };

const MISSING_SHOWN = 3;
// A work-rights rule says more than where the job is, so it leads when both block.
const BLOCKED_FIRST = [
  "authorization",
  "sponsorship",
  "location",
  "time_zone",
  "work_type",
] as const;

export function importanceRank(row: Pick<MatchRow, "importance">): number {
  return row.importance === "must" ? 0 : row.importance === "nice" ? 2 : 1;
}

// Must-haves first, nice-to-haves last: a recruiter screens on the first.
export function skillsSummary(check: MatchCheck): SkillsSummary {
  const missing = check.rows
    .filter((row) => row.status === "missing")
    .sort((a, b) => importanceRank(a) - importanceRank(b))
    .map((row) => row.term);
  return { found: check.found, total: check.total, missing, rows: check.rows };
}

export function skillsLine({ found, total }: Pick<SkillsSummary, "found" | "total">): string {
  if (total === 0) return t("noSkills");
  return t(pluralKey(total, "skillsFoundOne", "skillsFoundOther"), found, total);
}

export function missingLine(missing: readonly string[]): string | null {
  if (missing.length === 0) return null;
  const shown = missing.slice(0, MISSING_SHOWN).join(", ");
  const more = missing.length - MISSING_SHOWN;
  return more > 0 ? t("missingMore", shown, more) : t("missing", shown);
}

const GROUP_SHORT: Record<string, MessageKey> = {
  "g:north_america": "groupNorthAmerica",
  "g:latam": "groupLatam",
  "g:europe": "groupEurope",
  "g:eu": "groupEu",
  "g:emea": "groupEmea",
  "g:apac": "groupApac",
  "g:anz": "groupAnz",
  "g:americas": "groupAmericas",
  "*": "groupWorldwide",
};

const NEEDS_RIGHTS: Record<string, MessageKey> = {
  us: "authUs",
  uk: "authUk",
  eu: "authEu",
  ca: "authCa",
};

const NO_SPONSORSHIP: Record<string, MessageKey> = {
  us: "visaUs",
  uk: "visaUk",
  eu: "visaEu",
  ca: "visaCa",
};

const PLACE_GROUPS: Record<string, MessageKey> = {
  north_america: "placeNorthAmerica",
  latam: "placeLatam",
  europe: "placeEurope",
  eu: "placeEu",
  emea: "placeEmea",
  apac: "placeApac",
  anz: "placeAnz",
};

// Where the person looks for jobs, in the extension's words; English keeps the app's own labels.
export function placeName(choice: PlaceChoice): string {
  const lang = wordsLang();
  if (lang === "en") return placeLabel(choice);
  if (choice === "anywhere") return t("placeAnywhere");
  const group = choice.startsWith("g:") ? PLACE_GROUPS[choice.slice(2)] : undefined;
  if (group) return t(group);
  try {
    const name = new Intl.DisplayNames([lang], { type: "region" }).of(choice.slice(2));
    return name ?? placeLabel(choice);
  } catch {
    return placeLabel(choice);
  }
}

const REMOTE = /\b(?:remote|work from home|wfh|anywhere|distributed|telecommute)\b/i;
const NOT_REMOTE = /\b(?:on-?site|in[- ]office|work from office|hybrid)\b/i;

function firstSentence(note: string): string {
  return (/^.*?[.!?](?=\s|$)/.exec(note)?.[0] ?? note).replace(/[.!?]$/, "");
}

// The blocked finding, in the few words a badge has room for.
export function blockedText(finding: EligibilityFinding): string {
  const region = WORK_REGIONS.find((code) => finding.note.includes(REGION_NAMES[code]));
  const needs = region ? NEEDS_RIGHTS[region] : undefined;
  if (finding.rule === "authorization" && needs) return t(needs);
  const noVisa = region ? NO_SPONSORSHIP[region] : undefined;
  if (finding.rule === "sponsorship" && noVisa) return t(noVisa);
  if (finding.rule === "location") {
    const sentence = firstSentence(finding.note);
    const forPeople = /^This is for people in (.+)$/.exec(sentence);
    if (forPeople) return t("onlyFor", forPeople[1] ?? "");
    const onSite = /^The job is in (.+), and it isn't remote$/.exec(sentence);
    if (onSite) return t("onSite", onSite[1] ?? "");
    return sentence;
  }
  return firstSentence(finding.note);
}

function placeDetails(
  location: string,
  text: string,
  matched: string | null,
  choice: PlaceChoice,
): string {
  const remote =
    REMOTE.test(location) || (!NOT_REMOTE.test(location) && REMOTE.test(text.slice(0, 4000)));
  const area = matched && matched !== `c:${choice.slice(2)}` ? GROUP_SHORT[matched] : undefined;
  return [remote ? t("remoteWord") : null, area ? t(area) : null].filter(Boolean).join(", ");
}

export function eligibilityLine(
  post: Pick<JobPost, "location" | "text">,
  profile: WorkProfile | null,
  lookingFor: ExtensionProfile["lookingFor"],
  options: { now: number; deviceTimeZone?: string },
): EligibilityLine {
  const findings = checkEligibility({ location: post.location, text: post.text }, profile, options);
  const blocked = BLOCKED_FIRST.flatMap(
    (rule) =>
      findings.find((finding) => finding.rule === rule && finding.verdict === "blocked") ?? [],
  )[0];
  if (blocked) return { tone: "blocked", text: blockedText(blocked), findings };

  const tokens = jobPlaces(post.location, post.text);
  const accepted = acceptedPlaces(lookingFor.place);
  const fit = placeFit(tokens, accepted);
  if (fit === "match" && lookingFor.place !== "anywhere") {
    const matched = tokens.find((token) => accepted?.includes(token)) ?? null;
    const details = placeDetails(post.location, post.text, matched, lookingFor.place);
    const place = placeName(lookingFor.place);
    return {
      tone: "ok",
      text: details ? t("openToDetails", place, details) : t("openTo", place),
      findings,
    };
  }
  if (fit === "miss") {
    return {
      tone: "check",
      text: t("postedForNot", postedFor(post.location), placeName(lookingFor.place)),
      findings,
    };
  }
  const check = findings.find((finding) => finding.verdict === "check");
  if (check) return { tone: "check", text: firstSentence(check.note), findings };
  const where = findings.find((finding) => finding.rule === "location" && finding.verdict === "ok");
  if (where) return { tone: "ok", text: firstSentence(where.note), findings };
  const text = post.location ? t("postedFor", postedFor(post.location)) : t("noRules");
  return { tone: "none", text, findings };
}

// "Remote · New York City, NY, USA" reads better as "New York City, NY, USA (remote)".
function postedFor(location: string): string {
  const place = location.replace(/^remote\s*[·,|-]\s*/i, "");
  return place === location ? location : t("remotePlace", place);
}

export function badgeMatch(
  post: JobPost,
  resumeText: string | null,
  profile: ExtensionProfile,
  options: { now: number; deviceTimeZone?: string },
): BadgeMatch {
  return {
    skills: resumeText === null ? null : skillsSummary(matchCheckFromText(resumeText, post.text)),
    eligibility: eligibilityLine(post, profile.workProfile, profile.lookingFor, options),
  };
}
