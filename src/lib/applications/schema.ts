import type { z } from "zod";
import type {
  BulkApplicationStatusSchema,
  CreateApplicationSchema,
  UpdateApplicationSchema,
} from "./validation";
import type { ApplicationStage, ApplicationStatus } from "./status";

// Client-safe. The job applications a signed-in user logs, and the request bodies that change them.

export const APPLICATION_LIMITS = {
  perUser: 2_000,
  // Rows per GET page. 500 worst-case rows (every field full of 3-byte characters) stay near
  // 3 MB, under Vercel's 4.5 MB response limit.
  pageSize: 500,
  // Ids per bulk status change.
  bulk: 500,
  company: 200,
  role: 200,
  resumeTitle: 200,
  jobUrl: 2_048,
  notes: 500,
} as const;

export const MIN_APPLIED_AT = Date.UTC(2000, 0, 1);

export type Application = {
  id: string;
  // The resume version that was sent, usually a tailored copy. Null: a file that isn't in Otto.
  resumeId: string | null;
  // That version's title when it was logged, so the win rate can still name it once it's deleted.
  resumeTitle: string;
  company: string;
  role: string;
  // "" or an http(s) link.
  jobUrl: string;
  appliedAt: number;
  status: ApplicationStatus;
  // The furthest step it ever reached (see stageAfter): what the win rate counts.
  stageReached: ApplicationStage;
  statusChangedAt: number;
  notes: string;
  // When Otto reminds the person to follow up (see ./follow-up), or null for no reminder.
  followUpAt: number | null;
  // The Jobs tab opening it's for. Null for a job found elsewhere, or one whose post was removed.
  jobId: string | null;
  // Whether an interview prep pack is saved on it (the pack itself is read by /api/interview).
  hasPrep: boolean;
  // The interview's day (local noon), when the person gave one moving it to Interviewing.
  interviewAt: number | null;
  createdAt: number;
  updatedAt: number;
};

/**
 * A pasted job link as stored: "" for none, else an http(s) URL with a dotted host. People paste
 * "stripe.com/jobs/123" without the scheme, so https:// is assumed. Null when it isn't a link.
 */
export function normalizeJobUrl(input: string): string | null {
  const value = input.trim();
  if (value === "") return "";
  const withScheme = /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password || !url.hostname.includes(".")) return null;
  return url.href.length <= APPLICATION_LIMITS.jobUrl ? url.href : null;
}

// Control characters and runs of whitespace (a pasted line break) become one space.
export function cleanLine(value: string): string {
  return value.replace(/[\p{Cc}\s]+/gu, " ").trim();
}

// Notes keep their line breaks (at most one blank line in a row); other control characters go.
export function cleanNotes(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[^\P{Cc}\n\t]/gu, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
export type CreateApplicationBody = z.input<typeof CreateApplicationSchema>;
export type CreateApplicationInput = z.output<typeof CreateApplicationSchema>;
export type UpdateApplicationBody = z.input<typeof UpdateApplicationSchema>;
export type UpdateApplicationInput = z.output<typeof UpdateApplicationSchema>;
export type BulkApplicationStatusBody = z.input<typeof BulkApplicationStatusSchema>;
