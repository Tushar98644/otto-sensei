import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { LEGAL_LAST_UPDATED } from "@/components/site/routes";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { createUser, resetDb, setPlan } from "@/lib/auth/test-helpers";
import { createPortfolio, updatePortfolio } from "@/lib/portfolio/records";
import { sampleResume } from "@/lib/portfolio/testing";
import { COMPETITORS_CHECKED } from "@/lib/seo-pages/compare";
import { SEO_PAGES_UPDATED } from "@/lib/seo-pages/paths";
import { absoluteUrl } from "@/lib/seo/urls";
import { GET } from "./llms.txt/route";
import portfolioSitemap from "./p/sitemap";
import robots from "./robots";
import sitemap from "./sitemap";

const PRO = { plan: "pro" } as const;
const pathOf = (url: string) => new URL(url).pathname;

const ATS_SYSTEMS = [
  "greenhouse",
  "ashby",
  "workday",
  "icims",
  "taleo",
  "successfactors",
  "smartrecruiters",
  "workable",
  "jobvite",
  "teamtailor",
];
// Guides with one sourced note: served, but kept out of search until they have more.
const THIN_GUIDES = ["/ats/lever", "/ats/bamboohr", "/ats/recruitee"];
const COMPARISONS = ["jobscan", "rezi", "kickresume"];
const GUIDES = [
  "/resume-templates",
  "/ats",
  ...ATS_SYSTEMS.map((id) => `/ats/${id}`),
  "/compare",
  ...COMPARISONS.map((slug) => `/compare/${slug}`),
];
const LEGAL = ["/privacy", "/terms", "/refunds", "/acceptable-use"];
const APP = fileURLToPath(new URL(".", import.meta.url));

// The page file Next serves for a path, dynamic segments included.
function pageFileFor(path: string): string | undefined {
  const parts = path.split("/").filter(Boolean);
  const candidates = [
    join(APP, "(marketing)", ...parts, "page.tsx"),
    join(APP, "(marketing)", ...parts.slice(0, -1), "[system]", "page.tsx"),
    join(APP, "(marketing)", ...parts.slice(0, -1), "[competitor]", "page.tsx"),
  ];
  return candidates.find((file) => existsSync(file));
}

describe("sitemap", () => {
  const entries = sitemap();

  it("lists the indexable public pages, written as their canonical tags write them", () => {
    expect(entries.map((entry) => entry.url)).toEqual(
      ["/", "/pricing", "/job-match", ...GUIDES, ...LEGAL].map((path) => absoluteUrl(path)),
    );
  });

  it("lists each page once, and every guide and comparison has a page to serve it", () => {
    const paths = entries.map((entry) => pathOf(entry.url));
    expect(new Set(paths).size).toBe(paths.length);
    for (const path of [...GUIDES, ...THIN_GUIDES]) expect(pageFileFor(path), path).toBeDefined();
  });

  it("leaves out the guides kept out of search", () => {
    const paths = entries.map((entry) => pathOf(entry.url));
    for (const path of THIN_GUIDES) expect(paths).not.toContain(path);
  });

  it("leaves out noindex pages: the studio, sign-in and the signed-in app", () => {
    const paths = entries.map((entry) => pathOf(entry.url));
    for (const path of ["/studio", "/login", "/account", "/dashboard", "/reminder"]) {
      expect(paths).not.toContain(path);
    }
  });

  it("dates the guides and legal pages with the date their content last changed", () => {
    const dated = entries.filter((entry) => entry.lastModified);
    expect(dated.map((entry) => pathOf(entry.url))).toEqual([...GUIDES, ...LEGAL]);
    for (const entry of dated) {
      const path = pathOf(entry.url);
      const day = LEGAL.includes(path)
        ? LEGAL_LAST_UPDATED
        : path.startsWith("/compare")
          ? COMPETITORS_CHECKED
          : SEO_PAGES_UPDATED;
      expect(entry.lastModified, path).toBe(day);
    }
  });
});

describe("llms.txt", () => {
  it("serves the site summary as plain text, linking the sitemap's guides", async () => {
    const response = GET();
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    const text = await response.text();
    expect(text.startsWith("# Otto Sensei\n")).toBe(true);
    for (const path of GUIDES) expect(text).toContain(`(${absoluteUrl(path)})`);
    for (const path of THIN_GUIDES) expect(text).not.toContain(`(${absoluteUrl(path)})`);
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
