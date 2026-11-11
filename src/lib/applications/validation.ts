import { z } from "zod";
import { ResumeSchema } from "@/lib/resume/validation";
import { APPLICATION_STATUSES } from "./status";
import {
  APPLICATION_LIMITS,
  MIN_APPLIED_AT,
  cleanLine,
  cleanNotes,
  normalizeJobUrl,
} from "./schema";

// Apart from ./schema, which the board and the Jobs tab load, so those pages don't load zod.

const DAY_MS = 24 * 60 * 60 * 1_000;

// The raw cap is looser than the stored one, so text that only gets short once cleaned still fits.
const line = (max: number, min = 0) =>
  z
    .string()
    .max(max * 4)
    .transform(cleanLine)
    .pipe(z.string().min(min).max(max));

const resumeIdField = ResumeSchema.shape.id.nullable();

// An unknown id is dropped, not refused.
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

// The browser may pick the id, so it can show and link the application before the server answers.
export const CreateApplicationSchema = z.object({
  id: ApplicationIdSchema.optional(),
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

export const BulkApplicationStatusSchema = z.object({
  ids: z.array(ApplicationIdSchema).min(1).max(APPLICATION_LIMITS.bulk),
  status: statusField,
});
