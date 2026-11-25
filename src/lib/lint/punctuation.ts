import type { ContentLang } from "@/lib/i18n/languages";
import { makeIssue } from "./issue";
import { lintLanguage } from "./lang";
import type { LintIssue, LintMessage } from "./types";

export type EntryLine = { id: string; text: string };

type Ending = "stop" | "none";

const CONTENT = /[\p{L}\p{N}]/u;
const CLOSING_QUOTES = /["'”’»]+$/u;
// French puts a space before "?", "!" and ";", so "Prêt ?" still ends in a mark.
const OTHER_MARK = /[?!…]$|\.\.$/u;
const BRACKET_AFTER_STOP = /\.\s*[)\]]+$/u;
const DOTTED_INITIALS = /(?:^|[^\p{L}])(?:\p{L}{1,2}\.){2,}$/u;
const LAST_WORD = /(\p{L}+)\.$/u;

const MESSAGES: Record<Ending, { most: LintMessage; first: LintMessage }> = {
  stop: {
    most: {
      text: "Most lines here end with a full stop. Add one here to match.",
      id: "stopMost",
      params: {},
    },
    first: {
      text: "Your first line here ends with a full stop. Add one here to match.",
      id: "stopFirst",
      params: {},
    },
  },
  none: {
    most: {
      text: "Most lines here end without a full stop. Remove this one to match.",
      id: "noneMost",
      params: {},
    },
    first: {
      text: "Your first line here ends without a full stop. Remove this one to match.",
      id: "noneFirst",
      params: {},
    },
  },
};

export function lineEnding(text: string, lang: ContentLang = "en"): Ending | null {
  if (!CONTENT.test(text)) return null;
  const unquoted = text.trimEnd().replace(CLOSING_QUOTES, "");
  // « Prix. » keeps a space before its closing quote.
  const end = lang === "en" ? unquoted : unquoted.trimEnd();
  if (OTHER_MARK.test(end) || BRACKET_AFTER_STOP.test(end)) return null;
  if (!end.endsWith(".")) return "none";
  if (DOTTED_INITIALS.test(end)) return null;
  const word = LAST_WORD.exec(end)?.[1]?.toLowerCase();
  return word && lintLanguage(lang).abbreviations.has(word) ? null : "stop";
}

export function setFullStop(text: string, stop: boolean): string {
  const trimmed = text.trimEnd();
  const quotes = CLOSING_QUOTES.exec(trimmed)?.[0] ?? "";
  const body = trimmed.slice(0, trimmed.length - quotes.length);
  if (body.endsWith(".") === stop) return trimmed;
  return stop ? `${body}.${quotes}` : `${body.slice(0, -1)}${quotes}`;
}

export function punctuationIssues(
  lines: readonly EntryLine[],
  lang: ContentLang = "en",
): Map<string, LintIssue> {
  const read = lines.flatMap((line) => {
    const ending = lineEnding(line.text, lang);
    return ending ? [{ id: line.id, ending }] : [];
  });
  const stops = read.filter((line) => line.ending === "stop").length;
  const nones = read.length - stops;
  const flagged = new Map<string, LintIssue>();
  if (stops === 0 || nones === 0) return flagged;
  const tie = stops === nones;
  const keep: Ending = tie ? (read[0]?.ending ?? "none") : stops > nones ? "stop" : "none";
  const message = MESSAGES[keep][tie ? "first" : "most"];
  for (const line of read) {
    if (line.ending !== keep) flagged.set(line.id, makeIssue("punctuation", "low", message, null));
  }
  return flagged;
}
