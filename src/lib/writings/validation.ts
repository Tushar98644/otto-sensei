import { z } from "zod";
import { clip } from "@/lib/ai/text";
import { cleanLine, normalizeJobUrl } from "@/lib/applications/schema";
import { ResumeSchema } from "@/lib/resume/validation";
import { textLimit, WRITING_KINDS, WRITING_LIMITS } from "./schema";

const line = (max: number) =>
  z
    .string()
    .max(max * 4)
    .transform(cleanLine)
    .pipe(z.string().max(max));

const jobUrlField = z
  .string()
  .max(WRITING_LIMITS.jobUrl * 2)
  .transform((value) => normalizeJobUrl(value) ?? "")
  .catch("");

const cleanText = (value: string) =>
  value
    .replace(/\r\n?/g, "\n")
    .replace(/[^\P{Cc}\n\t]/gu, "")
    .trim();

const bodyText = (max: number) =>
  z
    .string()
    .max(max * 2)
    .transform(cleanText)
    .pipe(z.string().min(1).max(max));

// A LinkedIn note may be cleared: the email alone is still a message.
const noteText = z
  .string()
  .max(WRITING_LIMITS.noteChars * 2)
  .transform(cleanText)
  .pipe(z.string().max(WRITING_LIMITS.noteChars));

// Warnings only advise, so extra or overlong ones are trimmed instead of failing the save.
const warningList = z
  .array(z.string().max(WRITING_LIMITS.warningChars * 4))
  .max(WRITING_LIMITS.warnings * 4)
  .transform((items) =>
    items
      .map(cleanLine)
      .filter(Boolean)
      .slice(0, WRITING_LIMITS.warnings)
      .map((item) => clip(item, WRITING_LIMITS.warningChars)),
  );

export const CreateWritingSchema = z
  .object({
    kind: z.enum(WRITING_KINDS),
    resumeId: ResumeSchema.shape.id.nullable().default(null),
    resumeTitle: line(WRITING_LIMITS.resumeTitle).default(""),
    company: line(WRITING_LIMITS.company).default(""),
    role: line(WRITING_LIMITS.role).default(""),
    jobUrl: jobUrlField.default(""),
    jobId: z.uuid().nullable().default(null),
    question: line(WRITING_LIMITS.question.max).default(""),
    text: bodyText(WRITING_LIMITS.letterChars),
    subject: line(WRITING_LIMITS.subject).default(""),
    note: noteText.default(""),
    warnings: warningList.default([]),
    demo: z.boolean().default(false),
    applicationId: z.uuid().nullable().default(null),
  })
  .superRefine((value, ctx) => {
    if (value.text.length > textLimit(value.kind)) {
      ctx.addIssue({ code: "custom", path: ["text"], message: "That's too long to keep." });
    }
    const asked = value.question.length >= WRITING_LIMITS.question.min;
    if (value.kind === "answer" && !asked) {
      ctx.addIssue({
        code: "custom",
        path: ["question"],
        message: "An answer needs its question.",
      });
    }
    if (value.kind !== "answer" && value.question !== "") {
      ctx.addIssue({
        code: "custom",
        path: ["question"],
        message: "Only answers have a question.",
      });
    }
    if (value.kind !== "outreach" && (value.subject !== "" || value.note !== "")) {
      ctx.addIssue({
        code: "custom",
        path: ["subject"],
        message: "Only outreach messages have a subject and a note.",
      });
    }
  });

export const UpdateWritingSchema = z
  .object({
    text: bodyText(WRITING_LIMITS.letterChars).optional(),
    subject: line(WRITING_LIMITS.subject).optional(),
    note: noteText.optional(),
  })
  .refine(
    (value) => value.text !== undefined || value.subject !== undefined || value.note !== undefined,
    { message: "Nothing to save." },
  );

export const WritingIdSchema = z.uuid();

// Search params: a malformed one counts as not given.
export const OutreachLookupSchema = z.object({
  job: z.uuid().nullable().catch(null),
  application: z.uuid().nullable().catch(null),
});
