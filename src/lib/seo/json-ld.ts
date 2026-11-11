import { BRAND } from "@/config/brand";
import { PAID_PLANS, PLANS, PRICES_USD, type BillingInterval } from "@/config/plans";
import type { BillingOffer } from "@/lib/billing/intervals";
import { absoluteUrl } from "./urls";

// Pure. schema.org data for the public pages. Every value comes from config the pages themselves
// show (BRAND, PLANS, PRICES_USD), so the data can never claim what the page doesn't.

export type JsonLdData = Record<string, unknown>;

// The HTML parser ends a <script> at the first "</script", whatever the JSON around it says, so
// every character that could open or close a tag is written as a \u escape. JSON readers turn
// them back into the same text.
const UNSAFE = /[<>&\u2028\u2029]/g;

/** Safe as the body of a <script type="application/ld+json">: no value can close the tag early. */
export function jsonLdScript(value: JsonLdData): string {
  return JSON.stringify(value).replace(
    UNSAFE,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}

/** The home page's WebSite and Organization, so results show the brand name and logo. */
export function websiteJsonLd(base: string): JsonLdData {
  const home = absoluteUrl("/", base);
  const organization = `${home}/#organization`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${home}/#website`,
        name: BRAND.name,
        url: home,
        description: BRAND.description,
        publisher: { "@id": organization },
      },
      {
        "@type": "Organization",
        "@id": organization,
        name: BRAND.name,
        url: home,
        logo: absoluteUrl("/icon.svg", base),
        email: BRAND.supportEmail,
      },
    ],
  };
}

const INTERVALS: Record<BillingInterval, { name: string; duration: string; unit: string }> = {
  month: { name: "monthly", duration: "P1M", unit: "month" },
  year: { name: "yearly", duration: "P1Y", unit: "year" },
  week: { name: "weekly", duration: "P1W", unit: "week" },
};

/**
 * The pricing page's SoftwareApplication with one Offer per plan and billing option on sale (the
 * same `offer` the cards are drawn from). No rating: there are no public reviews to cite.
 */
export function softwareJsonLd(offer: BillingOffer, base: string): JsonLdData {
  const url = absoluteUrl("/pricing", base);
  const paid = PAID_PLANS.flatMap((plan) =>
    offer[plan].map((interval) => {
      const price = PRICES_USD[plan][interval];
      const { name, duration, unit } = INTERVALS[interval];
      return {
        "@type": "Offer",
        name: `${PLANS[plan].name} ${name}`,
        price: String(price),
        priceCurrency: "USD",
        url,
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price,
          priceCurrency: "USD",
          billingDuration: duration,
          unitText: unit,
        },
      };
    }),
  );
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: BRAND.name,
    url: absoluteUrl("/", base),
    description: BRAND.description,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: [
      { "@type": "Offer", name: PLANS.free.name, price: "0", priceCurrency: "USD", url },
      ...paid,
    ],
  };
}
