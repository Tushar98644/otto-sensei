import { decodeEntities, htmlToText } from "./html";
import { toTime } from "./posting";

// Server-only. Reads the schema.org JobPosting that job pages publish for search engines. The
// shape varies a lot between sites (strings or objects, one value or a list, @graph wrappers), so
// every field is read defensively.

type JsonObject = Record<string, unknown>;

export type JsonLdJob = {
  title: string | null;
  company: string | null;
  location: string | null;
  text: string;
  firstPostedAt: number | null;
  updatedAt: number | null;
  closesAt: number | null;
};

const MAX_DEPTH = 6;
const MAX_ITEMS = 50;
// Extra sections some sites keep out of the description.
const SECTIONS: readonly (readonly [string, string])[] = [
  ["responsibilities", "Responsibilities"],
  ["qualifications", "Qualifications"],
  ["skills", "Skills"],
  ["experienceRequirements", "Experience"],
  ["educationRequirements", "Education"],
];

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function list(value: unknown): unknown[] {
  if (Array.isArray(value)) return value.slice(0, MAX_ITEMS);
  return value === undefined || value === null ? [] : [value];
}

function str(value: unknown): string | null {
  if (typeof value === "string") return decodeEntities(value).replace(/\s+/g, " ").trim() || null;
  return null;
}

// A name given as "Acme", { name: "Acme" } or a list of either.
function nameOf(value: unknown): string | null {
  for (const item of list(value)) {
    const name = isObject(item) ? str(item.name) : str(item);
    if (name) return name;
  }
  return null;
}

function isJobPosting(node: JsonObject): boolean {
  return list(node["@type"]).some(
    (type) => typeof type === "string" && /(?:^|[/:])JobPosting$/.test(type),
  );
}

function findJobNode(value: unknown, depth = 0): JsonObject | null {
  if (depth > MAX_DEPTH) return null;
  if (Array.isArray(value)) {
    for (const item of list(value)) {
      const found = findJobNode(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (!isObject(value)) return null;
  if (isJobPosting(value)) return value;
  for (const key of ["@graph", "mainEntity", "mainEntityOfPage", "itemListElement", "item"]) {
    const found = findJobNode(value[key], depth + 1);
    if (found) return found;
  }
  return null;
}

/** Description text that may be HTML, HTML escaped once more, or plain text. */
export function descriptionText(value: string): string {
  const html = !/<[a-z]/i.test(value) && /&lt;[a-z/]/i.test(value) ? decodeEntities(value) : value;
  if (/<\/?[a-z][a-z0-9]*[\s>/]/i.test(html)) return htmlToText(html);
  return html
    .split(/\r?\n/)
    .map((line) =>
      decodeEntities(line)
        .replace(/[ \t]+/g, " ")
        .trim(),
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function placeText(place: unknown): string | null {
  if (!isObject(place)) return str(place);
  const address = place.address;
  if (!isObject(address)) return str(address) ?? str(place.name);
  const parts = [
    str(address.addressLocality),
    str(address.addressRegion),
    nameOf(address.addressCountry),
  ];
  const unique = [...new Set(parts.filter((part): part is string => part !== null))];
  return unique.join(", ") || str(place.name);
}

function locationText(node: JsonObject): string | null {
  const remote = list(node.jobLocationType).some(
    (type) => typeof type === "string" && /telecommute/i.test(type),
  );
  const places = list(node.jobLocation)
    .slice(0, 3)
    .map(placeText)
    .filter((place): place is string => place !== null);
  const allowed =
    remote && places.length === 0 ? list(node.applicantLocationRequirements).map(nameOf) : [];
  const parts = [
    ...(remote ? ["Remote"] : []),
    ...places,
    ...allowed.filter((name): name is string => name !== null),
  ];
  return [...new Set(parts)].join(" · ") || null;
}

function jobText(node: JsonObject): string {
  const description = typeof node.description === "string" ? descriptionText(node.description) : "";
  const sections = [description];
  for (const [key, label] of SECTIONS) {
    const value = node[key];
    if (typeof value !== "string") continue;
    const text = descriptionText(value);
    // Many sites repeat these inside the description too.
    if (text && !description.includes(text.slice(0, 80))) sections.push(`${label}\n${text}`);
  }
  return sections.filter(Boolean).join("\n\n");
}

// Some sites wrap the JSON in an HTML comment or CDATA, or leave raw line breaks inside strings,
// which JSON.parse refuses. Control characters are whitespace everywhere else, so spaces are safe.
function parseBlock(block: string): unknown {
  try {
    return JSON.parse(block);
  } catch {
    const cleaned = block
      .trim()
      .replace(/^(?:<!--|<!\[CDATA\[)/, "")
      .replace(/(?:-->|\]\]>)$/, "")
      .replace(/\p{Cc}+/gu, " ");
    try {
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
}

/** The first JobPosting in a page's JSON-LD blocks, or null. */
export function findJsonLdJob(blocks: readonly string[]): JsonLdJob | null {
  for (const block of blocks) {
    const node = findJobNode(parseBlock(block));
    if (!node) continue;
    return {
      title: str(node.title) ?? str(node.name),
      company: nameOf(node.hiringOrganization),
      location: locationText(node),
      text: jobText(node),
      firstPostedAt: toTime(node.datePosted),
      updatedAt: toTime(node.dateModified),
      closesAt: toTime(node.validThrough),
    };
  }
  return null;
}
