import { TEXT_LIMITS } from "@/config/plans";
import { bulletText } from "@/lib/resume/sections";

// resumeToText() adds headings, so an imported resume can render a little past the import cap.
export const MAX_RESUME_CHARS = Math.round(TEXT_LIMITS.resumeChars * 1.5);

const HIGH_SURROGATE_AT_END = /[\uD800-\uDBFF]$/;
const PLACEHOLDER = /\[[^\]]+\]/;
const PLACEHOLDERS = /\[[^\]]+\]/g;

export function clip(value: string, max: number): string {
  const text = value.trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return (HIGH_SURROGATE_AT_END.test(cut) ? cut.slice(0, -1) : cut).trimEnd();
}

export function clipWords(value: string, max: number): string {
  const text = value.trim();
  if (text.length <= max) return text;
  const cut = clip(text, max);
  const lastSpace = cut.lastIndexOf(" ");
  const whole = lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut;
  return whole.replace(/[\s,;:–—-]+$/u, "");
}

export function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function cleanList(values: readonly string[], limit: number, maxChars: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (out.length === limit) break;
    const text = clipWords(oneLine(value), maxChars);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

export function asResumeLine(value: string): string {
  const line = oneLine(value);
  const unmarked = bulletText(line) ?? line;
  const unquoted = /^["“](.*)["”]$/u.exec(unmarked)?.[1] ?? unmarked;
  return unquoted.trim().replace(/(?<!\.)\.$/u, "");
}

export function hasPlaceholder(text: string): boolean {
  return PLACEHOLDER.test(text);
}

export function placeholdersIn(text: string): string[] {
  return [...new Set(text.match(PLACEHOLDERS) ?? [])];
}

export function capitalize(text: string): string {
  return text.replace(/^\p{Ll}/u, (letter) => letter.toUpperCase());
}

const DATA_TAGS = [
  "resume",
  "role",
  "line",
  "answers",
  "experience",
  "job_post",
  "question",
  "interviewer",
  "plan",
] as const;
export type DataTag = (typeof DATA_TAGS)[number];
const DATA_TAG_PATTERN = new RegExp(`<\\s*/?\\s*(?:${DATA_TAGS.join("|")})\\b[^>]*>`, "gi");

// Our own tags are stripped so a resume or post can't close one early and inject instructions.
export function tag(name: DataTag, body: string): string {
  return `<${name}>\n${body.replace(DATA_TAG_PATTERN, " ")}\n</${name}>`;
}
