const ELLIPSIS = "…";
const SNIPPET_CHARS = 60;
const SPACE = /\s/;
// The "- " that resumeToText() puts before bullets is layout, not something the user wrote.
const LINE_MARKER = /^[^\S\n]*(?:[-•*·][^\S\n]+)?/;
const LEADING_PUNCTUATION = /^[\s,;:|·–—-]+/;
const TRAILING_PUNCTUATION = /[\s,;:|·–—-]+$/;

function isSpace(text: string, index: number): boolean {
  return SPACE.test(text.charAt(index));
}

// Moves a cut that lands mid-word to the next word start, or back to this word's start when the
// match itself begins inside the word (".NET" in "ASP.NET").
function wordStart(text: string, cut: number, floor: number, matchStart: number): number {
  if (cut <= floor || isSpace(text, cut - 1)) return cut;
  for (let i = cut; i < matchStart; i++) if (isSpace(text, i)) return i + 1;
  let i = cut;
  while (i > floor && !isSpace(text, i - 1)) i--;
  return i;
}

function wordEnd(text: string, cut: number, ceiling: number, matchEnd: number): number {
  if (cut >= ceiling || isSpace(text, cut)) return cut;
  for (let i = cut; i > matchEnd; i--) if (isSpace(text, i - 1)) return i - 1;
  let i = cut;
  while (i < ceiling && !isSpace(text, i)) i++;
  return i;
}

/**
 * About 60 characters of the line around text[start, end), cut at word boundaries, with an
 * ellipsis on each side that was cut. Never crosses a line: each line of resumeToText() is one
 * field or bullet, and a quote that runs into the next one would misstate the evidence.
 */
export function snippetAround(text: string, start: number, end: number): string {
  const lineStart = start === 0 ? 0 : text.lastIndexOf("\n", start - 1) + 1;
  const newline = text.indexOf("\n", end);
  const lineEnd = newline === -1 ? text.length : newline;
  const floor = lineStart + (LINE_MARKER.exec(text.slice(lineStart, start))?.[0].length ?? 0);

  const length = end - start;
  const size = Math.max(SNIPPET_CHARS, length);
  const centered = start - Math.floor((size - length) / 2);
  const from = wordStart(text, Math.max(floor, Math.min(centered, lineEnd - size)), floor, start);
  const to = wordEnd(text, Math.min(lineEnd, Math.max(end, from + size)), lineEnd, end);

  const cutStart = from > floor;
  const cutEnd = to < lineEnd;
  let body = text.slice(from, to).replace(/\s+/g, " ").trim();
  if (cutStart) body = body.replace(LEADING_PUNCTUATION, "");
  if (cutEnd) body = body.replace(TRAILING_PUNCTUATION, "");
  return `${cutStart ? ELLIPSIS : ""}${body}${cutEnd ? ELLIPSIS : ""}`;
}
