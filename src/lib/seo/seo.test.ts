import { describe, expect, it } from "vitest";
import { BRAND } from "@/config/brand";
import { PRICES_USD } from "@/config/plans";
import { createElement, Fragment } from "react";
import {
  faqJsonLd,
  freeToolJsonLd,
  homeJsonLd,
  jsonLdScript,
  softwareJsonLd,
  websiteJsonLd,
} from "./json-ld";
import { nodeText } from "./node-text";
import { absoluteUrl } from "./urls";

const BASE = "https://www.ottosensei.com";
const LINE_SEPARATOR = String.fromCharCode(0x2028);

describe("absoluteUrl", () => {
  it("writes the home page as the bare origin, the way Next writes its canonical tag", () => {
    expect(absoluteUrl("/", BASE)).toBe("https://www.ottosensei.com");
    expect(absoluteUrl("", BASE)).toBe("https://www.ottosensei.com");
  });

  it("joins other paths with exactly one slash and never adds a trailing one", () => {
    expect(absoluteUrl("/pricing", BASE)).toBe("https://www.ottosensei.com/pricing");
    expect(absoluteUrl("p/maya-chen", BASE)).toBe("https://www.ottosensei.com/p/maya-chen");
  });
});

describe("jsonLdScript", () => {
  it("can't be closed early by a value, and reads back as the same data", () => {
    const data = {
      name: `</script><script>alert(1)</script> <!-- & ${LINE_SEPARATOR} >`,
      nested: { list: ["</SCRIPT>"] },
    };
    const script = jsonLdScript(data);
    expect(script).not.toMatch(/<\/script/i);
    expect(script).not.toMatch(/[<>&]/);
    expect(script).not.toContain(LINE_SEPARATOR);
    expect(JSON.parse(script)).toEqual(data);
  });
});

describe("websiteJsonLd", () => {
  it("names the site and its publisher on the www origin", () => {
    const data = websiteJsonLd(BASE);
    expect(data["@context"]).toBe("https://schema.org");
    const [site, organization] = data["@graph"] as Record<string, unknown>[];
    expect(site).toMatchObject({
      "@type": "WebSite",
      name: BRAND.name,
      url: BASE,
      publisher: { "@id": `${BASE}/#organization` },
    });
    expect(organization).toMatchObject({
      "@type": "Organization",
      "@id": `${BASE}/#organization`,
      name: BRAND.name,
      url: BASE,
      logo: { "@type": "ImageObject", url: `${BASE}/apple-icon`, width: 180, height: 180 },
      email: BRAND.supportEmail,
    });
  });

  it("claims no social profiles, since none are configured", () => {
    const [, organization] = websiteJsonLd(BASE)["@graph"] as Record<string, unknown>[];
    expect(organization).not.toHaveProperty("sameAs");
  });
});

describe("homeJsonLd", () => {
  const faq = [{ question: "Is it free?", answer: "Yes." }];
  const data = homeJsonLd({ pro: ["month"], max: ["month"] }, faq, BASE);
  const nodes = data["@graph"] as Record<string, unknown>[];

  it("describes the site, its publisher, the app and the FAQ in one graph", () => {
    expect(data["@context"]).toBe("https://schema.org");
    expect(nodes.map((node) => node["@type"])).toEqual([
      "WebSite",
      "Organization",
      "WebApplication",
      "FAQPage",
    ]);
    for (const node of nodes) expect(node).not.toHaveProperty("@context");
  });

  it("files the app as a business web app sold at the pricing page's prices", () => {
    const app = nodes[2]!;
    expect(app).toMatchObject({
      "@id": `${BASE}/#software`,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      publisher: { "@id": `${BASE}/#organization` },
    });
    const pricing = softwareJsonLd({ pro: ["month"], max: ["month"] }, BASE);
    expect({ "@context": "https://schema.org", ...app }).toEqual(pricing);
  });

  it("asks and answers each question as written", () => {
    expect(nodes[3]).toMatchObject({
      mainEntity: [
        {
          "@type": "Question",
          name: "Is it free?",
          acceptedAnswer: { "@type": "Answer", text: "Yes." },
        },
      ],
    });
  });
});

describe("faqJsonLd", () => {
  it("stands alone with its own context", () => {
    expect(faqJsonLd([{ question: "Q?", answer: "A." }])).toEqual({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        { "@type": "Question", name: "Q?", acceptedAnswer: { "@type": "Answer", text: "A." } },
      ],
    });
  });
});

describe("freeToolJsonLd", () => {
  it("marks a tool as a free web app on its own page, part of the main app", () => {
    const data = freeToolJsonLd(
      { name: "Check", path: "/job-match", description: "Checks." },
      BASE,
    );
    expect(data).toMatchObject({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "@id": `${BASE}/job-match#app`,
      url: `${BASE}/job-match`,
      applicationCategory: "BusinessApplication",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      isPartOf: { "@id": `${BASE}/#software` },
    });
  });
});

describe("nodeText", () => {
  it("reads the words out of JSX, links included, with spaces collapsed", () => {
    const node = createElement(
      Fragment,
      null,
      "Details are in our ",
      createElement("a", { href: "/privacy" }, "privacy policy"),
      ".\n   See ",
      3,
      " pages.",
      null,
      false,
    );
    expect(nodeText(node)).toBe("Details are in our privacy policy. See 3 pages.");
    expect(nodeText("plain")).toBe("plain");
    expect(nodeText(undefined)).toBe("");
  });
});

describe("softwareJsonLd", () => {
  type Offer = { name: string; price: string; priceCurrency: string; url: string };

  it("offers Free and every billing option on sale, priced from PRICES_USD", () => {
    const data = softwareJsonLd({ pro: ["month", "year"], max: ["month"] }, BASE);
    expect(data).toMatchObject({
      "@type": "WebApplication",
      name: BRAND.name,
      url: BASE,
      operatingSystem: "Web",
    });
    const offers = data.offers as Offer[];
    expect(offers.map((offer) => [offer.name, offer.price])).toEqual([
      ["Free", "0"],
      ["Pro monthly", String(PRICES_USD.pro.month)],
      ["Pro yearly", String(PRICES_USD.pro.year)],
      ["Max monthly", String(PRICES_USD.max.month)],
    ]);
    for (const offer of offers) {
      expect(offer.priceCurrency).toBe("USD");
      expect(offer.url).toBe(`${BASE}/pricing`);
    }
    expect(offers[2]).toMatchObject({
      priceSpecification: { billingDuration: "P1Y", price: PRICES_USD.pro.year },
    });
  });

  it("leaves out a plan with nothing on sale", () => {
    const offers = softwareJsonLd({ pro: ["month"], max: [] }, BASE).offers as Offer[];
    expect(offers.map((offer) => offer.name)).toEqual(["Free", "Pro monthly"]);
  });

  it("claims no rating or review", () => {
    const data = softwareJsonLd({ pro: ["month"], max: ["month"] }, BASE);
    expect(data).not.toHaveProperty("aggregateRating");
    expect(data).not.toHaveProperty("review");
  });
});
