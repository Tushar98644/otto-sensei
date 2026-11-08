import { TEXT_LIMITS } from "@/config/plans";
import type { JobPosting, JobSource } from "@/lib/api/types";
import { JobReadError } from "./errors";

// Server-only. Every source ends here, so every posting gets the same caps and the same test for
// "too thin to be a job post".

// Under this much text, what came back is a cookie wall, an app shell or a teaser, not a post.
export const MIN_TEXT_CHARS = 300;
// Matches the title and company caps of POST /api/tailor.
const MAX_FIELD_CHARS = 200;
const EARLIEST = Date.UTC(2000, 0, 1);
const DAY_MS = 24 * 60 * 60 * 1000;

export type PostingParts = {
  url: URL | string;
  source: JobSource;
  title?: string | null;
  company?: string | null;
  location?: string | null;
  text: string;
  firstPostedAt?: number | null;
  updatedAt?: number | null;
  closesAt?: number | null;
};

/** Characters of text once runs of whitespace count as one. */
export function realLength(text: string): number {
  return text.replace(/\s+/g, " ").trim().length;
}

/** Cuts text to the job post limit, at a line break when one is near the end. */
export function capText(text: string, max: number = TEXT_LIMITS.jobPostChars): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastBreak = cut.lastIndexOf("\n");
  return (lastBreak > max * 0.8 ? cut.slice(0, lastBreak) : cut).trimEnd();
}

function oneLine(value: string | null | undefined): string {
  const line = (value ?? "").replace(/\s+/g, " ").trim();
  if (line.length <= MAX_FIELD_CHARS) return line;
  const cut = line.slice(0, MAX_FIELD_CHARS - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), MAX_FIELD_CHARS / 2)).trimEnd()}…`;
}

/** Epoch ms from an ISO date, a date-time or epoch ms. Null for anything unusable. */
export function toTime(value: unknown): number | null {
  const time =
    typeof value === "number" ? value : typeof value === "string" ? Date.parse(value) : Number.NaN;
  return Number.isFinite(time) && time >= EARLIEST ? time : null;
}

/** "acme-labs" → "Acme Labs", for boards whose API doesn't name the company. */
export function humanizeSlug(slug: string): string {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(" ");
}

export function buildPosting(parts: PostingParts, now = Date.now()): JobPosting {
  const text = capText(parts.text.trim());
  if (realLength(text) < MIN_TEXT_CHARS) throw new JobReadError("no_text");
  const firstPostedAt = parts.firstPostedAt ?? null;
  return {
    url: String(parts.url),
    source: parts.source,
    title: oneLine(parts.title),
    company: oneLine(parts.company),
    location: oneLine(parts.location),
    text,
    // A posting date in the future is a site's bug, not a fact worth showing.
    firstPostedAt: firstPostedAt !== null && firstPostedAt <= now + DAY_MS ? firstPostedAt : null,
    updatedAt: parts.updatedAt ?? null,
    closesAt: parts.closesAt ?? null,
  };
}
