// Blanks left to fill in: "[number]", "[Company]", "{role}", "XX%", "TODO". Otto's own drafts mark
// missing facts this way on purpose, so one can slip through to a sent resume.

const PATTERNS: readonly RegExp[] = [
  // Square brackets around words, not "[1]" (a citation) or "[text](link)" (a link left as text).
  /\[[^[\]\n]{0,60}?\p{L}[^[\]\n]{0,60}?\](?!\()/gu,
  /\{\{?[^{}\n]{0,60}?\p{L}[^{}\n]{0,60}?\}\}?/gu,
  // "XX%", "$XXk", "XXX users": a stand-in for a number.
  /(?<![\p{L}\p{N}])(?:X{2,}|x{3,})(?![\p{L}\p{N}])/gu,
  /(?<![\p{L}\p{N}])(?:TODO|TBD|FIXME|lorem ipsum)(?![\p{L}\p{N}])/giu,
  /\binsert\s[\p{L} ]{1,30}?\shere\b/giu,
];

/** Each blank in `text`, as written, in reading order. */
export function findPlaceholders(text: string): string[] {
  const found: { at: number; text: string }[] = [];
  for (const pattern of PATTERNS) {
    for (const match of text.matchAll(pattern)) found.push({ at: match.index, text: match[0] });
  }
  return found.sort((a, b) => a.at - b.at).map((item) => item.text);
}
