import { intlLocale, type Locale } from "./config";
import type {
  MessageValue,
  MessageValues,
  PluralCategory,
  PluralForms,
  Placeholders,
} from "./types";

const PLACEHOLDER = /\{(\w+)\}/g;

// Fills {name} placeholders; one without a value stays as written, so a gap shows instead of a crash.
export function fmt<S extends string>(
  template: S,
  ...[values]: [Placeholders<S>] extends [never] ? [] : [MessageValues<S>]
): string {
  if (!values) return template;
  const given = values as Record<string, MessageValue | undefined>;
  return template.replace(PLACEHOLDER, (whole, name: string) => {
    const value = given[name];
    return value === undefined ? whole : String(value);
  });
}

export function placeholdersOf(template: string): string[] {
  return [...template.matchAll(PLACEHOLDER)].map(([, name = ""]) => name);
}

const pluralRules = new Map<string, Intl.PluralRules>();

export function pluralCategory(locale: Locale, count: number): PluralCategory {
  const tag = intlLocale(locale);
  let rules = pluralRules.get(tag);
  if (!rules) {
    rules = new Intl.PluralRules(tag);
    pluralRules.set(tag, rules);
  }
  return rules.select(count) as PluralCategory;
}

// The form a count takes in this language, falling back to other.
export function selectPlural(locale: Locale, forms: PluralForms, count: number): string {
  return forms[pluralCategory(locale, count)] ?? forms.other;
}

// The categories a language picks for whole numbers people see (0 to 1,000): a plural message needs each of them.
export function pluralCategoriesFor(locale: Locale): PluralCategory[] {
  const used = new Set<PluralCategory>();
  for (let count = 0; count <= 1000; count++) used.add(pluralCategory(locale, count));
  return [...used];
}

export function allPluralCategoriesFor(locale: Locale): PluralCategory[] {
  return new Intl.PluralRules(intlLocale(locale)).resolvedOptions()
    .pluralCategories as PluralCategory[];
}
