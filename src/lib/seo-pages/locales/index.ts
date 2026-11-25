import type { Locale } from "@/i18n/config";
import { formatFor } from "@/i18n/intl";
import type { AtsTranslation } from "../ats";
import {
  COMPETITORS,
  compareValues,
  type CompareTranslation,
  type CompareValues,
  type Competitor,
  type CompetitorSlug,
} from "../compare";
import { withWords } from "../words";

export { examplesIn } from "./examples";

type Translated = Exclude<Locale, "en">;
type Load<T> = () => Promise<{ default: T }>;

// Every language has both, so tsc holds each to the English content; the message namespaces decide what is published.
const COMPARE: Record<Translated, Load<(values: CompareValues) => CompareTranslation>> = {
  es: () => import("./es/compare"),
  "pt-BR": () => import("./pt-BR/compare"),
  fr: () => import("./fr/compare"),
  de: () => import("./de/compare"),
};

const ATS: Record<Translated, Load<AtsTranslation>> = {
  es: () => import("./es/ats"),
  "pt-BR": () => import("./pt-BR/ats"),
  fr: () => import("./fr/ats"),
  de: () => import("./de/ats"),
};

export async function competitorsIn(locale: Locale): Promise<readonly Competitor[]> {
  if (locale === "en") return COMPETITORS;
  const words = (await COMPARE[locale]()).default(compareValues(formatFor(locale)));
  return COMPETITORS.map((competitor) =>
    withWords(competitor, words[competitor.slug as CompetitorSlug]),
  );
}

export async function atsTranslation(locale: Locale): Promise<AtsTranslation | undefined> {
  return locale === "en" ? undefined : (await ATS[locale]()).default;
}
