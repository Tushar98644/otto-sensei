import { z } from "zod";
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

const bodyText = (max: number) =>
  z
    .string()
    .max(max * 2)
    .transform((value) =>
      value
        .replace(/\r\n?/g, "\n")
        .replace(/[^\P{Cc}\n\t]/gu, "")
        .trim(),
    )
    .pipe(z.string().min(1).max(max));

export const CreateWritingSchema = z
  .object({
    kind: z.enum(WRITING_KINDS),
    resumeId: ResumeSchema.shape.id.nullable().default(null),
    resumeTitle: line(WRITING_LIMITS.resumeTitle).default(""),
    company: line(WRITING_LIMITS.company).default(""),
    role: line(WRITING_LIMITS.role).default(""),
    jobUrl: jobUrlField.default(""),
    question: line(WRITING_LIMITS.question.max).default(""),
    text: bodyText(WRITING_LIMITS.letterChars),
    warnings: z.array(line(WRITING_LIMITS.warningChars)).max(WRITING_LIMITS.warnings).default([]),
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
    if (value.kind === "letter" && value.question !== "") {
      ctx.addIssue({ code: "custom", path: ["question"], message: "Letters have no question." });
    }
  });

export const UpdateWritingSchema = z.object({ text: bodyText(WRITING_LIMITS.letterChars) });

export const WritingIdSchema = z.uuid();
