import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { LEGAL_LAST_UPDATED, PRIVACY_LAST_UPDATED, ROUTES } from "@/components/site/routes";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { createUser, resetDb, setPlan } from "@/lib/auth/test-helpers";
import { createPortfolio, updatePortfolio } from "@/lib/portfolio/records";
import { sampleResume } from "@/lib/portfolio/testing";
import { COMPETITORS } from "@/lib/seo-pages/compare";
import { ROLE_EXAMPLES } from "@/lib/seo-pages/examples";
import { PRODUCT_PAGES_UPDATED, SEO_PAGES_UPDATED } from "@/lib/seo-pages/paths";
import { AI_CRAWLERS } from "@/lib/seo/crawlers";
import { absoluteUrl } from "@/lib/seo/urls";
import { GET as getFullText } from "./llms-full.txt/route";
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
const COMPARISONS = [
  "jobscan",
  "rezi",
  "kickresume",
  "resume-io",
  "enhancv",
  "novoresume",
  "zety",
  "teal",
  "canva",
];
const EXAMPLES = [
  "software-engineer",
  "fresher",
  "data-analyst",
  "frontend-developer",
  "backend-developer",
  "data-scientist",
  "product-manager",
  "ui-ux-designer",
  "digital-marketing",
  "business-development",
  "hr",
  "customer-support",
  "data-engineer",
  "devops-engineer",
  "qa-engineer",
  "account-executive",
  "marketing-manager",
  "graphic-designer",
  "project-manager",
  "business-analyst",
  "financial-analyst",
  "accountant",
  "operations-manager",
  "administrative-assistant",
];
const TOOLS = [
  "/cover-letter-generator",
  "/job-application-tracker",
  "/interview-prep",
  "/portfolio-website-builder",
];
const GUIDES = [
  "/resume-builder",
  ...TOOLS,
  "/resume-examples",
  ...EXAMPLES.map((slug) => `/resume-examples/${slug}`),
  "/resume-templates",
  "/ats",
  ...ATS_SYSTEMS.map((id) => `/ats/${id}`),
  "/compare",
  ...COMPARISONS.map((slug) => `/compare/${slug}`),
];
const LEGAL = ["/privacy", "/terms", "/refunds", "/acceptable-use"];
const PRODUCT = ["/", "/pricing", "/job-match", "/resume-builder", ...TOOLS];
const APP = fileURLToPath(new URL(".", import.meta.url));

// The page file Next serves for a path, dynamic segments included.
function pageFileFor(path: string): string | undefined {
  const parts = path.split("/").filter(Boolean);
  const candidates = [
    join(APP, "[lang]", "(marketing)", ...parts, "page.tsx"),
    join(APP, "[lang]", "(marketing)", ...parts.slice(0, -1), "[system]", "page.tsx"),
    join(APP, "[lang]", "(marketing)", ...parts.slice(0, -1), "[competitor]", "page.tsx"),
    join(APP, "[lang]", "(marketing)", ...parts.slice(0, -1), "[role]", "page.tsx"),
  ];
  return candidates.find((file) => existsSync(file));
}

const SITEMAP = await sitemap();
const TRANSLATED = /^\/(es|pt-br|fr|de)(\/|$)/;

describe("sitemap", () => {
  const entries = SITEMAP.filter((entry) => !TRANSLATED.test(pathOf(entry.url)));

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

  it("lists each translated page with every language it's in, English as x-default", () => {
    const languages = (path: string) =>
      SITEMAP.find((entry) => pathOf(entry.url) === path)?.alternates?.languages;
    const pricing = {
      en: absoluteUrl("/pricing"),
      es: absoluteUrl("/es/pricing"),
      "pt-BR": absoluteUrl("/pt-br/pricing"),
      fr: absoluteUrl("/fr/pricing"),
      de: absoluteUrl("/de/pricing"),
      "x-default": absoluteUrl("/pricing"),
    };
    expect(languages("/pricing")).toEqual(pricing);
    expect(languages("/es/pricing")).toEqual(pricing);
    expect(languages("/de")).toMatchObject({ en: absoluteUrl("/"), de: absoluteUrl("/de") });
    const translated = SITEMAP.map((entry) => pathOf(entry.url)).filter((path) =>
      TRANSLATED.test(path),
    );
    for (const prefix of ["/es", "/pt-br", "/fr", "/de"]) {
      expect(translated).toContain(`${prefix}/privacy`);
      expect(translated).toContain(`${prefix}/job-match`);
    }
  });

  it("never lists a page in a language it isn't published in", () => {
    const paths = SITEMAP.map((entry) => pathOf(entry.url));
    for (const path of paths.filter((path) => TRANSLATED.test(path))) {
      expect(path).not.toMatch(/\/(compare|ats|resume-examples|resume-templates|login)(\/|$)/);
    }
    for (const slug of COMPARISONS) {
      expect(
        SITEMAP.find((entry) => pathOf(entry.url) === `/compare/${slug}`)?.alternates,
      ).toBeUndefined();
    }
  });

  it("dates every page with the day its content last changed", () => {
    for (const entry of entries) {
      const path = pathOf(entry.url);
      const example = ROLE_EXAMPLES.find((item) => path === `/resume-examples/${item.slug}`);
      const competitor = COMPETITORS.find((item) => path === `/compare/${item.slug}`);
      const day = LEGAL.includes(path)
        ? path === ROUTES.privacy
          ? PRIVACY_LAST_UPDATED
          : LEGAL_LAST_UPDATED
        : PRODUCT.includes(path)
          ? PRODUCT_PAGES_UPDATED
          : example
            ? example.updated
            : competitor
              ? competitor.checked
              : path === "/resume-examples"
                ? ROLE_EXAMPLES.map((item) => item.updated)
                    .sort()
                    .at(-1)
                : path === "/compare"
                  ? COMPETITORS.map((item) => item.checked)
                      .sort()
                      .at(-1)
                  : SEO_PAGES_UPDATED;
      expect(entry.lastModified, path).toBe(day);
      expect(String(entry.lastModified), path).toMatch(/^\d{4}-\d{2}-\d{2}$/);
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
    expect(text).toContain(`(${absoluteUrl("/llms-full.txt")})`);
  });
});

describe("llms-full.txt", () => {
  it("serves the full text as plain text, with every indexed guide and comparison page", async () => {
    const response = getFullText();
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    const text = await response.text();
    expect(text.startsWith("# Otto Sensei: full text\n")).toBe(true);
    for (const path of GUIDES) expect(text).toContain(`Page: ${absoluteUrl(path)}\n`);
    for (const path of THIN_GUIDES) expect(text).not.toContain(absoluteUrl(path));
  });
});

describe("robots", () => {
  const result = robots();
  const rules = result.rules as {
    userAgent: string | string[];
    allow: string;
    disallow: string[];
  }[];
  const KEPT_OUT = ["/api/", "/dashboard", "/account"];

  it("allows crawling but keeps out the API and the signed-in pages", () => {
    expect(rules[0]).toEqual({ userAgent: "*", allow: "/", disallow: KEPT_OUT });
  });

  it("names the main AI crawlers, with the same rules as everyone else", () => {
    for (const bot of [
      "GPTBot",
      "OAI-SearchBot",
      "ChatGPT-User",
      "ClaudeBot",
      "PerplexityBot",
      "Google-Extended",
      "Applebot-Extended",
    ]) {
      expect(AI_CRAWLERS).toContain(bot);
    }
    expect(rules[1]).toEqual({ userAgent: [...AI_CRAWLERS], allow: "/", disallow: KEPT_OUT });
    expect(rules).toHaveLength(2);
  });

  it("points crawlers at every sitemap", () => {
    expect(result.sitemap).toEqual([absoluteUrl("/sitemap.xml"), absoluteUrl("/p/sitemap.xml")]);
  });

  it("blocks nothing a sitemap lists", async () => {
    const blocked = rules.flatMap((rule) => rule.disallow);
    const listed = [
      ...(await sitemap()).map((entry) => pathOf(entry.url)),
      "/p/maya-chen",
      "/llms.txt",
      "/llms-full.txt",
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
