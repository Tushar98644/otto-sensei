import { BRAND } from "@/config/brand";
import { PAID_PLANS, PLANS, PRICES_USD, type BillingInterval } from "@/config/plans";
import type { BillingOffer } from "@/lib/billing/intervals";
import { absoluteUrl } from "./urls";

export type JsonLdData = Record<string, unknown>;

// "</script" ends the tag whatever the JSON says, so tag characters are \u-escaped.
const UNSAFE = /[<>&\u2028\u2029]/g;

export function jsonLdScript(value: JsonLdData): string {
  return JSON.stringify(value).replace(
    UNSAFE,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}

const CONTEXT = "https://schema.org";

export function jsonLdGraph(nodes: readonly JsonLdData[]): JsonLdData {
  return { "@context": CONTEXT, "@graph": nodes };
}

export function organizationId(base: string): string {
  return `${absoluteUrl("/", base)}/#organization`;
}

export function websiteId(base: string): string {
  return `${absoluteUrl("/", base)}/#website`;
}

export function softwareId(base: string): string {
  return `${absoluteUrl("/", base)}/#software`;
}

// The app icon route draws a 180px PNG, which Google accepts as a logo where it may not take SVG.
export function logoJsonLd(base: string): JsonLdData {
  return { "@type": "ImageObject", url: absoluteUrl("/apple-icon", base), width: 180, height: 180 };
}

export function shareImageUrl(base: string): string {
  return absoluteUrl("/opengraph-image", base);
}

export function organizationJsonLd(base: string): JsonLdData {
  return {
    "@type": "Organization",
    "@id": organizationId(base),
    name: BRAND.name,
    url: absoluteUrl("/", base),
    logo: logoJsonLd(base),
    email: BRAND.supportEmail,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: BRAND.supportEmail,
    },
  };
}

// The publisher as articles name it: enough to stand alone, tied to the full node by its @id.
export function publisherJsonLd(base: string): JsonLdData {
  return {
    "@type": "Organization",
    "@id": organizationId(base),
    name: BRAND.name,
    url: absoluteUrl("/", base),
    logo: logoJsonLd(base),
  };
}

function websiteNode(base: string): JsonLdData {
  const home = absoluteUrl("/", base);
  return {
    "@type": "WebSite",
    "@id": websiteId(base),
    name: BRAND.name,
    url: home,
    description: BRAND.description,
    inLanguage: "en",
    publisher: { "@id": organizationId(base) },
  };
}

export function websiteJsonLd(base: string): JsonLdData {
  return jsonLdGraph([websiteNode(base), organizationJsonLd(base)]);
}

const INTERVALS: Record<BillingInterval, { name: string; duration: string; unit: string }> = {
  month: { name: "monthly", duration: "P1M", unit: "month" },
  year: { name: "yearly", duration: "P1Y", unit: "year" },
};

function softwareNode(offer: BillingOffer, base: string): JsonLdData {
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
    "@type": "WebApplication",
    "@id": softwareId(base),
    name: BRAND.name,
    url: absoluteUrl("/", base),
    description: BRAND.description,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: "en",
    image: shareImageUrl(base),
    publisher: { "@id": organizationId(base) },
    offers: [
      { "@type": "Offer", name: PLANS.free.name, price: "0", priceCurrency: "USD", url },
      ...paid,
    ],
  };
}

export function softwareJsonLd(offer: BillingOffer, base: string): JsonLdData {
  return { "@context": CONTEXT, ...softwareNode(offer, base) };
}

export type FaqEntry = { question: string; answer: string };

export function faqNode(entries: readonly FaqEntry[]): JsonLdData {
  return {
    "@type": "FAQPage",
    mainEntity: entries.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
}

export function faqJsonLd(entries: readonly FaqEntry[]): JsonLdData {
  return { "@context": CONTEXT, ...faqNode(entries) };
}

export function homeJsonLd(
  offer: BillingOffer,
  faq: readonly FaqEntry[],
  base: string,
): JsonLdData {
  return jsonLdGraph([
    websiteNode(base),
    organizationJsonLd(base),
    softwareNode(offer, base),
    { ...faqNode(faq), "@id": `${absoluteUrl("/", base)}/#faq` },
  ]);
}

export type FreeToolInfo = { name: string; path: string; description: string };

export function freeToolJsonLd(tool: FreeToolInfo, base: string): JsonLdData {
  const url = absoluteUrl(tool.path, base);
  return {
    "@context": CONTEXT,
    "@type": "WebApplication",
    "@id": `${url}#app`,
    name: tool.name,
    url,
    description: tool.description,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: "en",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD", url },
    publisher: { "@id": organizationId(base) },
    isPartOf: { "@id": softwareId(base) },
  };
}
