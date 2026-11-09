import { z } from "zod";
import { cleanLine, normalizeJobUrl } from "@/lib/applications/schema";
import { COVER_LETTER_CHARS, ResumeSchema } from "@/lib/resume/schema";

// Client-safe. Cover letters and answers to application questions an account keeps
// (/api/writings). The AI routes (/api/letter, /api/answer) only write the text; the page that
// asked for it saves the result here, so every letter and answer has one home that outlives the tab.

export const WRITING_KINDS = ["letter", "answer"] as const;
export type WritingKind = (typeof WRITING_KINDS)[number];

export const WRITING_LIMITS = {
  perUser: 1_000,
  // Rows per GET. 200 letters at the cap, every character 3 bytes, stay near 3 MB, under Vercel's
  // 4.5 MB response limit.
  listed: 200,
  letterChars: COVER_LETTER_CHARS,
  // The studio's answer box cap.
  answerChars: 3_000,
  // AnswerRequestSchema's bounds.
  question: { min: 8, max: 500 },
  company: 200,
  role: 200,
  resumeTitle: 200,
  jobUrl: 2_048,
  warnings: 6,
  warningChars: 300,
} as const;

export type Writing = {
  id: string;
  kind: WritingKind;
  // The resume it was written from. Null when that isn't known.
  resumeId: string | null;
  // That resume's title when it was written, so the list can still name it once it's deleted.
  resumeTitle: string;
  company: string;
  // The job title.
  role: string;
  // "" or an http(s) link.
  jobUrl: string;
  // Answers only: the question from the application form.
  question: string;
  text: string;
  // What Otto asked the person to check before sending, from when it was written.
  warnings: string[];
  // Sample output from a server without an AI key.
  demo: boolean;
  createdAt: number;
  updatedAt: number;
};

const line = (max: number) =>
  z
    .string()
    .max(max * 4)
    .transform(cleanLine)
    .pipe(z.string().max(max));

// A link that can't be stored is dropped rather than failing the save: the letter matters more.
const jobUrlField = z
  .string()
  .max(WRITING_LIMITS.jobUrl * 2)
  .transform((value) => normalizeJobUrl(value) ?? "")
  .catch("");

// Line breaks are the letter's paragraphs, so only other control characters go.
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

const TEXT_MAX: Record<WritingKind, number> = {
  letter: WRITING_LIMITS.letterChars,
  answer: WRITING_LIMITS.answerChars,
};

// POST /api/writings
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
    warnings: z
      .array(line(WRITING_LIMITS.warningChars))
      .max(WRITING_LIMITS.warnings)
      .default([]),
    demo: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (value.text.length > TEXT_MAX[value.kind]) {
      ctx.addIssue({ code: "custom", path: ["text"], message: "That's too long to keep." });
    }
    const asked = value.question.length >= WRITING_LIMITS.question.min;
    if (value.kind === "answer" && !asked) {
      ctx.addIssue({ code: "custom", path: ["question"], message: "An answer needs its question." });
    }
    if (value.kind === "letter" && value.question !== "") {
      ctx.addIssue({ code: "custom", path: ["question"], message: "Letters have no question." });
    }
  });
export type CreateWritingBody = z.input<typeof CreateWritingSchema>;
export type CreateWritingInput = z.output<typeof CreateWritingSchema>;

// PATCH /api/writings/:id: the person's own edits. Capped at the letter's size; an answer's
// smaller cap is checked against the stored kind.
export const UpdateWritingSchema = z.object({ text: bodyText(WRITING_LIMITS.letterChars) });
export type UpdateWritingBody = z.input<typeof UpdateWritingSchema>;

export function textLimit(kind: WritingKind): number {
  return TEXT_MAX[kind];
}

export const WritingIdSchema = z.uuid();

// GET /api/writings: the newest WRITING_LIMITS.listed, and how many the account keeps in all.
export type WritingsResponse = { ok: true; writings: Writing[]; total: number };
export type WritingResponse = { ok: true; writing: Writing };
