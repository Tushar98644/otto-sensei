import { z } from "zod";
import type { ScreeningQuestion } from "@/lib/ats/types";
import { decodeEntities } from "./html";

// Only yes/no and pick-from-a-list questions: the only types Greenhouse lets employers attach
// automatic rejection rules to.

const MAX_QUESTIONS = 12;
const MAX_OPTIONS = 6;
const LABEL_CHARS = 300;
const OPTION_CHARS = 100;

const QuestionSchema = z.object({
  label: z.string(),
  required: z.boolean().nullish(),
  fields: z
    .array(
      z.object({
        type: z.string(),
        values: z.array(z.object({ label: z.string() })).nullish(),
      }),
    )
    .nullish(),
});

function selectKind(type: string): "single" | "multi" | null {
  if (type === "multi_value_single_select") return "single";
  if (type === "multi_value_multi_select") return "multi";
  return null;
}

function plain(value: string, max: number): string {
  const text = decodeEntities(value.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

function isYesNo(options: readonly string[]): boolean {
  const answers = new Set(options.map((option) => option.toLowerCase()));
  return answers.size === 2 && answers.has("yes") && answers.has("no");
}

export function greenhouseQuestions(raw: unknown): ScreeningQuestion[] {
  if (!Array.isArray(raw)) return [];
  const questions: ScreeningQuestion[] = [];
  for (const item of raw) {
    const parsed = QuestionSchema.safeParse(item);
    if (!parsed.success) continue;
    const field = parsed.data.fields?.find((entry) => selectKind(entry.type) !== null);
    const kind = field ? selectKind(field.type) : null;
    if (!field || !kind) continue;
    const label = plain(parsed.data.label, LABEL_CHARS);
    const options = (field.values ?? [])
      .map((value) => plain(value.label, OPTION_CHARS))
      .filter(Boolean);
    if (!label || options.length === 0) continue;
    questions.push({
      label,
      required: parsed.data.required === true,
      kind: kind === "single" && isYesNo(options) ? "yes_no" : kind,
      options: options.slice(0, MAX_OPTIONS),
      optionCount: options.length,
    });
    if (questions.length === MAX_QUESTIONS) break;
  }
  return questions;
}
