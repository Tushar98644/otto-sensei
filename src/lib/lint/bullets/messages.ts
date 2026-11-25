import type { LintLanguage } from "../lang/types";
import type { LintMessage } from "../types";
import type { Span } from "./tokens";

const MAX_LISTED_PHRASES = 3;

export const NO_RESULT_MESSAGE =
  "What changed because of this? Add the result, and how much if you know it.";
export const NO_NUMBER_MESSAGE = "How many, how much, or how fast? Add a number if you know it.";
export const NO_METHOD_MESSAGE = "Say how you did it: what did you build, change or run?";
export const TOO_SHORT_MESSAGE =
  "This line is too short to show much. Add what you did and what changed.";
export const DUPLICATE_MESSAGE =
  "This line repeats another one. Keep one, or make each say something new.";

export const NO_RESULT: LintMessage = { text: NO_RESULT_MESSAGE, id: "noResult", params: {} };
export const NO_METHOD: LintMessage = { text: NO_METHOD_MESSAGE, id: "noMethod", params: {} };
export const TOO_SHORT: LintMessage = { text: TOO_SHORT_MESSAGE, id: "tooShort", params: {} };
export const DUPLICATE: LintMessage = { text: DUPLICATE_MESSAGE, id: "duplicate", params: {} };

function quoteList(items: readonly string[]): string {
  const quoted = items.map((item) => `"${item}"`);
  if (quoted.length < 2) return quoted.join("");
  return `${quoted.slice(0, -1).join(", ")} and ${quoted[quoted.length - 1] ?? ""}`;
}

export function stockMessage(_first: Span, spans: readonly Span[]): LintMessage {
  const distinct = [...new Map(spans.map((span) => [span.key, span.text])).values()];
  const listed = distinct.slice(0, MAX_LISTED_PHRASES);
  const verb = listed.length === 1 ? "is a phrase" : "are phrases";
  return {
    text: `${quoteList(listed)} ${verb} recruiters skip. Show the result instead.`,
    id: "stock",
    params: { phrases: listed, count: listed.length },
  };
}

export function weakStartMessage(span: Span): LintMessage {
  return {
    text: `Swap "${span.text}" for what you did, like "Built", "Cut" or "Led".`,
    id: "weakStart",
    params: { phrase: span.text },
  };
}

export function dutyMessage(span: Span): LintMessage {
  return {
    text: `"${span.text}" reads like a job description. Say what you did and what changed.`,
    id: "duty",
    params: { phrase: span.text },
  };
}

export function tenseMessage(span: Span, past: string): LintMessage {
  const word = /^\p{Lu}/u.test(span.text) ? past.charAt(0).toUpperCase() + past.slice(1) : past;
  return {
    text: `This job has ended, so write "${word}", not "${span.text}".`,
    id: "tense",
    params: { past: word, phrase: span.text },
  };
}

export function noNumberMessage(marker: Span): LintMessage {
  return /^\p{L}+$/u.test(marker.text) && marker.tokens === 1
    ? {
        text: `"${marker.text}" by how much, or for how many? Add a number if you know it.`,
        id: "noNumberWord",
        params: { word: marker.text },
      }
    : { text: NO_NUMBER_MESSAGE, id: "noNumber", params: {} };
}

export function firstPersonMessage(span: Span, pack: LintLanguage): LintMessage {
  return pack.firstPerson?.team.has(span.key)
    ? {
        text: `"${span.text}" hides your part. Say what you did.`,
        id: "firstPersonTeam",
        params: { word: span.text },
      }
    : {
        text: `Drop "${span.text}". Resume lines leave out I, me and my.`,
        id: "firstPersonSelf",
        params: { word: span.text },
      };
}

export function passiveMessage(span: Span): LintMessage {
  return {
    text: `"${span.text}" hides who did it. Say what you did instead.`,
    id: "passive",
    params: { phrase: span.text },
  };
}

export function vagueMessage(span: Span, pack: LintLanguage): LintMessage {
  const kind = pack.vague?.kinds.get(span.key);
  const params = { phrase: span.text };
  if (kind === "list") {
    return {
      text: `"${span.text}" is vague. Name what matters, or cut it.`,
      id: "vagueList",
      params,
    };
  }
  if (kind === "thing") {
    return { text: `"${span.text}" is vague. Say exactly what.`, id: "vagueThing", params };
  }
  return { text: `"${span.text}" is vague. Give the real number.`, id: "vagueCount", params };
}

export function tooLongMessage(words: number, chars: number, maxWords: number): LintMessage {
  const byWords = words > maxWords;
  const size = byWords ? `${words} words` : `${chars} characters`;
  return {
    text: `This line has ${size}. Trim it to two lines so it's easy to skim.`,
    id: byWords ? "tooLongWords" : "tooLongChars",
    params: { count: byWords ? words : chars },
  };
}
