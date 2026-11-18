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

function placeName(heading: string): string {
  const text = heading.replace(/^[\s#*_|=~:•·-]+|[\s#*_|=~:•·-]+$/gu, "").replace(/\s+/g, " ");
  if (!text) return TOP;
  return text === text.toUpperCase() ? text.charAt(0) + text.slice(1).toLowerCase() : text;
}

// Pasted or extracted text keeps its own lines, so each match quotes the line as the person wrote it.
export function resumeTextLines(resumeText: string): MatchLine[] {
  const lines: MatchLine[] = [];
  let place = TOP;
  let listing = false;
  let languages = false;
  for (const raw of resumeText.slice(0, TEXT_LIMITS.resumeChars).split(/\r\n?|\n/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) continue;
    const kind = classifyHeading(line);
    if (kind) {
      place = placeName(line);
      languages = extraKindOf(line) === "languages";
      listing = kind === "skills" || languages;
      continue;
    }
    const inline = splitInlineHeading(line);
    const text = bulletText(line) ?? line;
    if (inline) {
      // The same rule as a heading on its own line: "Languages: Python, Go" is a list, "Languages: Spanish" isn't.
      const spoken = extraKindOf(`${inline.label}:`) === "languages";
      const inList = inline.kind === "skills" || spoken;
      const shown = !inList || (spoken && namesLanguage(inline.rest));
      lines.push({ text, place: placeName(inline.label), shown });
      continue;
    }
    // Above the first heading, short lines are the name, headline and contacts.
    const shown = place === TOP ? isProse(text) : !listing || (languages && namesLanguage(text));
    lines.push({ text, place, shown });
  }
  return lines;
}

export function matchCheckFromText(resumeText: string, jobText: string): MatchCheck {
  const lines = resumeTextLines(resumeText);
  return summarize(readPost(jobText), (term) => findInLines(term.terms, lines));
}
