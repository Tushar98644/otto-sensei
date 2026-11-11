import { newId, type Experience } from "../schema";
import { bulletText, findDateRanges, findDates, isLinkText, type DateRange } from "../sections";
import { LIMITS } from "./limits";
import {
  clip,
  continues,
  isTitleLike,
  segmentsOf,
  setApartDate,
  stripDates,
  toBullets,
} from "./text";
import { isLocation, TITLE_WORDS } from "./words";

type Entry = { header: string[]; range: DateRange | null; date: string | null; body: string[] };

const COMPANY_WORDS =
  /\b(?:inc|llc|ltd|limited|gmbh|corp|corporation|co|company|plc|ag|bv|pty|technologies|technology|labs|group|solutions|systems|software|consulting|partners|bank|agency|studio|studios|ventures|capital|holdings|foundation|hospital|media|networks|services)\b\.?/i;
export const CORPORATE_SUFFIX = /^(?:inc|llc|ltd|co|corp|plc|gmbh)\.?$/i;
const COMPANY_NAME =
  /\b(?:inc|llc|ltd|limited|gmbh|corp|corporation|plc|ag|bv|pty|labs|bank)\b\.?/i;
const looksLikeJobHeader = (line: string) =>
  line.split(/\s+/).length <= 8 && (TITLE_WORDS.test(line) || COMPANY_NAME.test(line));

export function parseExperience(lines: readonly string[]): Experience[] {
  return groupEntries(lines)
    .map((entry): Experience => {
      const { parts, location } = headerFields(entry.header);
      const [title, company] = assignTitleAndCompany(parts);
      const single = entry.range ? null : (entry.date ?? firstSingleDate(entry.header));
      return {
        id: newId(),
        title: clip(title, LIMITS.text),
        company: clip(company, LIMITS.text),
        location: clip(location, LIMITS.text),
        startDate: clip(entry.range?.start ?? single ?? "", LIMITS.date),
        endDate: clip(entry.range?.end ?? "", LIMITS.date),
        bullets: toBullets(entry.body, LIMITS.experienceBullets),
      };
    })
    .filter((job) => job.title || job.company || job.bullets.length > 0);
}

function groupEntries(lines: readonly string[]): Entry[] {
  const isBullet = lines.map((line) => bulletText(line) !== null);
  const ranges = lines.map((line, i) => (isBullet[i] ? null : (findDateRanges(line)[0] ?? null)));
  const singles = lines.map((line, i) => (isBullet[i] || ranges[i] ? null : setApartDate(line)));
  const anchors = lines.flatMap((_, i) => (ranges[i] || singles[i] ? [i] : []));
  if (anchors.length === 0) return groupWithoutDates(lines);

  const usesMarkers = isBullet.some(Boolean);
  const canLeadHeader = (i: number) => {
    const line = lines[i] ?? "";
    if (isBullet[i] || !isTitleLike(line)) return false;
    if (i > 0 && isBullet[i - 1] && continues(lines[i - 1] ?? "", line)) return false;
    return usesMarkers || looksLikeJobHeader(line);
  };
  const starts = anchors.map((anchor, k) => {
    const floor = k === 0 ? 0 : (anchors[k - 1] ?? 0) + 1;
    const maxBack = usesMarkers ? 3 : 2;
    let start = anchor;
    while (start - 1 >= floor && anchor - start < maxBack && canLeadHeader(start - 1)) start--;
    return start;
  });

  return anchors.map((anchor, k) => {
    const start = starts[k] ?? anchor;
    const next = starts[k + 1] ?? lines.length;
    const dateOnly = !segmentsOf(stripDates(lines[anchor] ?? "")).length && start === anchor;
    let end = anchor;
    for (let j = anchor + 1; j < next && j <= anchor + 2; j++) {
      const line = lines[j] ?? "";
      if (isBullet[j] || !isTitleLike(line)) break;
      const firstAfterDates = dateOnly && j === anchor + 1;
      const headerLike =
        isLocation(line) || (usesMarkers ? isBullet[j + 1] === true : looksLikeJobHeader(line));
      if (!firstAfterDates && !headerLike) break;
      end = j;
    }
    return {
      header: lines.slice(start, end + 1),
      range: ranges[anchor] ?? null,
      date: singles[anchor] ?? null,
      body: lines.slice(end + 1, next),
    };
  });
}

function groupWithoutDates(lines: readonly string[]): Entry[] {
  const entries: Entry[] = [];
  let current: Entry | undefined;
  let previous = "";
  for (const line of lines) {
    const isHeader = bulletText(line) === null && isTitleLike(line);
    const opensEntry =
      isHeader &&
      current !== undefined &&
      current.body.length > 0 &&
      (looksLikeJobHeader(line) || (bulletText(previous) !== null && !continues(previous, line)));
    if (!current || opensEntry) {
      current = { header: [], range: null, date: null, body: [] };
      entries.push(current);
    }
    if (isHeader && current.body.length === 0 && current.header.length < 3)
      current.header.push(line);
    else current.body.push(line);
    previous = line;
  }
  return entries;
}

function headerFields(header: readonly string[]): { parts: string[]; location: string } {
  const parts: string[] = [];
  let location = "";
  for (const line of header) {
    for (const segment of segmentsOf(stripDates(line))) {
      if (isLinkText(segment)) continue;
      const trailing = splitTrailingLocation(segment);
      if (!location && isLocation(segment)) location = segment;
      else if (!location && trailing) {
        location = trailing.location;
        parts.push(...splitTitleAndCompany(trailing.rest));
      } else {
        parts.push(...splitTitleAndCompany(segment));
      }
    }
  }
  return { parts, location };
}

export function splitTrailingLocation(segment: string): { rest: string; location: string } | null {
  const parts = segment.split(/,\s*/);
  if (parts.length < 3) return null;
  const location = parts.slice(-2).join(", ");
  return isLocation(location) ? { rest: parts.slice(0, -2).join(", "), location } : null;
}

function splitTitleAndCompany(segment: string): string[] {
  const at = /^(.+?)\s+(?:at|@)\s+(.+)$/i.exec(segment);
  if (at?.[1] && at[2] && TITLE_WORDS.test(at[1])) return [at[1].trim(), at[2].trim()];
  const comma = /^([^,]+),\s*([^,]+)$/.exec(segment);
  const left = comma?.[1]?.trim();
  const right = comma?.[2]?.trim();
  if (!left || !right || CORPORATE_SUFFIX.test(right)) return [segment];
  return TITLE_WORDS.test(left) || TITLE_WORDS.test(right) || COMPANY_WORDS.test(right)
    ? [left, right]
    : [segment];
}

function assignTitleAndCompany(parts: readonly string[]): [string, string] {
  const [first = "", second = "", ...rest] = parts;
  const others = [second, ...rest].filter(Boolean).join(", ");
  const firstIsCompany = COMPANY_WORDS.test(first) && !TITLE_WORDS.test(first);
  const secondIsTitle =
    TITLE_WORDS.test(second) && !COMPANY_WORDS.test(second) && !TITLE_WORDS.test(first);
  if (second && (firstIsCompany || secondIsTitle)) return [[second, ...rest].join(", "), first];
  const roles = parts.filter((part) => TITLE_WORDS.test(part.split(/\s+/).at(-1) ?? ""));
  const [role] = roles;
  if (role && roles.length === 1 && !TITLE_WORDS.test(first)) {
    return [role, parts.filter((part) => part !== role).join(", ")];
  }
  return [first, others];
}

function firstSingleDate(lines: readonly string[]): string | null {
  for (const line of lines) {
    const date = findDates(line)[0];
    if (date) return date.text;
  }
  return null;
}
