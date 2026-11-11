import { z } from "zod";
import { ResumeSchema } from "@/lib/resume/validation";
import { DAY_MS } from "@/lib/time";
import { APPLICATION_STATUSES } from "./status";
import {
  APPLICATION_LIMITS,
  MIN_APPLIED_AT,
  cleanLine,
  cleanNotes,
  normalizeJobUrl,
} from "./schema";

const line = (max: number, min = 0) =>
  z
    .string()
    .max(max * 4)
    .transform(cleanLine)
    .pipe(z.string().min(min).max(max));

const resumeIdField = ResumeSchema.shape.id.nullable();

const jobIdField = z.uuid().nullable();

const resumeTitleField = line(APPLICATION_LIMITS.resumeTitle);

const companyField = line(APPLICATION_LIMITS.company, 1);

const roleField = line(APPLICATION_LIMITS.role);

const jobUrlField = z
  .string()
  .max(APPLICATION_LIMITS.jobUrl * 2)
  .refine((value) => normalizeJobUrl(value) !== null, "That doesn't look like a web link.")
  .transform((value) => normalizeJobUrl(value) ?? "");

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

const interviewAtField = z
  .number()
  .int()
  .min(MIN_APPLIED_AT)
  .refine((value) => value <= Date.now() + 366 * DAY_MS, "That date is too far away.")
  .nullable();

const followUpAtField = z
  .number()
  .int()
  .min(MIN_APPLIED_AT)
  .refine((value) => value <= Date.now() + 366 * DAY_MS, "That date is too far away.")
  .nullable();

export const ApplicationIdSchema = z.uuid();

export const CreateApplicationSchema = z.object({
  id: ApplicationIdSchema.optional(),
  resumeId: resumeIdField.default(null),
  jobId: jobIdField.default(null),
  resumeTitle: resumeTitleField.default(""),
  company: companyField,
  role: roleField.default(""),
  jobUrl: jobUrlField.default(""),
  appliedAt: appliedAtField,
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
