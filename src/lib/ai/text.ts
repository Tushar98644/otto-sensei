import { bulletText } from "@/lib/resume/sections";

const HIGH_SURROGATE_AT_END = /[\uD800-\uDBFF]$/;
const PLACEHOLDER = /\[[^\]]+\]/;
const PLACEHOLDERS = /\[[^\]]+\]/g;

// Hard cut for copied fields, where the schema cap is absolute. Never leaves half an emoji behind.
export function clip(value: string, max: number): string {
  const text = value.trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return (HIGH_SURROGATE_AT_END.test(cut) ? cut.slice(0, -1) : cut).trimEnd();
}

// Cut for prose a person reads: ends on a whole word instead of half of one.
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

// Case-insensitive de-duplication; blank entries are dropped.
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

// A model sometimes returns a line the way it appears in a list ("- Built…", "“Built…”").
export function asResumeLine(value: string): string {
  const line = oneLine(value);
  const unmarked = bulletText(line) ?? line;
  const unquoted = /^["“](.*)["”]$/u.exec(unmarked)?.[1] ?? unmarked;
  return unquoted.trim().replace(/(?<!\.)\.$/u, "");
}

// "[number of users]", "[X%]": a fact the person still has to supply.
export function hasPlaceholder(text: string): boolean {
  return PLACEHOLDER.test(text);
}

export function placeholdersIn(text: string): string[] {
  return [...new Set(text.match(PLACEHOLDERS) ?? [])];
}

export function capitalize(text: string): string {
  return text.replace(/^\p{Ll}/u, (letter) => letter.toUpperCase());
}

// Every tag the prompts treat as data. Keep in sync with the ground rules in ./prompts.ts.
const DATA_TAGS = ["resume", "role", "line", "answers", "experience", "job_post", "question"] as const;
export type DataTag = (typeof DATA_TAGS)[number];
const DATA_TAG_PATTERN = new RegExp(`<\\s*/?\\s*(?:${DATA_TAGS.join("|")})\\b[^>]*>`, "gi");

// Copies of our own tags are removed, so a resume or post can't close one early and smuggle in text
// that reads as instructions.
export function tag(name: DataTag, body: string): string {
  return `<${name}>\n${body.replace(DATA_TAG_PATTERN, " ")}\n</${name}>`;
}
