import { BRAND } from "@/config/brand";
import { DEFAULT_LOCALE, isEnabledLocale, isLocale, type Locale } from "@/i18n/config";
import { fmt } from "@/i18n/format";
import de from "@/i18n/messages/de/emails";
import en from "@/i18n/messages/en/emails";
import es from "@/i18n/messages/es/emails";
import fr from "@/i18n/messages/fr/emails";
import ptBR from "@/i18n/messages/pt-BR/emails";
import { internalPath } from "@/i18n/routing";

// Emails and bell notes are written by crons and scripts, outside any page, so their words load here directly.

export type EmailMessages = typeof en;

const EMAILS: Record<Locale, unknown> = { en, es, "pt-BR": ptBR, fr, de };

// The account's saved language (user_settings.locale); null, or one we don't have, reads as English.
export function emailLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function emailMessages(locale: Locale): EmailMessages {
  return EMAILS[locale] as EmailMessages;
}

// /{segment}/… sets the language cookie on the way in; a prefix that isn't live yet would be a 404, so those stay unprefixed.
export function localizedPath(locale: Locale, path: string): string {
  return locale === DEFAULT_LOCALE || !isEnabledLocale(locale) ? path : internalPath(locale, path);
}

export function signOff(locale: Locale): string {
  return fmt(emailMessages(locale).signOff, { mascot: BRAND.mascotName, brand: BRAND.name });
}
