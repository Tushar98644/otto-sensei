import { TEXT_LIMITS } from "@/config/plans";
import {
  bulletText,
  classifyHeading,
  extraKindOf,
  splitInlineHeading,
} from "@/lib/resume/sections";
import { findInLines, summarize, type MatchCheck, type MatchLine } from "./check";
import { readPost } from "./post";
import { namesLanguage } from "./vocabulary";

const TOP = "Top of your resume";
const MIN_PROSE_WORDS = 8;

function isProse(text: string): boolean {
  if (/[.!?]$/u.test(text)) return true;
  return !/[|@•·]/u.test(text) && text.split(" ").length >= MIN_PROSE_WORDS;
}

function placeName(heading: string, top: string): string {
  const text = heading.replace(/^[\s#*_|=~:•·-]+|[\s#*_|=~:•·-]+$/gu, "").replace(/\s+/g, " ");
  if (!text) return top;
  return text === text.toUpperCase() ? text.charAt(0) + text.slice(1).toLowerCase() : text;
}

const SENTENCE_THEN_LABEL = /(?<=[.!?]) (?=[^.!?:\t]{2,40}: )/gu;

// A paragraph that ends in "Skills: Go, SQL" keeps that list apart, as if it had a line of its own.
function segments(line: string): string[] {
  const parts: string[] = [];
  let start = 0;
  for (const { index } of line.matchAll(SENTENCE_THEN_LABEL)) {
    if (!splitInlineHeading(line.slice(index + 1))) continue;
    parts.push(line.slice(start, index));
    start = index + 1;
  }
  parts.push(line.slice(start));
  return parts;
}

// Pasted or extracted text keeps its own lines, so each match quotes the line as the person wrote it.
export function resumeTextLines(resumeText: string, top = TOP): MatchLine[] {
  const lines: MatchLine[] = [];
  let place = top;
  let listing = false;
  let languages = false;
  for (const raw of resumeText.slice(0, TEXT_LIMITS.resumeChars).split(/\r\n?|\n/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) continue;
    const kind = classifyHeading(line);
    if (kind) {
      place = placeName(line, top);
      languages = extraKindOf(line) === "languages";
      listing = kind === "skills" || languages;
      continue;
    }
    for (const part of segments(line)) {
      const inline = splitInlineHeading(part);
      const text = bulletText(part) ?? part;
      if (inline) {
        // The same rule as a heading on its own line: "Languages: Python, Go" is a list, "Languages: Spanish" isn't.
        const spoken = extraKindOf(`${inline.label}:`) === "languages";
        const inList = inline.kind === "skills" || spoken;
        const shown = !inList || (spoken && namesLanguage(inline.rest));
        lines.push({ text, place: placeName(inline.label, top), shown });
        continue;
      }
      // Above the first heading, short lines are the name, headline and contacts.
      const shown = place === top ? isProse(text) : !listing || (languages && namesLanguage(text));
      lines.push({ text, place, shown });
    }
  }
  return lines;
}

export function matchCheckFromText(resumeText: string, jobText: string, top = TOP): MatchCheck {
  const lines = resumeTextLines(resumeText, top);
  return summarize(readPost(jobText), (term) => findInLines(term.terms, lines));
}
