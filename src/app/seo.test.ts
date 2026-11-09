import { describe, expect, it } from "vitest";
import { LEGAL_LAST_UPDATED } from "@/components/site/routes";
import { appUrl } from "@/lib/env";
import robots from "./robots";
import sitemap from "./sitemap";

describe("sitemap", () => {
  const entries = sitemap();

  it("lists every public page as an absolute URL on the app's domain", () => {
    expect(entries.map((entry) => entry.url)).toEqual(
      ["/", "/studio", "/jobs", "/pricing", "/privacy", "/terms", "/refunds"].map((p) => `${appUrl()}${p}`),
    );
  });

  it("dates only the legal pages, with the date they show", () => {
    const dated = entries.filter((entry) => entry.lastModified);
    expect(dated.map((entry) => new URL(entry.url).pathname)).toEqual([
      "/privacy",
      "/terms",
      "/refunds",
    ]);
    for (const entry of dated) expect(entry.lastModified).toBe(LEGAL_LAST_UPDATED);
  });
});

describe("robots", () => {
  const result = robots();

  it("allows crawling but keeps out the API and the account page", () => {
    expect(result.rules).toEqual({ userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard", "/account"] });
  });

  it("points crawlers at the sitemap", () => {
    expect(result.sitemap).toBe(`${appUrl()}/sitemap.xml`);
  });
});
