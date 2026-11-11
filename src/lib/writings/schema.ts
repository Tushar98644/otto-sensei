import type { z } from "zod";
import type { CreateWritingSchema, UpdateWritingSchema } from "./validation";
import { COVER_LETTER_CHARS } from "@/lib/resume/schema";

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
  // The application it was written for. The server links it by itself, when it's saved or when
  // that application is logged later; null until then.
  applicationId: string | null;
  createdAt: number;
  updatedAt: number;
};

const TEXT_MAX: Record<WritingKind, number> = {
  letter: WRITING_LIMITS.letterChars,
  answer: WRITING_LIMITS.answerChars,
};
export type CreateWritingBody = z.input<typeof CreateWritingSchema>;
export type CreateWritingInput = z.output<typeof CreateWritingSchema>;
export type UpdateWritingBody = z.input<typeof UpdateWritingSchema>;

export function textLimit(kind: WritingKind): number {
  return TEXT_MAX[kind];
}

// GET /api/writings: the newest WRITING_LIMITS.listed, and how many the account keeps in all.
export type WritingsResponse = { ok: true; writings: Writing[]; total: number };
export type WritingResponse = { ok: true; writing: Writing };
