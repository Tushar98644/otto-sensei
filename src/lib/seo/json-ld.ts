import { BRAND } from "@/config/brand";
import { PAID_PLANS, PLANS, PRICES_USD, type BillingInterval } from "@/config/plans";
import type { BillingOffer } from "@/lib/billing/intervals";
import { absoluteUrl } from "./urls";

// Every value comes from config the pages themselves show, so the data never claims what they
// don't.

export type JsonLdData = Record<string, unknown>;

// The HTML parser ends a <script> at the first "</script" whatever the JSON says, so tag characters
// are \u-escaped.
const UNSAFE = /[<>&\u2028\u2029]/g;

export function jsonLdScript(value: JsonLdData): string {
  return JSON.stringify(value).replace(
    UNSAFE,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}

/** So results show the brand name and logo. */
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

// One Offer per billing option on sale. No rating: there are no public reviews to cite.
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
