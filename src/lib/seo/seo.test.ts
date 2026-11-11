import { describe, expect, it } from "vitest";
import { BRAND } from "@/config/brand";
import { PRICES_USD } from "@/config/plans";
import { jsonLdScript, softwareJsonLd, websiteJsonLd } from "./json-ld";
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
      logo: `${BASE}/icon.svg`,
    });
  });
});

describe("softwareJsonLd", () => {
  type Offer = { name: string; price: string; priceCurrency: string; url: string };

  it("offers Free and every billing option on sale, priced from PRICES_USD", () => {
    const data = softwareJsonLd({ pro: ["month", "year"], max: ["month"] }, BASE);
    expect(data).toMatchObject({
      "@type": "SoftwareApplication",
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
