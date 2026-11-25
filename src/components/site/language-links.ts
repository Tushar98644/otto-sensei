import { DEFAULT_LOCALE, ENABLED_LOCALES, LANGUAGE_NAMES, localeSegment } from "@/i18n/config";
import { SECTION_KEYS } from "@/i18n/pages";
import { publishedByLocale } from "@/i18n/publish";
import type { LanguageLinks } from "./page-languages";

// For the language picker and hint in the browser.
export async function languageLinks(): Promise<LanguageLinks> {
  return {
    languages: ENABLED_LOCALES.map((locale) => ({
      locale,
      segment: localeSegment(locale),
      prefix: locale === DEFAULT_LOCALE ? "" : `/${localeSegment(locale)}`,
      name: LANGUAGE_NAMES[locale],
    })),
    pages: await publishedByLocale(),
    sections: SECTION_KEYS,
  };
}
