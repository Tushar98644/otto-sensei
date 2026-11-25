import { DEFAULT_LOCALE, isEnabledLocale, type Locale } from "@/i18n/config";
import { LOCALE_COOKIE } from "@/i18n/routing";

const COOKIE = new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]*)`);

// The language the app is shown in for this request: the otto_lang cookie when that language is live, else English.
export function uiLocaleOf(req: Request): Locale {
  const value = COOKIE.exec(req.headers.get("cookie") ?? "")?.[1]?.trim();
  return isEnabledLocale(value) ? value : DEFAULT_LOCALE;
}
