import { JsonLd } from "@/components/site/json-ld";
import { billingOffer } from "@/lib/billing/intervals";
import { appUrl } from "@/lib/env";
import { homeJsonLd } from "@/lib/seo/json-ld";
import { HOME_FAQ } from "./faq";
import { faqEntries } from "./faq-list";

export function WebsiteJsonLd() {
  return <JsonLd data={homeJsonLd(billingOffer(), faqEntries(HOME_FAQ), appUrl())} />;
}
