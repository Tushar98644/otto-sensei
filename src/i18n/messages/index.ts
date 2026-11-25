import "server-only";
import type { Locale } from "../config";
import type { Translation } from "../types";
import en from "./en";

export type Messages = typeof en;
export type Namespace = keyof Messages;
export type Translations = { readonly [N in Namespace]?: Translation<Messages[N]> };

export const NAMESPACES = Object.keys(en) as Namespace[];

const TRANSLATIONS: Record<Exclude<Locale, "en">, () => Promise<{ default: Translations }>> = {
  es: () => import("./es"),
  "pt-BR": () => import("./pt-BR"),
  fr: () => import("./fr"),
  de: () => import("./de"),
};

export function englishMessages(): Messages {
  return en;
}

export async function translationsFor(locale: Exclude<Locale, "en">): Promise<Translations> {
  return (await TRANSLATIONS[locale]()).default;
}

// A namespace a locale hasn't translated yet reads in English; messages.test.ts keeps enabled locales complete.
export async function loadMessages<N extends Namespace>(
  locale: Locale,
  namespace: N,
): Promise<Messages[N]> {
  if (locale === "en") return en[namespace];
  const translated = (await translationsFor(locale))[namespace];
  return (translated as Messages[N] | undefined) ?? en[namespace];
}
