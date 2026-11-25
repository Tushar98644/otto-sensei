import { intlLocale, matchLocale, type Locale } from "@/i18n/config";

// Languages a resume, a job post or a letter can be written in (docs/i18n.md: separate from the UI locale).
export const CONTENT_LANGS = ["en", "es", "pt", "fr", "de"] as const;
export type ContentLang = (typeof CONTENT_LANGS)[number];

export const DEFAULT_CONTENT_LANG: ContentLang = "en";

export function isContentLang(value: unknown): value is ContentLang {
  return typeof value === "string" && (CONTENT_LANGS as readonly string[]).includes(value);
}

// The content language closest to any BCP-47 tag or UI locale: pt-BR is pt, es-MX is es.
export function contentLangOf(tag: string | null | undefined): ContentLang | null {
  const base = tag?.trim().toLowerCase().split(/[-_]/)[0];
  return isContentLang(base) ? base : null;
}

// The UI locale that formats this language's dates and numbers.
export function localeOfLang(lang: ContentLang): Locale {
  return matchLocale(lang) ?? "en";
}

export function intlTagOf(lang: ContentLang): string {
  return intlLocale(localeOfLang(lang));
}
