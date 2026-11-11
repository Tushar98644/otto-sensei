const SKIPPED_SECTION =
  /^(?:install(?:ation|ing)?|set ?up|getting started|quick ?start|usage|how to (?:use|run)|running|build(?:ing)?|development|local development|requirements|prerequisites|configuration|license|licen[cs]e and .*|contribut(?:ing|ors?|ion)|code of conduct|sponsors?|support|changelog|faq|table of contents|contents|checklist|screenshots?|related issues?|type of change|acknowledg(?:e)?ments?|credits)\b/i;

const FENCE = /^\s*(```|~~~)/;
const HEADING = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
const TABLE_DIVIDER = /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)*\|?\s*$/;

function inlineText(line: string): string {
  return line
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/!\[[^\]]*\]\[[^\]]*\]/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\[[^\]]*\]/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/(\*{1,3}|(?<![\p{L}\p{N}])_{1,3}|_{1,3}(?![\p{L}\p{N}]))/gu, "")
    .replace(/^\s*(?:>\s*)+/, "")
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?/, "")
    .replace(/\|/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function markdownExcerpt(markdown: string, maxChars: number): string {
  const source = markdown.replace(/\r\n?/g, "\n").replace(/<!--[\s\S]*?-->/g, " ");
  const lines: string[] = [];
  let length = 0;
  let inFence = false;
  let skipping = 0;

  for (const raw of source.split("\n")) {
    if (FENCE.test(raw)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const heading = HEADING.exec(raw);
    if (heading) {
      const level = heading[1]?.length ?? 1;
      const title = inlineText(heading[2] ?? "");
      if (skipping && level > skipping) continue;
      skipping = SKIPPED_SECTION.test(title) ? level : 0;
      if (!skipping && title) {
        lines.push(title);
        length += title.length + 1;
      }
    } else if (!skipping && !TABLE_DIVIDER.test(raw) && !/^\s*\[[^\]]+\]:\s*\S+/.test(raw)) {
      const text = inlineText(raw);
      if (/\p{L}{2}/u.test(text)) {
        lines.push(text);
        length += text.length + 1;
      }
    }
    if (length >= maxChars) break;
  }
  return clipText(lines.join("\n"), maxChars);
}

function clipText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > maxChars / 2 ? cut.slice(0, lastSpace) : cut).trimEnd();
}
