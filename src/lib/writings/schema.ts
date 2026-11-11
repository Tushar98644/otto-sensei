import type { z } from "zod";
import type { CreateWritingSchema, UpdateWritingSchema } from "./validation";
import { COVER_LETTER_CHARS } from "@/lib/resume/schema";

export const WRITING_KINDS = ["letter", "answer"] as const;
export type WritingKind = (typeof WRITING_KINDS)[number];

export const WRITING_LIMITS = {
  perUser: 1_000,
  // 200 letters at the cap stay near 3 MB, under Vercel's 4.5 MB response limit.
  listed: 200,
  letterChars: COVER_LETTER_CHARS,
  answerChars: 3_000,
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
  resumeId: string | null;
  resumeTitle: string;
  company: string;
  role: string;
  jobUrl: string;
  question: string;
  text: string;
  warnings: string[];
  demo: boolean;
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

export type WritingsResponse = { ok: true; writings: Writing[]; total: number };
export type WritingResponse = { ok: true; writing: Writing };
