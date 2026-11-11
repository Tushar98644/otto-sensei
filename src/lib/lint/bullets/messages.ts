import type { Span } from "./tokens";
import { TEAM_PRONOUNS, VAGUE_KIND } from "./words";

const MAX_LISTED_PHRASES = 3;

export const NO_RESULT_MESSAGE =
  "What changed because of this? Add the result, and how much if you know it.";
export const NO_NUMBER_MESSAGE = "How many, how much, or how fast? Add a number if you know it.";
export const NO_METHOD_MESSAGE = "Say how you did it: what did you build, change or run?";
export const TOO_SHORT_MESSAGE =
  "This line is too short to show much. Add what you did and what changed.";
export const DUPLICATE_MESSAGE =
  "This line repeats another one. Keep one, or make each say something new.";

function quoteList(items: readonly string[]): string {
  const quoted = items.map((item) => `"${item}"`);
  if (quoted.length < 2) return quoted.join("");
  return `${quoted.slice(0, -1).join(", ")} and ${quoted[quoted.length - 1] ?? ""}`;
}

export function stockMessage(_first: Span, spans: readonly Span[]): string {
  const distinct = [...new Map(spans.map((span) => [span.key, span.text])).values()];
  const listed = distinct.slice(0, MAX_LISTED_PHRASES);
  const verb = listed.length === 1 ? "is a phrase" : "are phrases";
  return `${quoteList(listed)} ${verb} recruiters skip. Show the result instead.`;
}

export function weakStartMessage(span: Span): string {
  return `Swap "${span.text}" for what you did, like "Built", "Cut" or "Led".`;
}

export function dutyMessage(span: Span): string {
  return `"${span.text}" reads like a job description. Say what you did and what changed.`;
}

export function tenseMessage(span: Span, past: string): string {
  const word = /^\p{Lu}/u.test(span.text) ? past.charAt(0).toUpperCase() + past.slice(1) : past;
  return `This job has ended, so write "${word}", not "${span.text}".`;
}

export function noNumberMessage(marker: Span): string {
  return /^\p{L}+$/u.test(marker.text) && marker.tokens === 1
    ? `"${marker.text}" by how much, or for how many? Add a number if you know it.`
    : NO_NUMBER_MESSAGE;
}

export function firstPersonMessage(span: Span): string {
  return TEAM_PRONOUNS.has(span.key)
    ? `"${span.text}" hides your part. Say what you did.`
    : `Drop "${span.text}". Resume lines leave out I, me and my.`;
}

export function passiveMessage(span: Span): string {
  return `"${span.text}" hides who did it. Say what you did instead.`;
}

export function vagueMessage(span: Span): string {
  const kind = VAGUE_KIND.get(span.key);
  if (kind === "list") return `"${span.text}" is vague. Name what matters, or cut it.`;
  if (kind === "thing") return `"${span.text}" is vague. Say exactly what.`;
  return `"${span.text}" is vague. Give the real number.`;
}

export function tooLongMessage(size: string): string {
  return `This line has ${size}. Trim it to two lines so it's easy to skim.`;
}
