import { newId, type Basics } from "../schema";
import { findEmail, findLinks, findPhone, isLinkText, type FoundLink } from "../sections";
import { LIMITS } from "./limits";
import { clip, isProse, segmentsOf } from "./text";
import { isLocation } from "./words";

const LABEL_WORDS =
  "e-?mail|phone|tel(?:ephone)?|mobile|mob|cell|whatsapp|linkedin|github|website|web|portfolio|address|location";
// "Email: ..." loses its label; a bare "Email" left over once the address is removed is dropped.
const CONTACT_LABEL = new RegExp(`^(?:${LABEL_WORDS})\\s*[:.]\\s*`, "i");
const BARE_LABEL = new RegExp(`^(?:${LABEL_WORDS})$`, "i");
const DOCUMENT_TITLE = /^(?:resume|résumé|curriculum vitae|cv)$/i;
// A profile, not a repository or a post: linkedin.com/in/jane, github.com/jane, behance.net/jane.
const PROFILE_LINK =
  /^(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com\/in\/[^/\s]+|(?:github\.com|gitlab\.com|behance\.net|dribbble\.com|kaggle\.com)\/[^/\s]+)\/?$/i;

export function parseBasics(
  preamble: readonly string[],
  contactText: string,
): { basics: Basics; leftovers: string[] } {
  const header = preamble.join("\n");
  const email = findEmail(header) ?? findEmail(contactText) ?? "";
  const phone = findPhone(header) ?? findPhone(contactText) ?? "";
  // Profile links anywhere count; other URLs only from the header (body URLs belong to projects).
  const links = dedupeLinks([
    ...findLinks(header),
    ...findLinks(contactText).filter((link) => PROFILE_LINK.test(link.url)),
  ]);
  const contact = [email, phone, ...links.map((link) => link.url)].filter(Boolean);

  let name = "";
  let headline = "";
  let location = "";
  const leftovers: string[] = [];
  for (const line of preamble) {
    let used = false;
    let hasOtherText = false;
    const rest = removeAll(line, contact);
    for (const segment of segmentsOf(rest)) {
      const value = segment.replace(CONTACT_LABEL, "").trim();
      if (!value || BARE_LABEL.test(value) || DOCUMENT_TITLE.test(value)) continue;
      const labelledLocation = /^(?:address|location)\b/i.test(segment);
      if (!name && isNameLike(value)) name = value;
      else if (!location && (labelledLocation || isLocation(value))) location = value;
      else if (name && !headline && isHeadlineLike(value)) headline = value;
      else {
        hasOtherText = true;
        continue;
      }
      used = true;
    }
    // A contact line's other bits are icon glyphs and link labels ("° portfolio/jane"), not a summary.
    if (rest !== line) continue;
    if (hasOtherText || (!used && isProse(line))) leftovers.push(line);
  }
  return {
    basics: {
      name: clip(name, LIMITS.text),
      headline: clip(headline, LIMITS.text),
      email: clip(email, LIMITS.email),
      phone: clip(phone, LIMITS.phone),
      location: clip(location, LIMITS.text),
      links: links.slice(0, LIMITS.links).map((link) => ({
        id: newId(),
        label: clip(link.label, LIMITS.label),
        url: clip(link.url, LIMITS.url),
      })),
    },
    leftovers,
  };
}

function removeAll(line: string, values: readonly string[]): string {
  return values.reduce((rest, value) => rest.split(value).join("\t"), line);
}

function dedupeLinks(links: readonly FoundLink[]): FoundLink[] {
  const seen = new Set<string>();
  return links.filter((link) => {
    const key = link.url.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isNameLike(value: string): boolean {
  return (
    value.length <= 60 &&
    value.split(/\s+/).length <= 6 &&
    /\p{L}/u.test(value) &&
    !/[\d@/:]/.test(value) &&
    !value.endsWith(".")
  );
}

function isHeadlineLike(value: string): boolean {
  return (
    value.length <= 120 &&
    value.split(/\s+/).length <= 14 &&
    (value.match(/\p{L}/gu)?.length ?? 0) >= 2 &&
    !value.includes("@") &&
    !value.endsWith(".") &&
    !isLinkText(value)
  );
}
