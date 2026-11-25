import { createHash } from "node:crypto";
import { ruleLines } from "@/lib/eligibility/check";
import { detectLanguage } from "@/lib/i18n/detect";
import type { ContentLang } from "@/lib/i18n/languages";
import { postFacts } from "@/lib/eligibility/facts";
import { capText } from "@/lib/jobs/posting";
import { foldCase } from "@/lib/tailor/tokens";
import { hash32 } from "./codes";
import { jobPlaces } from "./job-places";
import type { RawJob } from "./parsers";
import { readTitle } from "./occupations";
import { minYearsOf, seniorityOf } from "./roles";
import { findSkills } from "./skills";
import { titleVectorKey } from "./title-vectors";
import type { EmploymentType, RoleFamily, Seniority } from "./types";

export const JOB_LIMITS = {
  feedDescriptionChars: 6_000,
  rulesChars: 1_500,
  keywords: 40,
  titleChars: 200,
  companyChars: 200,
  locationChars: 300,
  urlChars: 2_048,
} as const;

// What a listing keeps of a post: the text itself is read once here and dropped (but for feeds).
export type NormalizedJob = {
  externalId: string;
  company: string;
  title: string;
  titleKey: string;
  location: string;
  // The places it can be taken from (job-places.ts), space-separated.
  places: string;
  remote: boolean;
  employmentType: EmploymentType | null;
  seniority: Seniority;
  family: RoleFamily | null;
  occupation: string | null;
  minYears: number | null;
  // The language the post is written in, when the detector is sure (docs/i18n.md, job-post language).
  lang: ContentLang | null;
  postedAt: number;
  validThrough: number | null;
  url: string;
  description: string;
  // The work-rights facts (eligibility/facts.ts).
  facts: string;
  keywords: string[];
  dedupeKey: number;
  groupKey: number;
  evergreen: boolean;
  contentHash: number;
};

function oneLine(value: string, max: number): string {
  const line = value.replace(/\s+/g, " ").trim();
  return line.length <= max ? line : `${line.slice(0, max - 1).trimEnd()}…`;
}

export function searchWords(value: string): string {
  return foldCase(value)
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

const COMPANY_SUFFIX =
  /\b(?:inc|llc|ltd|limited|gmbh|ag|sa|sas|bv|plc|corp|corporation|co|company|labs?|technologies|hq)\b/g;
const REMOTE_PLACE = /\b(?:remote|anywhere|worldwide|global|fully|hybrid|work from home)\b/g;

export function brandName(company: string): string {
  return searchWords(company).replace(COMPANY_SUFFIX, " ").replace(/\s+/g, " ").trim();
}

function shortKey(key: string): string {
  return createHash("md5").update(key).digest("hex").slice(0, 16);
}

// 53 bits of the old 16-hex-digit key, so the migration could convert stored keys.
const dedupeNumber = (key: string) => Number(BigInt(`0x${key}`) >> 11n);
// The first 32 bits, read signed as Postgres does.
const groupNumber = (key: string) => Number.parseInt(key.slice(0, 8), 16) | 0;

export function dedupeKey(company: string, title: string, location: string): number {
  const name = brandName(company);
  const role = searchWords(title)
    .replace(/\b(?:sr)\b/g, "senior")
    .replace(/\s+/g, " ");
  const place = [...new Set(searchWords(location).replace(REMOTE_PLACE, " ").split(" "))]
    .filter(Boolean)
    .sort()
    .join(" ");
  return dedupeNumber(shortKey(`${name}|${role}|${place}`));
}

// Bump when normalizing writes something new: every job row is then rewritten (docs/handoff.md §5, database space).
const NORMALIZE_VERSION = "5";

// 32 bits of sha256: a change missed by a collision is 1 in 4 billion.
export function contentHash(job: RawJob): number {
  const parts =
    job.hashKey === undefined ? fieldParts(job) : [NORMALIZE_VERSION, job.company, job.hashKey];
  return hash32(parts.join("\u0000"));
}

function fieldParts(job: RawJob): string[] {
  return [
    NORMALIZE_VERSION,
    job.company,
    job.title,
    job.location,
    String(job.remote),
    job.employmentType ?? "",
    String(job.postedAt ?? ""),
    String(job.validThrough ?? ""),
    job.url,
    job.seniority ?? "",
    job.text,
  ];
}

const FILLER_TITLE =
  /\b(?:general (?:application|applications|interest|submission)|talent (?:community|pool|network|pipeline)|future (?:opportunit(?:y|ies)|openings?|roles?|positions?|hires?)|open application|expression of interest|speculative application|spontaneous application|unsolicited application|(?:submit|send us) your (?:resume|cv)|don'?t see (?:a|the|your)(?: right| perfect)? (?:role|job|position|fit|opening)|(?:can'?t|cannot) find (?:a|the|your)(?: right)? (?:role|job|position))\b/;

export function isFillerTitle(title: string): boolean {
  return FILLER_TITLE.test(foldCase(title).replace(/[’‘]/g, "'"));
}

const PLACE_WORDS = new Set(
  (
    "remote anywhere worldwide global hybrid onsite on site office fully home wfh based " +
    "emea apac apj amer americas latam noram nordics dach benelux europe european eu uk us usa " +
    "north south east west central america united states kingdom canada mexico brazil argentina " +
    "colombia chile peru germany france spain portugal italy netherlands belgium ireland poland " +
    "sweden norway denmark finland switzerland austria czechia romania greece israel turkey " +
    "australia zealand japan korea singapore philippines indonesia vietnam thailand malaysia " +
    "nigeria kenya egypt africa asia pacific middle region timezone time zone zones"
  ).split(" "),
);
const PLACE_LINE =
  /\b(?:locations?|based in|located in|relocat\w*|on-?site|in-?office|hybrid|remote|time ?zones?|commut\w*)\b/;
const PAY_LINE =
  /[$£€¥]\s?\d|\b\d{2,3}[,.]\d{3}\b|\b\d{2,3}k\b|\b(?:salary|compensation|pay range|base pay|ote|equity|per hour|hourly)\b/;

function placeTokens(location: string): Set<string> {
  return new Set(
    searchWords(location)
      .split(" ")
      .filter((word) => word.length >= 2),
  );
}

function withoutPlace(words: string, place: ReadonlySet<string>, { numbers = false } = {}): string {
  return words
    .split(" ")
    .filter(
      (word) =>
        word && !place.has(word) && !PLACE_WORDS.has(word) && !(numbers && /^\d+$/.test(word)),
    )
    .join(" ");
}

export function groupKey(company: string, title: string, location: string, text: string): number {
  const place = placeTokens(location);
  const name = searchWords(company).replace(COMPANY_SUFFIX, " ").replace(/\s+/g, " ").trim();
  const role = withoutPlace(searchWords(title).replace(/\b(?:sr)\b/g, "senior"), place);
  const lines = text.split("\n");
  const kept = lines.filter((line) => {
    const folded = foldCase(line);
    return !PLACE_LINE.test(folded) && !PAY_LINE.test(folded);
  });
  const source = kept.join("").length >= text.length * 0.3 ? kept : lines;
  const body = source
    .map((line) => withoutPlace(searchWords(line), place, { numbers: true }))
    .filter(Boolean)
    .join("\n");
  const hash = createHash("sha256").update(body).digest("base64url").slice(0, 16);
  return groupNumber(shortKey(`${name}|${role}|${hash}`));
}

const lineKey = (line: string) => line.replace(/\s+/g, " ").trim().toLowerCase();
const MIN_BOILERPLATE_CHARS = 40;

export function boilerplateLines(texts: readonly string[]): Set<string> {
  const shared = new Set<string>();
  if (texts.length < 4) return shared;
  const seen = new Map<string, number>();
  for (const text of texts) {
    for (const key of new Set(text.split("\n").map(lineKey))) {
      if (key.length >= MIN_BOILERPLATE_CHARS) seen.set(key, (seen.get(key) ?? 0) + 1);
    }
  }
  const threshold = Math.max(3, texts.length / 2);
  for (const [key, times] of seen) if (times >= threshold) shared.add(key);
  return shared;
}

const LANGUAGE_SAMPLE_CHARS = 4_000;

// Read from the post's own words, so a careers page's shared English footer doesn't decide.
export function postLanguage(title: string, text: string): ContentLang | null {
  const { lang } = detectLanguage(`${title}\n${text.slice(0, LANGUAGE_SAMPLE_CHARS)}`);
  return lang === "unknown" ? null : lang;
}

export function normalizeJob(
  job: RawJob,
  now: number,
  boilerplate: ReadonlySet<string> = new Set(),
  textChars = 0,
): NormalizedJob {
  const title = oneLine(job.title, JOB_LIMITS.titleChars);
  const company = oneLine(job.company, JOB_LIMITS.companyChars);
  const location = oneLine(job.location, JOB_LIMITS.locationChars);
  const text = job.text.trim();
  const own =
    boilerplate.size === 0
      ? text
      : text
          .split("\n")
          .filter((line) => !boilerplate.has(lineKey(line)))
          .join("\n");
  const brand = brandName(company);
  const keywords = findSkills(`${title}\n${own}`, JOB_LIMITS.keywords + 1)
    .filter((skill) => searchWords(skill) !== brand)
    .slice(0, JOB_LIMITS.keywords);
  const fromTitle = seniorityOf(title);
  const kind = readTitle(title);
  const postedAt = job.postedAt !== null && job.postedAt <= now ? job.postedAt : now;
  const rules = ruleLines(text, JOB_LIMITS.rulesChars);
  return {
    externalId: job.externalId.slice(0, 300),
    company,
    title,
    titleKey: titleVectorKey(title),
    location,
    places: jobPlaces(location, rules).join(" "),
    remote: job.remote,
    employmentType: job.employmentType,
    seniority: fromTitle === "mid" && job.seniority ? job.seniority : fromTitle,
    family: kind.family,
    occupation: kind.occupation,
    minYears: minYearsOf(own),
    lang: postLanguage(title, own),
    postedAt,
    validThrough: job.validThrough,
    url: job.url.slice(0, JOB_LIMITS.urlChars),
    description: textChars > 0 ? capText(text, textChars) : "",
    facts: postFacts({ location, text: rules }),
    keywords,
    dedupeKey: dedupeKey(company, title, location),
    groupKey: groupKey(company, title, location, text),
    evergreen: isFillerTitle(title),
    contentHash: contentHash(job),
  };
}
