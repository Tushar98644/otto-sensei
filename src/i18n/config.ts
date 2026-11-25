// Every language Otto is being translated into (docs/i18n.md). Only ENABLED_LOCALES are served.
export const LOCALES = ["en", "es", "pt-BR", "fr", "de"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

// Routed, prerendered and offered; a locale joins once its pages are translated.
export const ENABLED_LOCALES: readonly Locale[] = ["en"];

// URL prefixes are lowercase, so pt-BR lives at /pt-br.
const SEGMENTS: Record<Locale, string> = {
  en: "en",
  es: "es",
  "pt-BR": "pt-br",
  fr: "fr",
  de: "de",
};

// English formats as en-US so numbers and dates read as they always have; Spanish is neutral Latin American.
const INTL_LOCALES: Record<Locale, string> = {
  en: "en-US",
  es: "es-419",
  "pt-BR": "pt-BR",
  fr: "fr-FR",
  de: "de-DE",
};

const OPEN_GRAPH_LOCALES: Record<Locale, string> = {
  en: "en_US",
  es: "es_LA",
  "pt-BR": "pt_BR",
  fr: "fr_FR",
  de: "de_DE",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function isEnabledLocale(value: unknown): value is Locale {
  return isLocale(value) && ENABLED_LOCALES.includes(value);
}

export function localeSegment(locale: Locale): string {
  return SEGMENTS[locale];
}

export function localeFromSegment(segment: string | undefined): Locale | null {
  return LOCALES.find((locale) => SEGMENTS[locale] === segment) ?? null;
}

export function intlLocale(locale: Locale): string {
  return INTL_LOCALES[locale];
}

export function openGraphLocale(locale: Locale): string {
  return OPEN_GRAPH_LOCALES[locale];
}

// The closest locale to any BCP-47 tag: es-MX is es, pt-PT is pt-BR, en-GB is en; null for one we don't have.
export function matchLocale(tag: string | null | undefined): Locale | null {
  if (!tag) return null;
  let parsed: Intl.Locale;
  try {
    parsed = new Intl.Locale(tag.trim().replaceAll("_", "-"));
  } catch {
    return null;
  }
  const exact = LOCALES.find((locale) => locale.toLowerCase() === parsed.baseName.toLowerCase());
  if (exact) return exact;
  return LOCALES.find((locale) => new Intl.Locale(locale).language === parsed.language) ?? null;
}
