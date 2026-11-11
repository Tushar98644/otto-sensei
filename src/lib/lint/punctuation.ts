import type { LintIssue } from "./types";

// Client-safe and pure. Lines in one job or project should all end with a full stop or all end
// without one; the lines that break the pattern get a low tip. Lines whose ending can't be read
// either way ("?", "!", "etc.", "U.S.", ".)") are left out of the count.

export type EntryLine = { id: string; text: string };

type Ending = "stop" | "none";

const CONTENT = /[\p{L}\p{N}]/u;
const CLOSING_QUOTES = /["'”’»]+$/u;
const OTHER_MARK = /[?!…]$|\.\.$/u;
const BRACKET_AFTER_STOP = /\.\s*[)\]]+$/u;
// "U.S.", "e.g.", "Ph.D.": letters with a dot after each.
const DOTTED_INITIALS = /(?:^|[^\p{L}])(?:\p{L}{1,2}\.){2,}$/u;
const LAST_WORD = /(\p{L}+)\.$/u;
// A full stop after these ends the word, so it says nothing about how the line ends.
const ABBREVIATIONS = new Set("al approx co corp dept etc inc jr ltd pty sr vs".split(" "));

// What a flagged line should do, by the ending most lines have. A tie follows the first line.
const MESSAGES: Record<Ending, { most: string; first: string }> = {
  stop: {
    most: "Most lines here end with a full stop. Add one here to match.",
    first: "Your first line here ends with a full stop. Add one here to match.",
  },
  none: {
    most: "Most lines here end without a full stop. Remove this one to match.",
    first: "Your first line here ends without a full stop. Remove this one to match.",
  },
};

export function lineEnding(text: string): Ending | null {
  if (!CONTENT.test(text)) return null;
  const end = text.trimEnd().replace(CLOSING_QUOTES, "");
  if (OTHER_MARK.test(end) || BRACKET_AFTER_STOP.test(end)) return null;
  if (!end.endsWith(".")) return "none";
  if (DOTTED_INITIALS.test(end)) return null;
  const word = LAST_WORD.exec(end)?.[1]?.toLowerCase();
  return word && ABBREVIATIONS.has(word) ? null : "stop";
}

/** The line with its final full stop added or removed, keeping any closing quote after it. */
export function setFullStop(text: string, stop: boolean): string {
  const trimmed = text.trimEnd();
  const quotes = CLOSING_QUOTES.exec(trimmed)?.[0] ?? "";
  const body = trimmed.slice(0, trimmed.length - quotes.length);
  if (body.endsWith(".") === stop) return trimmed;
  return stop ? `${body}.${quotes}` : `${body.slice(0, -1)}${quotes}`;
}

/**
 * The lines of one entry that end unlike most of the others, by line id. A tie follows the first
 * line, which usually sets the pattern. Fewer than two readable endings means nothing to compare.
 */
export function punctuationIssues(lines: readonly EntryLine[]): Map<string, LintIssue> {
  const read = lines.flatMap((line) => {
    const ending = lineEnding(line.text);
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
    if (line.ending !== keep) {
      flagged.set(line.id, { id: "punctuation", severity: "low", message, match: null });
    }
  }
  return flagged;
}
