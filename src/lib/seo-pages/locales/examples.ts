import type { Locale } from "@/i18n/config";
import { contentLangOf } from "@/lib/i18n/languages";
import {
  ROLE_EXAMPLES,
  type ExampleSlug,
  type ExampleTranslation,
  type RoleExample,
} from "../examples";
import { translatedExample } from "../examples/localize";

type Load = () => Promise<{ default: ExampleTranslation }>;

// Every language has them, so tsc holds each to the English examples; one loads at a time, also in the browser.
const EXAMPLES: Record<Exclude<Locale, "en">, Load> = {
  es: () => import("./es/examples"),
  "pt-BR": () => import("./pt-BR/examples"),
  fr: () => import("./fr/examples"),
  de: () => import("./de/examples"),
};

export async function examplesIn(locale: Locale): Promise<readonly RoleExample[]> {
  const lang = contentLangOf(locale);
  if (locale === "en" || !lang || lang === "en") return ROLE_EXAMPLES;
  const words = (await EXAMPLES[locale]()).default;
  return ROLE_EXAMPLES.map((example) =>
    translatedExample(example, words[example.slug as ExampleSlug], lang),
  );
}
