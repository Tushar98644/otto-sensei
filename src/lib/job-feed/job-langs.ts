import type { Locale } from "@/i18n/config";
import { CONTENT_LANGS, contentLangOf, type ContentLang } from "@/lib/i18n/languages";

// Hidden, like the app's language setting, until every screen is translated (docs/i18n.md). Until then a
// list keeps every post language unless the account saved a choice, so English lists stay as they are.
export const JOB_LANGUAGES_LIVE = false;

// The app's language and English.
export function defaultJobLangs(ui: Locale): ContentLang[] {
  return [...new Set<ContentLang>([contentLangOf(ui) ?? "en", "en"])];
}

// The post languages a list keeps, in a fixed order; null keeps every language.
export function jobLangsFor(
  saved: readonly ContentLang[] | null | undefined,
  ui: Locale,
  live = JOB_LANGUAGES_LIVE,
): ContentLang[] | null {
  const chosen = saved && saved.length > 0 ? saved : live ? defaultJobLangs(ui) : null;
  if (!chosen) return null;
  const kept = CONTENT_LANGS.filter((lang) => chosen.includes(lang));
  return kept.length === CONTENT_LANGS.length ? null : kept;
}
