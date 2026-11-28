import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { listings } from "@/db/schema";
import { resetDb } from "@/lib/auth/test-helpers";
import { publicJobId, toMinutes } from "./codes";
import { rebuildMatchIndex } from "./match-index";
import type { RawJob } from "./parsers";
import { ottoJobUrl, publicJobById, searchPublicJobs, type PublicJob } from "./public-search";
import { refreshSkillWeights, saveJobs, syncBoards } from "./store";

const DAY = 24 * 60 * 60 * 1_000;
const NOW = Date.UTC(2026, 10, 9, 6);
const ACME = { source: "greenhouse" as const, board: "acme" };
const POST = "Build services in Go and PostgreSQL on Kubernetes.";

function raw(id: string, overrides: Partial<RawJob> = {}): RawJob {
  return {
    externalId: id,
    company: "Acme",
    title: "Backend Engineer",
    location: "Remote - Germany",
    remote: true,
    employmentType: "full_time",
    postedAt: NOW - DAY,
    validThrough: null,
    url: `https://job-boards.greenhouse.io/acme/jobs/${id}`,
    text: `${POST} Job ${id}.`,
    ...overrides,
  };
}

async function seed(list: RawJob[]) {
  const db = await getDb();
  await syncBoards(db, [{ ats: "greenhouse", token: "acme", company: "Acme" }]);
  await saveJobs(db, ACME, list, NOW, { snapshot: true });
  return db;
}

async function search(
  q: string,
  remote = false,
  page = { limit: 10, offset: 0 },
): Promise<{ jobs: PublicJob[]; total: number }> {
  return searchPublicJobs(await getDb(), { q, remote }, page, NOW);
}

const titles = async (q: string, remote = false) =>
  (await search(q, remote)).jobs.map((job) => job.title);

async function idOf(ext: string): Promise<string> {
  const db = await getDb();
  const [row] = await db.select({ id: listings.id }).from(listings).where(eq(listings.ext, ext));
  return publicJobId(row!.id);
}

describe("searchPublicJobs", () => {
  beforeEach(resetDb);

  it("matches every word against the title, company, place or skills, newest first", async () => {
    await seed([
      raw("1"),
      raw("2", {
        title: "Senior Frontend Engineer",
        location: "Berlin, Germany",
        remote: false,
        postedAt: NOW - 2 * DAY,
        text: "React and TypeScript.",
      }),
      raw("3", {
        title: "Account Executive",
        location: "Zürich, Switzerland",
        remote: false,
        postedAt: NOW - 3 * DAY,
        text: "Sell with Salesforce.",
      }),
    ]);
    expect(await titles("engineer")).toEqual(["Backend Engineer", "Senior Frontend Engineer"]);
    expect(await titles("front berlin")).toEqual(["Senior Frontend Engineer"]);
    expect(await titles("acme zurich")).toEqual(["Account Executive"]);
    expect(await titles("kubernetes")).toEqual(["Backend Engineer"]);
    expect(await titles("engineer", true)).toEqual(["Backend Engineer"]);
    expect(await titles("nurse")).toEqual([]);
    expect(await search("")).toMatchObject({ total: 3 });
  });

  it("hands out only the public fields, never the post's text", async () => {
    await seed([raw("1")]);
    const { jobs, total } = await search("backend");
    expect(total).toBe(1);
    const job = jobs[0]!;
    expect(Object.keys(job).sort()).toEqual(
      [
        "applyUrl",
        "company",
        "employmentType",
        "id",
        "location",
        "ottoUrl",
        "postedAt",
        "remote",
        "seniority",
        "skills",
        "sourceCredit",
        "title",
      ].sort(),
    );
    expect(job).toMatchObject({
      id: await idOf("1"),
      company: "Acme",
      location: "Remote - Germany",
      remote: true,
      employmentType: "full_time",
      postedAt: new Date(NOW - DAY).toISOString(),
      applyUrl: "https://job-boards.greenhouse.io/acme/jobs/1",
      sourceCredit: "via Greenhouse",
    });
    expect(job.skills).toContain("Kubernetes");
    expect(JSON.stringify(job)).not.toContain("Build services");
    const otto = new URL(job.ottoUrl);
    expect(otto.pathname).toBe("/login");
    expect(Object.fromEntries(otto.searchParams)).toEqual({
      next: `/dashboard/jobs?tailor=${job.id}`,
      utm_source: "mcp",
      utm_medium: "connector",
      utm_campaign: "otto_jobs",
    });
    expect(job.ottoUrl).toBe(ottoJobUrl(job.id));
  });

  it("leaves out Himalayas jobs, general applications and jobs first seen over 90 days ago", async () => {
    const db = await seed([
      raw("1"),
      raw("2", { title: "Data Analyst" }),
      raw("3", { title: "Product Designer" }),
    ]);
    const himalayas = "https://himalayas.app/companies/beta/jobs/qa-engineer";
    await saveJobs(
      db,
      { source: "himalayas", board: "" },
      [raw(himalayas, { company: "Beta", title: "QA Engineer", url: himalayas })],
      NOW,
      { snapshot: false },
    );
    await db
      .update(listings)
      .set({ flags: sql`${listings.flags} | 2` })
      .where(eq(listings.ext, "2"));
    await db
      .update(listings)
      .set({ posted: toMinutes(NOW - 91 * DAY), seen: toMinutes(NOW - 91 * DAY) })
      .where(eq(listings.ext, "3"));
    expect(await search("")).toMatchObject({ total: 1, jobs: [{ title: "Backend Engineer" }] });
    expect(await titles("engineer")).toEqual(["Backend Engineer"]);
    for (const ext of [himalayas, "2", "3"])
      expect(await publicJobById(db, await idOf(ext), NOW)).toBeNull();
    expect(await publicJobById(db, await idOf("1"), NOW)).toMatchObject({
      title: "Backend Engineer",
    });
  });

  it("shows an opening once, found by any copy's place, and never hands out a copy", async () => {
    const text = "Own accounts with Salesforce and HubSpot.\nThis role is based in {place}.";
    const db = await seed([
      raw("uk", {
        title: "Account Executive - London",
        location: "London, United Kingdom",
        remote: false,
        text: text.replace("{place}", "London"),
      }),
      raw("us", {
        title: "Account Executive - Remote US",
        location: "Remote · United States",
        remote: true,
        text: text.replace("{place}", "New York"),
      }),
    ]);
    await refreshSkillWeights(db, NOW);
    await rebuildMatchIndex(db, NOW);
    expect(await search("account executive")).toMatchObject({ total: 1 });
    expect((await search("london")).total).toBe(1);
    expect((await search("united states")).total).toBe(1);
    const [copy] = await db
      .select({ id: listings.id })
      .from(listings)
      .where(sql`(${listings.flags} & 16) <> 0`);
    expect(await publicJobById(db, publicJobId(copy!.id), NOW)).toBeNull();
  });

  it("caps a page at 10 jobs and skips at most 100", async () => {
    await seed(
      Array.from({ length: 103 }, (_, n) =>
        raw(String(n), { title: `Engineer ${n}`, postedAt: NOW - (n + 1) * 60_000 }),
      ),
    );
    const wide = await search("", false, { limit: 50, offset: 0 });
    expect(wide.total).toBe(103);
    expect(wide.jobs.map((job) => job.title)).toEqual(
      Array.from({ length: 10 }, (_, n) => `Engineer ${n}`),
    );
    const deep = await search("", false, { limit: 10, offset: 5_000 });
    expect(deep.jobs.map((job) => job.title)).toEqual([
      "Engineer 100",
      "Engineer 101",
      "Engineer 102",
    ]);
    expect(
      (await search("", false, { limit: -1, offset: -1 })).jobs.map((job) => job.title),
    ).toEqual(["Engineer 0"]);
  });
});

describe("publicJobById", () => {
  beforeEach(resetDb);

  it("reads an open job by its public id and refuses anything else", async () => {
    const db = await seed([raw("1")]);
    const id = await idOf("1");
    expect(await publicJobById(db, ` ${id} `, NOW)).toMatchObject({
      id,
      title: "Backend Engineer",
      sourceCredit: "via Greenhouse",
    });
    expect(await publicJobById(db, "not-an-id", NOW)).toBeNull();
    expect(await publicJobById(db, "6b0f8d4e-6f2a-4c55-9f3e-2b7a1c9d0e11", NOW)).toBeNull();
    expect(await publicJobById(db, publicJobId(999_999), NOW)).toBeNull();
  });
});
