import { intlLocale, type Locale } from "./config";
import type { PluralCategory, PluralForms } from "./types";

// Apart so code that only fills placeholders (the root layout's islands) leaves Intl and the locale table behind.
export { fmt, placeholdersOf } from "./fmt";

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
