import { createHash } from "node:crypto";
import { ruleLines } from "@/lib/eligibility/check";
import { capText } from "@/lib/jobs/posting";
import { foldCase } from "@/lib/tailor/tokens";
import type { RawJob } from "./parsers";
import { readTitle } from "./occupations";
import { minYearsOf, seniorityOf } from "./roles";
import { findSkills } from "./skills";
import type { EmploymentType, RoleFamily, Seniority } from "./types";

// Everything is worked out at ingest, so a match request only compares short lists.

export const JOB_LIMITS = {
  // Kept only for sources that can't be read again (Himalayas, Remote OK); others use full-post.ts.
  feedDescriptionChars: 6_000,
  rulesChars: 1_500,
  keywords: 40,
  titleChars: 200,
  companyChars: 200,
  locationChars: 300,
  urlChars: 2_048,
} as const;

export type NormalizedJob = {
  externalId: string;
  company: string;
  title: string;
  location: string;
  remote: boolean;
  employmentType: EmploymentType | null;
  seniority: Seniority;
  family: RoleFamily | null;
  occupation: string | null;
  minYears: number | null;
  postedAt: number;
  validThrough: number | null;
  url: string;
  description: string;
  rulesText: string;
  keywords: string[];
  // Accent-folded words for to_tsvector('simple', ...).
  searchText: string;
  dedupeKey: string;
  // One opening posted once per place shares this: Matches shows the group as one card.
  groupKey: string;
  // "General application", "Talent community" and the like: kept on /jobs, hidden from Matches.
  evergreen: boolean;
  contentHash: string;
};

function oneLine(value: string, max: number): string {
  const line = value.replace(/\s+/g, " ").trim();
  return line.length <= max ? line : `${line.slice(0, max - 1).trimEnd()}…`;
}

/** Lowercase letters and digits only, accents dropped: "Café-Bar" -> "cafe bar". */
export function searchWords(value: string): string {
  return foldCase(value)
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

const COMPANY_SUFFIX =
  /\b(?:inc|llc|ltd|limited|gmbh|ag|sa|sas|bv|plc|corp|corporation|co|company|labs?|technologies|hq)\b/g;
const REMOTE_PLACE = /\b(?:remote|anywhere|worldwide|global|fully|hybrid|work from home)\b/g;

/** The company's name without legal suffixes, as search words: "Databricks, Inc." -> "databricks". */
export function brandName(company: string): string {
  return searchWords(company).replace(COMPANY_SUFFIX, " ").replace(/\s+/g, " ").trim();
}

// Keys are only compared, so store the first 16 hex of their MD5: a quarter of the size.
function shortKey(key: string): string {
  return createHash("md5").update(key).digest("hex").slice(0, 16);
}

export function dedupeKey(company: string, title: string, location: string): string {
  const name = brandName(company);
  const role = searchWords(title)
    .replace(/\b(?:sr)\b/g, "senior")
    .replace(/\s+/g, " ");
  const place = [...new Set(searchWords(location).replace(REMOTE_PLACE, " ").split(" "))]
    .filter(Boolean)
    .sort()
    .join(" ");
  return shortKey(`${name}|${role}|${place}`);
}

// Bump when normalizing writes something new, so every job is rewritten on its next read.
const NORMALIZE_VERSION = "5";

/** Everything normalizing reads, so an unchanged job can skip it. */
export function contentHash(job: RawJob): string {
  const parts = [
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
  return createHash("sha256").update(parts.join("\u0000")).digest("base64url").slice(0, 32);
}

// They share a skill with every resume and rarely lead to a hire.
const FILLER_TITLE =
  /\b(?:general (?:application|applications|interest|submission)|talent (?:community|pool|network|pipeline)|future (?:opportunit(?:y|ies)|openings?|roles?|positions?|hires?)|open application|expression of interest|speculative application|spontaneous application|unsolicited application|(?:submit|send us) your (?:resume|cv)|don'?t see (?:a|the|your)(?: right| perfect)? (?:role|job|position|fit|opening)|(?:can'?t|cannot) find (?:a|the|your)(?: right)? (?:role|job|position))\b/;

export function isFillerTitle(title: string): boolean {
  return FILLER_TITLE.test(foldCase(title).replace(/[’‘]/g, "'"));
}

// Titles carry them for one copy per place ("Account Executive - Remote UK").
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

// Numbers go from the text only: pay and headcounts change with the place, a title's don't.
function withoutPlace(words: string, place: ReadonlySet<string>, { numbers = false } = {}): string {
  return words
    .split(" ")
    .filter(
      (word) =>
        word && !place.has(word) && !PLACE_WORDS.has(word) && !(numbers && /^\d+$/.test(word)),
    )
    .join(" ");
}

// The same opening posted for London and Toronto gets one key; two openings with one title don't
// (their text differs). Lines about place or pay go whole, since pay changes with the place.
export function groupKey(company: string, title: string, location: string, text: string): string {
  const place = placeTokens(location);
  const name = searchWords(company).replace(COMPANY_SUFFIX, " ").replace(/\s+/g, " ").trim();
  const role = withoutPlace(searchWords(title).replace(/\b(?:sr)\b/g, "senior"), place);
  const lines = text.split("\n");
  const kept = lines.filter((line) => {
    const folded = foldCase(line);
    return !PLACE_LINE.test(folded) && !PAY_LINE.test(folded);
  });
  // A post that is one long line would lose everything to a single "remote": keep its words.
  const source = kept.join("").length >= text.length * 0.3 ? kept : lines;
  const body = source
    .map((line) => withoutPlace(searchWords(line), place, { numbers: true }))
    .filter(Boolean)
    .join("\n");
  const hash = createHash("sha256").update(body).digest("base64url").slice(0, 16);
  return shortKey(`${name}|${role}|${hash}`);
}

const lineKey = (line: string) => line.replace(/\s+/g, " ").trim().toLowerCase();
// Shorter lines ("Requirements", "- Python") repeat across jobs for honest reasons.
const MIN_BOILERPLATE_CHARS = 40;

// Lines most of a board's jobs share (intro, values, benefits) say nothing about one job.
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

export function normalizeJob(
  job: RawJob,
  now: number,
  boilerplate: ReadonlySet<string> = new Set(),
  // How much of the post to store; 0 for a source the post can be read again from.
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
  // Titles name the main skill ("Senior Go Engineer"); a company's own name isn't a skill it asks
  // for.
  const brand = brandName(company);
  const keywords = findSkills(`${title}\n${own}`, JOB_LIMITS.keywords + 1)
    .filter((skill) => searchWords(skill) !== brand)
    .slice(0, JOB_LIMITS.keywords);
  const fromTitle = seniorityOf(title);
  const kind = readTitle(title);
  // A posting date in the future is a source's bug; the time we first saw it is the honest one.
  const postedAt = job.postedAt !== null && job.postedAt <= now ? job.postedAt : now;
  return {
    externalId: job.externalId.slice(0, 300),
    company,
    title,
    location,
    remote: job.remote,
    employmentType: job.employmentType,
    seniority: fromTitle === "mid" && job.seniority ? job.seniority : fromTitle,
    family: kind.family,
    occupation: kind.occupation,
    minYears: minYearsOf(own),
    postedAt,
    validThrough: job.validThrough,
    url: job.url.slice(0, JOB_LIMITS.urlChars),
    description: textChars > 0 ? capText(text, textChars) : "",
    rulesText: ruleLines(text, JOB_LIMITS.rulesChars),
    keywords,
    searchText: searchWords(`${title} ${company} ${location} ${keywords.join(" ")}`),
    dedupeKey: dedupeKey(company, title, location),
    groupKey: groupKey(company, title, location, text),
    evergreen: isFillerTitle(title),
    contentHash: contentHash(job),
  };
}
