import { checkEligibility } from "@/lib/eligibility/check";
import { REGION_NAMES, WORK_REGIONS, type WorkProfile } from "@/lib/eligibility/profile";
import type { EligibilityFinding } from "@/lib/eligibility/types";
import type { ExtensionProfile } from "@/lib/extension/types";
import { jobPlaces } from "@/lib/job-feed/job-places";
import { acceptedPlaces, placeFit, placeLabel } from "@/lib/job-feed/looking-for";
import type { PlaceChoice } from "@/lib/job-feed/types";
import type { MatchCheck, MatchRow } from "@/lib/match-check/check";
import { matchCheckFromText } from "@/lib/match-check/from-text";
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
  if (total === 0) return "No skills Otto knows in this post";
  return `${found} of ${total} ${total === 1 ? "skill" : "skills"} found`;
}

export function missingLine(missing: readonly string[]): string | null {
  if (missing.length === 0) return null;
  const shown = missing.slice(0, MISSING_SHOWN).join(", ");
  const more = missing.length - MISSING_SHOWN;
  return `Missing: ${shown}${more > 0 ? ` and ${more} more` : ""}`;
}

const GROUP_SHORT: Record<string, string> = {
  "g:north_america": "North America",
  "g:latam": "Latin America",
  "g:europe": "Europe",
  "g:eu": "EU",
  "g:emea": "EMEA",
  "g:apac": "APAC",
  "g:anz": "Australia and New Zealand",
  "g:americas": "the Americas",
  "*": "worldwide",
};

const SHORT_REGION: Record<string, string> = { us: "US", uk: "UK", eu: "EU", ca: "Canada" };

const REMOTE = /\b(?:remote|work from home|wfh|anywhere|distributed|telecommute)\b/i;
const NOT_REMOTE = /\b(?:on-?site|in[- ]office|work from office|hybrid)\b/i;

function firstSentence(note: string): string {
  return (/^.*?[.!?](?=\s|$)/.exec(note)?.[0] ?? note).replace(/[.!?]$/, "");
}

// The blocked finding, in the few words a badge has room for.
export function blockedText(finding: EligibilityFinding): string {
  const region = WORK_REGIONS.find((code) => finding.note.includes(REGION_NAMES[code]));
  if (finding.rule === "authorization" && region)
    return `Needs ${SHORT_REGION[region]} work authorization`;
  if (finding.rule === "sponsorship" && region)
    return `No visa sponsorship for the ${SHORT_REGION[region]}`.replace("the Canada", "Canada");
  if (finding.rule === "location") {
    const sentence = firstSentence(finding.note);
    const forPeople = /^This is for people in (.+)$/.exec(sentence);
    if (forPeople) return `Only for people in ${forPeople[1]}`;
    const onSite = /^The job is in (.+), and it isn't remote$/.exec(sentence);
    if (onSite) return `On-site in ${onSite[1]}`;
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
  const area =
    matched && matched !== `c:${choice.slice(2)}` ? (GROUP_SHORT[matched] ?? null) : null;
  return [remote ? "remote" : null, area].filter(Boolean).join(", ");
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
    return {
      tone: "ok",
      text: `Open to ${placeLabel(lookingFor.place)}${details ? ` (${details})` : ""}`,
      findings,
    };
  }
  if (fit === "miss") {
    return {
      tone: "check",
      text: `Posted for ${postedFor(post.location)}, not ${placeLabel(lookingFor.place)}`,
      findings,
    };
  }
  const check = findings.find((finding) => finding.verdict === "check");
  if (check) return { tone: "check", text: firstSentence(check.note), findings };
  const where = findings.find((finding) => finding.rule === "location" && finding.verdict === "ok");
  if (where) return { tone: "ok", text: firstSentence(where.note), findings };
  const text = post.location
    ? `Posted for ${postedFor(post.location)}`
    : "No place or work rules in the post";
  return { tone: "none", text, findings };
}

// "Remote · New York City, NY, USA" reads better as "New York City, NY, USA (remote)".
function postedFor(location: string): string {
  const place = location.replace(/^remote\s*[·,|-]\s*/i, "");
  return place === location ? location : `${place} (remote)`;
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
