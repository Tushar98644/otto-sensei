import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { LEGAL_LAST_UPDATED } from "@/components/site/routes";
import { getDb } from "@/db/client";
import { jobs, users } from "@/db/schema";
import { createUser, resetDb, setPlan } from "@/lib/auth/test-helpers";
import type { RawJob } from "@/lib/job-feed/parsers";
import { JOB_SITEMAP_PARTS } from "@/lib/job-feed/sitemap";
import { saveJobs, syncBoards } from "@/lib/job-feed/store";
import { createPortfolio, updatePortfolio } from "@/lib/portfolio/records";
import { sampleResume } from "@/lib/portfolio/testing";
import { absoluteUrl } from "@/lib/seo/urls";
import jobSitemap, { generateSitemaps } from "./(marketing)/jobs/sitemap";
import portfolioSitemap from "./p/sitemap";
import robots from "./robots";
import sitemap from "./sitemap";

const PRO = { plan: "pro" } as const;
const DAY = 24 * 60 * 60 * 1000;
const pathOf = (url: string) => new URL(url).pathname;

describe("sitemap", () => {
  const entries = sitemap();

  it("lists the indexable public pages, written as their canonical tags write them", () => {
    expect(entries.map((entry) => entry.url)).toEqual(
      ["/", "/jobs", "/pricing", "/privacy", "/terms", "/refunds"].map((path) => absoluteUrl(path)),
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
    expect(dated.map((entry) => pathOf(entry.url))).toEqual(["/privacy", "/terms", "/refunds"]);
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
    expect(result.sitemap).toEqual([
      absoluteUrl("/sitemap.xml"),
      absoluteUrl("/p/sitemap.xml"),
      ...Array.from({ length: JOB_SITEMAP_PARTS }, (_, part) =>
        absoluteUrl(`/jobs/sitemap/${part}.xml`),
      ),
    ]);
  });

  it("blocks nothing a sitemap lists", () => {
    const blocked = (result.rules as { disallow: string[] }).disallow;
    const listed = [
      ...sitemap().map((entry) => pathOf(entry.url)),
      "/p/maya-chen",
      "/jobs/0b7c5d1e-2f3a-4b5c-8d9e-0f1a2b3c4d5e",
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
    expect(entries).toEqual([
      { url: absoluteUrl("/p/maya-chen"), lastModified: new Date(5_000) },
    ]);
  });

  it("drops a page that went offline when its owner's plan ended", async () => {
    const owner = await publish("maya@example.com", "Maya Chen", true);
    await (await getDb()).update(users).set({ plan: "free" }).where(eq(users.id, owner.id));
    expect(await portfolioSitemap()).toEqual([]);
  });
});

describe("job sitemaps", () => {
  beforeEach(async () => {
    await resetDb();
  });

  function raw(id: string, overrides: Partial<RawJob> = {}): RawJob {
    return {
      externalId: id,
      company: "Acme",
      title: `Backend Engineer ${id}`,
      location: "Remote - Germany",
      remote: true,
      employmentType: "full_time",
      postedAt: Date.now() - DAY,
      validThrough: null,
      url: `https://job-boards.greenhouse.io/acme/jobs/${id}`,
      text: "Build services in TypeScript, Node.js and PostgreSQL.",
      ...overrides,
    };
  }

  async function allParts() {
    const parts = generateSitemaps();
    const lists = await Promise.all(
      parts.map(({ id }) => jobSitemap({ id: Promise.resolve(String(id)) })),
    );
    return { parts, lists };
  }

  it("lists each open job that has a page here exactly once, in the part its id falls in", async () => {
    const db = await getDb();
    const now = Date.now();
    await syncBoards(
      db,
      [
        { ats: "greenhouse", token: "acme", company: "Acme" },
        { ats: "workable", token: "blue", company: "Blue" },
      ],
      now,
    );
    await saveJobs(
      db,
      { source: "greenhouse", board: "acme" },
      ["1", "2", "3", "4", "5", "6"].map((id) => raw(id)),
      now,
      { snapshot: true },
    );
    // Workable's terms don't allow a page here: its jobs only link out.
    await saveJobs(
      db,
      { source: "workable", board: "blue" },
      [raw("w1", { company: "Blue", title: "Designer", url: "https://apply.workable.com/blue/j/w1" })],
      now,
      { snapshot: true },
    );
    const rows = await db.select({ id: jobs.id, source: jobs.source }).from(jobs);
    const greenhouse = rows.filter((row) => row.source === "greenhouse").map((row) => row.id);
    const [closed, ...open] = greenhouse;
    await db
      .update(jobs)
      .set({ closedAt: now, closeReason: "gone" })
      .where(eq(jobs.id, closed!));

    const { parts, lists } = await allParts();
    expect(parts.map((part) => part.id)).toEqual([0, 1, 2, 3]);
    const listed = lists.flat().map((entry) => pathOf(entry.url));
    expect(listed.sort()).toEqual(open.map((id) => `/jobs/${id}`).sort());
    // Split by the id's first hex digit, four digits per part.
    lists.forEach((list, part) => {
      for (const entry of list) {
        const digit = parseInt(pathOf(entry.url).slice("/jobs/".length, "/jobs/".length + 1), 16);
        expect(Math.floor(digit / 4)).toBe(part);
        expect(entry.lastModified).toBeInstanceOf(Date);
      }
    });
  });

  it("answers an unknown part with an empty list", async () => {
    expect(await jobSitemap({ id: Promise.resolve("9") })).toEqual([]);
    expect(await jobSitemap({ id: Promise.resolve("x") })).toEqual([]);
  });
});
