import { companyKey } from "@/lib/pdf/visible";

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
  return left === right || ` ${left} `.includes(` ${right} `) || ` ${right} `.includes(` ${left} `);
}

export type CompanyCheck = {
  company: string;
  own: readonly string[];
  others: readonly string[];
};

function trimName(name: string): string {
  return name.replace(/[.'’-]+$/u, "").trim();
}

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
