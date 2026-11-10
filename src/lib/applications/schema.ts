import { z } from "zod";
import { ResumeSchema } from "@/lib/resume/schema";
import { APPLICATION_STATUSES, type ApplicationStage, type ApplicationStatus } from "./status";

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

const DAY_MS = 24 * 60 * 60 * 1_000;
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

// The raw cap is looser than the stored one, so text that only gets short once cleaned still fits.
const line = (max: number, min = 0) =>
  z
    .string()
    .max(max * 4)
    .transform(cleanLine)
    .pipe(z.string().min(min).max(max));

const resumeIdField = ResumeSchema.shape.id.nullable();
// The Jobs tab opening it's for. An id the server doesn't know is dropped, not refused.
const jobIdField = z.uuid().nullable();
const resumeTitleField = line(APPLICATION_LIMITS.resumeTitle);
const companyField = line(APPLICATION_LIMITS.company, 1);
const roleField = line(APPLICATION_LIMITS.role);
const jobUrlField = z
  .string()
  .max(APPLICATION_LIMITS.jobUrl * 2)
  .refine((value) => normalizeJobUrl(value) !== null, "That doesn't look like a web link.")
  .transform((value) => normalizeJobUrl(value) ?? "");
// A day ahead of the server's clock covers the time zones that are already on tomorrow.
const appliedAtField = z
  .number()
  .int()
  .min(MIN_APPLIED_AT)
  .refine((value) => value <= Date.now() + DAY_MS, "That date is in the future.");
const statusField = z.enum(APPLICATION_STATUSES);
const notesField = z
  .string()
  .max(APPLICATION_LIMITS.notes * 4)
  .transform(cleanNotes)
  .pipe(z.string().max(APPLICATION_LIMITS.notes));
// Any day from 2000 to a year out: interviews are booked weeks ahead, not years.
const interviewAtField = z
  .number()
  .int()
  .min(MIN_APPLIED_AT)
  .refine((value) => value <= Date.now() + 366 * DAY_MS, "That date is too far away.")
  .nullable();
// Snooze, Done (null) and putting a removed reminder back. A year out is far past any job hunt.
const followUpAtField = z
  .number()
  .int()
  .min(MIN_APPLIED_AT)
  .refine((value) => value <= Date.now() + 366 * DAY_MS, "That date is too far away.")
  .nullable();

export const ApplicationIdSchema = z.uuid();

// POST /api/applications
export const CreateApplicationSchema = z.object({
  resumeId: resumeIdField.default(null),
  jobId: jobIdField.default(null),
  resumeTitle: resumeTitleField.default(""),
  company: companyField,
  role: roleField.default(""),
  jobUrl: jobUrlField.default(""),
  appliedAt: appliedAtField,
  // Logging an older application that already moved on is fine.
  status: statusField.default("applied"),
  notes: notesField.default(""),
  interviewAt: interviewAtField.optional(),
});
export type CreateApplicationBody = z.input<typeof CreateApplicationSchema>;
export type CreateApplicationInput = z.output<typeof CreateApplicationSchema>;

// PATCH /api/applications/:id. Only the fields sent change.
export const UpdateApplicationSchema = z
  .object({
    resumeId: resumeIdField.optional(),
    resumeTitle: resumeTitleField.optional(),
    company: companyField.optional(),
    role: roleField.optional(),
    jobUrl: jobUrlField.optional(),
    appliedAt: appliedAtField.optional(),
    status: statusField.optional(),
    notes: notesField.optional(),
    followUpAt: followUpAtField.optional(),
    interviewAt: interviewAtField.optional(),
  })
  .refine(
    (patch) => Object.values(patch).some((value) => value !== undefined),
    "Nothing to change.",
  );
export type UpdateApplicationBody = z.input<typeof UpdateApplicationSchema>;
export type UpdateApplicationInput = z.output<typeof UpdateApplicationSchema>;

// PATCH /api/applications: one status for many, e.g. "no reply" for everything that went quiet.
export const BulkApplicationStatusSchema = z.object({
  ids: z.array(ApplicationIdSchema).min(1).max(APPLICATION_LIMITS.bulk),
  status: statusField,
});
export type BulkApplicationStatusBody = z.input<typeof BulkApplicationStatusSchema>;
