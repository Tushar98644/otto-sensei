import { companyKey } from "@/lib/pdf/visible";

// A summary or letter reused from another application often still names the other company ("I'd
// love to join Initech" in the copy for Globex). Two ways to spot one, both cautious: the companies
// of the person's other tailored copies, matched anywhere; and a few phrasings that only ever take
// the employer being written to ("join X", "X's mission", "the role at X", "Dear X team").

// 1-4 capitalized words, allowing "&", dots and hyphens inside a name: "Acme", "Procter & Gamble",
// "Booking.com", "Rolls-Royce Motor Cars".
const NAME = String.raw`\p{Lu}[\p{L}\p{N}.&'’-]*(?:\s(?:&\s)?\p{Lu}[\p{L}\p{N}.&'’-]*){0,3}`;

const PHRASES: readonly RegExp[] = [
  new RegExp(
    String.raw`\b(?:join|joining)\s(${NAME})(?=\s*(?:[.,;:!?]|$|\s(?:as|and|in|on|to|because|where|for|this|next)\b))`,
    "gu",
  ),
  new RegExp(
    String.raw`(?<![\p{L}\p{N}])(${NAME})['’]s\s(?:team|mission|vision|product|products|platform|customers|users|work|culture|values|growth|success|goals)\b`,
    "gu",
  ),
  new RegExp(
    String.raw`\b(?:role|position|opening|job|opportunity|internship)\s(?:at|with)\s(${NAME})`,
    "gu",
  ),
  new RegExp(String.raw`(?:^|\n)\s*Dear\s(${NAME})\s(?:team|hiring|recruit)`, "giu"),
];

// Capitalized words those phrasings catch that aren't companies.
const NOT_COMPANIES = new Set(
  [
    "a",
    "an",
    "hiring",
    "hiring manager",
    "i",
    "it",
    "my",
    "our",
    "recruiting",
    "team",
    "that",
    "the",
    "their",
    "these",
    "this",
    "us",
    "you",
    "your",
  ].map(companyKey),
);

function sameCompany(a: string, b: string): boolean {
  const left = companyKey(a);
  const right = companyKey(b);
  if (!left || !right) return false;
  // "Globex" and "Globex Corporation" are the same employer; word boundaries keep "Meta" apart
  // from "Metabase".
  return left === right || ` ${left} `.includes(` ${right} `) || ` ${right} `.includes(` ${left} `);
}

export type CompanyCheck = {
  // The company this copy is for.
  company: string;
  // Places the person worked or studied: naming them is expected.
  own: readonly string[];
  // Companies from the person's other tailored copies.
  others: readonly string[];
};

function trimName(name: string): string {
  return name.replace(/[.'’-]+$/u, "").trim();
}

/** Company names in `text` that aren't the one this copy is for, first spelling of each. */
export function otherCompanies(text: string, check: CompanyCheck): string[] {
  if (!companyKey(check.company)) return [];
  const allowed = (name: string) =>
    sameCompany(name, check.company) || check.own.some((own) => sameCompany(name, own));
  const found = new Map<string, string>();
  const add = (name: string) => {
    const clean = trimName(name);
    const key = companyKey(clean);
    if (!key || NOT_COMPANIES.has(key) || allowed(clean) || found.has(key)) return;
    found.set(key, clean);
  };
  for (const other of check.others) {
    const name = other.trim();
    if (!name || allowed(name)) continue;
    const pattern = new RegExp(
      `(?<![\\p{L}\\p{N}])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")}(?![\\p{L}\\p{N}])`,
      "iu",
    );
    const match = pattern.exec(text);
    if (match) add(match[0]);
  }
  for (const phrase of PHRASES) {
    for (const match of text.matchAll(phrase)) add(match[1] ?? "");
  }
  return [...found.values()];
}
