import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { LEGAL_LAST_UPDATED } from "@/components/site/routes";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { createUser, resetDb, setPlan } from "@/lib/auth/test-helpers";
import { createPortfolio, updatePortfolio } from "@/lib/portfolio/records";
import { sampleResume } from "@/lib/portfolio/testing";
import { absoluteUrl } from "@/lib/seo/urls";
import portfolioSitemap from "./p/sitemap";
import robots from "./robots";
import sitemap from "./sitemap";

const PRO = { plan: "pro" } as const;
const pathOf = (url: string) => new URL(url).pathname;

describe("sitemap", () => {
  const entries = sitemap();

  it("lists the indexable public pages, written as their canonical tags write them", () => {
    expect(entries.map((entry) => entry.url)).toEqual(
      ["/", "/pricing", "/privacy", "/terms", "/refunds", "/acceptable-use"].map((path) =>
        absoluteUrl(path),
      ),
    );
  });

  it("leaves out noindex pages: the studio, sign-in and the signed-in app", () => {
    const paths = entries.map((entry) => pathOf(entry.url));
    for (const path of ["/studio", "/login", "/account", "/dashboard", "/reminder"]) {
      expect(paths).not.toContain(path);
    }
  });

  it("dates only the legal pages, with the date they show", () => {
    const dated = entries.filter((entry) => entry.lastModified);
    expect(dated.map((entry) => pathOf(entry.url))).toEqual([
      "/privacy",
      "/terms",
      "/refunds",
      "/acceptable-use",
    ]);
    for (const entry of dated) expect(entry.lastModified).toBe(LEGAL_LAST_UPDATED);
  });
});

describe("robots", () => {
  const result = robots();

  it("allows crawling but keeps out the API and the signed-in pages", () => {
    expect(result.rules).toEqual({
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard", "/account"],
    });
  });

  it("points crawlers at every sitemap", () => {
    expect(result.sitemap).toEqual([absoluteUrl("/sitemap.xml"), absoluteUrl("/p/sitemap.xml")]);
  });

  it("blocks nothing a sitemap lists", () => {
    const blocked = (result.rules as { disallow: string[] }).disallow;
    const listed = [
      ...sitemap().map((entry) => pathOf(entry.url)),
      "/p/maya-chen",
      ...(result.sitemap as string[]).map(pathOf),
    ];
    for (const path of listed) {
      for (const prefix of blocked) expect(path.startsWith(prefix)).toBe(false);
    }
  });
});

describe("portfolio sitemap", () => {
  beforeEach(async () => {
    await resetDb();
  });

  async function publish(email: string, name: string, allowIndexing: boolean) {
    const user = await setPlan(await createUser(email), "pro");
    const resume = sampleResume({ basics: { ...sampleResume().basics, name } });
    await createPortfolio(user.id, { resume }, 1_000);
    await updatePortfolio(user.id, { published: true, allowIndexing }, PRO, 5_000);
    return user;
  }

  it("lists published pages that allow indexing, with when each last changed", async () => {
    await publish("maya@example.com", "Maya Chen", true);
    await publish("tom@example.com", "Tom Hale", false);
    const draft = await setPlan(await createUser("ida@example.com"), "pro");
    await createPortfolio(draft.id, { resume: sampleResume() }, 1_000);

    const entries = await portfolioSitemap();
    expect(entries).toEqual([{ url: absoluteUrl("/p/maya-chen"), lastModified: new Date(5_000) }]);
  });

  it("drops a page that went offline when its owner's plan ended", async () => {
    const owner = await publish("maya@example.com", "Maya Chen", true);
    await (await getDb()).update(users).set({ plan: "free" }).where(eq(users.id, owner.id));
    expect(await portfolioSitemap()).toEqual([]);
  });
});
