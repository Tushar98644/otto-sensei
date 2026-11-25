import { JsonLd } from "@/components/site/json-ld";
import { ROUTES } from "@/components/site/routes";
import type { Locale } from "@/i18n/config";
import type { Localize } from "@/i18n/pages";
import { billingOffer } from "@/lib/billing/intervals";
import { appUrl } from "@/lib/env";
import { homeJsonLd, type JsonLdLocale } from "@/lib/seo/json-ld";
import { type FaqItem, faqEntries } from "./faq-list";

// The page's language, the site's description in it and its addresses; English is ENGLISH_JSON_LD.
export function homeJsonLdLocale(
  locale: Locale,
  description: string,
  href: Localize,
): JsonLdLocale {
  return { language: locale, description, home: href(ROUTES.home), pricing: href(ROUTES.pricing) };
}

export function WebsiteJsonLd({ faq, page }: { faq: readonly FaqItem[]; page: JsonLdLocale }) {
  return <JsonLd data={homeJsonLd(billingOffer(), faqEntries(faq), appUrl(), page)} />;
}
