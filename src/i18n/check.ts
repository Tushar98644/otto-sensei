import type { Locale } from "./config";
import { allPluralCategoriesFor, placeholdersOf, pluralCategoriesFor } from "./format";
import { RICH_TAGS, tagsOf } from "./rich";
import { PLURAL_CATEGORIES } from "./types";

type Tree = { readonly [key: string]: unknown };

const isTree = (value: unknown): value is Tree =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function isPluralForms(value: unknown): value is Readonly<Record<string, string>> {
  if (!isTree(value) || !("other" in value)) return false;
  return Object.entries(value).every(
    ([key, form]) =>
      (PLURAL_CATEGORIES as readonly string[]).includes(key) && typeof form === "string",
  );
}

const sorted = (values: string[]) => [...values].sort().join(" ");

// Allowed tags only, each opened and closed in turn, never nested.
function tagProblem(text: string): string | null {
  const tags = tagsOf(text);
  for (let i = 0; i < tags.length; i += 2) {
    const name = /^<([a-z]+)>$/.exec(tags[i] ?? "")?.[1];
    if (!name || !(RICH_TAGS as readonly string[]).includes(name) || tags[i + 1] !== `</${name}>`) {
      return `bad tags ${tags.join("")} (allowed: ${RICH_TAGS.map((tag) => `<${tag}>`).join(" ")}, not nested)`;
    }
  }
  return null;
}

function checkText(path: string, text: string, english: string | undefined, out: string[]) {
  if (!text.trim()) out.push(`${path}: empty`);
  const tags = tagProblem(text);
  if (tags) out.push(`${path}: ${tags}`);
  if (english === undefined) return;
  if (sorted(placeholdersOf(text)) !== sorted(placeholdersOf(english))) {
    out.push(
      `${path}: placeholders {${placeholdersOf(text)}} differ from English {${placeholdersOf(english)}}`,
    );
  }
  if (sorted(tagsOf(text)) !== sorted(tagsOf(english)))
    out.push(`${path}: tags differ from English`);
}

function checkPlural(
  locale: Locale,
  path: string,
  forms: Readonly<Record<string, string>>,
  english: Readonly<Record<string, string>> | undefined,
  out: string[],
) {
  const allowed = allPluralCategoriesFor(locale);
  for (const key of Object.keys(forms)) {
    if (!(allowed as string[]).includes(key))
      out.push(`${path}.${key}: ${locale} has no "${key}" form`);
  }
  for (const needed of pluralCategoriesFor(locale)) {
    if (!(needed in forms)) out.push(`${path}: missing the "${needed}" form ${locale} needs`);
  }
  const sourceOther = english?.other;
  for (const [key, text] of Object.entries(forms)) {
    checkText(`${path}.${key}`, text, undefined, out);
    if (sourceOther !== undefined && sorted(tagsOf(text)) !== sorted(tagsOf(sourceOther))) {
      out.push(`${path}.${key}: tags differ from English`);
    }
  }
  if (english) {
    const union = (all: Readonly<Record<string, string>>) =>
      sorted([...new Set(Object.values(all).flatMap(placeholdersOf))]);
    if (union(forms) !== union(english)) out.push(`${path}: placeholders differ from English`);
  }
}

function walk(
  locale: Locale,
  path: string,
  value: unknown,
  english: unknown,
  checkSame: boolean,
  out: string[],
) {
  const source = english === undefined ? value : english;
  if (typeof source === "string") {
    if (typeof value !== "string") out.push(`${path}: should be text`);
    else {
      checkText(path, value, english as string | undefined, out);
      // Only words count: a template of placeholders alone, like "{count} {label}", reads the same everywhere.
      if (checkSame && value === english && /\p{L}/u.test(value.replace(/\{\w+\}/g, ""))) {
        out.push(`${path}: still in English`);
      }
    }
    return;
  }
  if (isPluralForms(source)) {
    if (!isPluralForms(value)) out.push(`${path}: should be plural forms`);
    else checkPlural(locale, path, value, english as Record<string, string> | undefined, out);
    return;
  }
  if (!isTree(source) || !isTree(value)) {
    out.push(`${path}: should be a group`);
    return;
  }
  for (const key of Object.keys(source)) {
    if (!(key in value)) out.push(`${path ? `${path}.` : ""}${key}: missing`);
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key;
    if (!(key in source)) out.push(`${childPath}: not in English`);
    else
      walk(
        locale,
        childPath,
        child,
        english === undefined ? undefined : source[key],
        checkSame,
        out,
      );
  }
}

// Problems in one locale's messages: against English when given, else the English source's own rules.
export function checkMessages(
  locale: Locale,
  messages: unknown,
  english?: unknown,
  sameAsEnglish: ReadonlySet<string> = new Set(),
): string[] {
  const out: string[] = [];
  walk(locale, "", messages, english, english !== undefined, out);
  return out.filter((problem) => {
    const path = problem.slice(0, problem.indexOf(":"));
    return !(problem.endsWith("still in English") && sameAsEnglish.has(path));
  });
}
