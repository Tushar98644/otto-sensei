import type { PGlite } from "@electric-sql/pglite";
import { eq, getTableColumns, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { beforeEach, describe, expect, it } from "vitest";
import { getDb, type Db } from "@/db/client";
import * as schema from "@/db/schema";
import { applications, jobBoards, listings, savedJobs, titles } from "@/db/schema";
import { createUser, resetDb } from "@/lib/auth/test-helpers";
import { listingIdOf, publicJobId } from "./codes";
import { rebuildMatchIndex } from "./match-index";
import type { RawJob } from "./parsers";
import { jobCounts, keptJob, listingRows, listSavedJobs, saveJob, skillWeights } from "./records";
import { JOB_LIMITS } from "./normalize";
import {
  boardFailed,
  refreshSkillWeights,
  saveJobs,
  STORE_LIMITS,
  storedHashes,
  syncBoards,
  tidyJobs,
} from "./store";

const DAY = 24 * 60 * 60 * 1_000;
const NOW = Date.UTC(2026, 10, 8, 6);

function raw(id: string, overrides: Partial<RawJob> = {}): RawJob {
  return {
    externalId: id,
    company: "Acme",
    title: `Backend Engineer ${id}`,
    location: "Remote - Germany",
    remote: true,
    employmentType: "full_time",
    postedAt: NOW - DAY,
    validThrough: null,
    url: `https://job-boards.greenhouse.io/acme/jobs/${id}`,
    text: "Build services in Go and PostgreSQL on Kubernetes. You have 3+ years of experience.",
    ...overrides,
  };
}

const ACME = { source: "greenhouse" as const, board: "acme" };
const SEEDS = [{ ats: "greenhouse" as const, token: "acme", company: "Acme" }];

async function rows() {
  const db = await getDb();
  return db
    .select({ ext: listings.ext, board: listings.board, missed: listings.missed })
    .from(listings)
    .orderBy(listings.ext);
}

async function jobOf(ext: string) {
  const db = await getDb();
  const [row] = await db.select({ id: listings.id }).from(listings).where(eq(listings.ext, ext));
  const [job] = row ? await listingRows(db, [row.id]) : [];
  return job;
}

describe("job store", () => {
  beforeEach(async () => {
    await resetDb();
    await syncBoards(await getDb(), SEEDS);
  });

  it("adds new jobs once and only marks unchanged ones as seen", async () => {
    const db = await getDb();
    const first = await saveJobs(db, ACME, [raw("1"), raw("2"), raw("1")], NOW, { snapshot: true });
    expect(first).toMatchObject({ added: 2, updated: 0, seen: 0 });
    const again = await saveJobs(
      db,
      ACME,
      [raw("1"), raw("2", { title: "Senior Backend Engineer 2" })],
      NOW + DAY,
      { snapshot: true },
    );
    expect(again).toMatchObject({ added: 0, updated: 1, seen: 2 });
    expect(await jobOf("2")).toMatchObject({
      seniority: "senior",
      title: "Senior Backend Engineer 2",
      firstSeenAt: NOW,
      url: "https://job-boards.greenhouse.io/acme/jobs/2",
      keywords: ["Go", "PostgreSQL", "Kubernetes"],
      minYears: 3,
      closed: false,
    });
    const [board] = await db.select().from(jobBoards).where(eq(jobBoards.token, "acme"));
    expect(board).toMatchObject({
      lastStatus: "ok",
      openJobs: 2,
      lastFetchedAt: NOW + DAY,
      urlTemplate: "https://job-boards.greenhouse.io/acme/jobs/{id}",
    });
  });

  it("keeps a link only when the board's pattern doesn't make it, and a title only when written otherwise", async () => {
    const db = await getDb();
    await saveJobs(
      db,
      ACME,
      [
        raw("1"),
        raw("2"),
        raw("3", { url: "https://acme.example/careers/3" }),
        raw("4", { title: "backend engineer 1", location: "Berlin, Germany" }),
      ],
      NOW,
      { snapshot: true },
    );
    const stored = await db
      .select({ ext: listings.ext, url: listings.url, titleText: listings.titleText })
      .from(listings)
      .orderBy(listings.ext);
    expect(stored).toEqual([
      { ext: "1", url: "", titleText: "" },
      { ext: "2", url: "", titleText: "" },
      { ext: "3", url: "https://acme.example/careers/3", titleText: "" },
      { ext: "4", url: "", titleText: "backend engineer 1" },
    ]);
    expect((await jobOf("3"))?.url).toBe("https://acme.example/careers/3");
    expect((await jobOf("4"))?.title).toBe("backend engineer 1");
    expect(await db.select({ text: titles.text }).from(titles).orderBy(titles.text)).toEqual([
      { text: "Backend Engineer 1" },
      { text: "Backend Engineer 2" },
      { text: "Backend Engineer 3" },
    ]);
  });

  it("rewrites changed jobs to exactly what a fresh read stores, one statement per chunk", async () => {
    const base = await getDb();
    const statements: string[] = [];
    const db: Db = drizzle((base as unknown as { $client: PGlite }).$client, {
      schema,
      logger: { logQuery: (query) => statements.push(query) },
    });
    const posts = Array.from({ length: 5 }, (_, i) =>
      raw(String(i), {
        text: `Ship C++, C# and Node.js services. Job ${i} pays "well"; it's remote.`,
      }),
    );
    // Every column a read writes; seen and missed are kept from the first read.
    const content = Object.fromEntries(
      Object.entries(getTableColumns(listings)).filter(
        ([key]) => key !== "seen" && key !== "missed",
      ),
    ) as Omit<ReturnType<typeof getTableColumns<typeof listings>>, "seen" | "missed">;
    await saveJobs(db, ACME, posts, NOW, { snapshot: true });
    const fresh = await db.select(content).from(listings).orderBy(listings.ext);
    await db.update(listings).set({ skills: [], grp: 0, flags: 0, hash: 1, facts: "" });

    const chunk = STORE_LIMITS.writeChunk;
    Object.assign(STORE_LIMITS, { writeChunk: 2 });
    statements.length = 0;
    try {
      expect(await saveJobs(db, ACME, posts, NOW + DAY, { snapshot: true })).toMatchObject({
        added: 0,
        updated: 5,
        seen: 5,
      });
    } finally {
      Object.assign(STORE_LIMITS, { writeChunk: chunk });
    }
    expect(statements.filter((query) => query.includes("from (values")).length).toBe(3);
    expect(await db.select(content).from(listings).orderBy(listings.ext)).toEqual(fresh);
  });

  it("keeps the rebuild's marks when a read rewrites a job", async () => {
    const db = await getDb();
    await saveJobs(db, ACME, [raw("1")], NOW, { snapshot: true });
    await rebuildMatchIndex(db, NOW);
    await saveJobs(db, ACME, [raw("1", { title: "Senior Backend Engineer 1" })], NOW, {
      snapshot: true,
    });
    const [row] = await db.select({ flags: listings.flags }).from(listings);
    expect(row!.flags & 4).toBe(4);
  });

  it("leaves a board's row alone while its company name stays the same", async () => {
    const db = await getDb();
    const version = async () =>
      (
        await db
          .select({ xmin: sql<string>`xmin::text` })
          .from(jobBoards)
          .where(eq(jobBoards.token, "acme"))
      )[0]?.xmin;
    const first = await version();
    await syncBoards(db, SEEDS);
    expect(await version()).toBe(first);
    await syncBoards(db, [{ ...SEEDS[0]!, company: "Acme Labs" }]);
    expect(await version()).not.toBe(first);
  });

  it("deletes a job missing from two reads in a row, and gives it the same id if it comes back", async () => {
    const db = await getDb();
    await saveJobs(db, ACME, [raw("1"), raw("2")], NOW, { snapshot: true });
    const id = (await jobOf("2"))!.id;
    await saveJobs(db, ACME, [raw("1")], NOW + DAY, { snapshot: true });
    expect((await rows()).find((row) => row.ext === "2")).toMatchObject({ missed: 1 });
    const third = await saveJobs(db, ACME, [raw("1")], NOW + 2 * DAY, { snapshot: true });
    expect(third.closed).toBe(1);
    expect((await rows()).map((row) => row.ext)).toEqual(["1"]);
    const back = await saveJobs(db, ACME, [raw("1"), raw("2")], NOW + 3 * DAY, { snapshot: true });
    expect(back).toMatchObject({ added: 1, closed: 0 });
    expect((await jobOf("2"))!.id).toBe(id);
    expect((await rows()).find((row) => row.ext === "1")).toMatchObject({ missed: 0 });
  });

  it("keeps one copy of an opening listed by a board and a feed, the board's", async () => {
    const db = await getDb();
    const feedCopy = raw("https://himalayas.app/companies/acme/jobs/backend", {
      title: "Backend Engineer 1",
      location: "Remote · Germany",
    });
    expect(
      await saveJobs(db, { source: "himalayas", board: "" }, [feedCopy], NOW, { snapshot: false }),
    ).toMatchObject({ added: 1 });
    expect(await saveJobs(db, ACME, [raw("1")], NOW, { snapshot: true })).toMatchObject({
      added: 1,
      closed: 1,
    });
    const repeat = raw("https://himalayas.app/companies/acme/jobs/backend-2", {
      title: "Backend Engineer 1",
      location: "Germany, remote",
    });
    expect(
      await saveJobs(db, { source: "himalayas", board: "" }, [repeat], NOW, { snapshot: false }),
    ).toMatchObject({ added: 0, duplicates: 1 });
    const left = await listingRows(
      db,
      (await db.select({ id: listings.id }).from(listings)).map((row) => row.id),
    );
    expect(left.map((row) => row.source)).toEqual(["greenhouse"]);
  });

  it("keeps a board's jobs of any age while the board lists them", async () => {
    const db = await getDb();
    const stats = await saveJobs(db, ACME, [raw("old", { postedAt: NOW - 200 * DAY })], NOW, {
      snapshot: true,
    });
    expect(stats.added).toBe(1);
    expect(await tidyJobs(db, NOW + DAY)).toMatchObject({ aged: 0 });
  });

  it("keeps no text for a job its source can be read again from, and a feed's text", async () => {
    const db = await getDb();
    const text = "Run the warehouse floor and train new pickers every week.\n".repeat(150);
    await saveJobs(db, ACME, [raw("board", { text })], NOW, { snapshot: true });
    await saveJobs(db, { source: "remoteok", board: "" }, [raw("feed", { text })], NOW, {
      snapshot: false,
    });
    const stored = await db
      .select({ ext: listings.ext, post: listings.post })
      .from(listings)
      .orderBy(listings.ext);
    expect(stored[0]).toMatchObject({ ext: "board", post: "" });
    expect(stored[1]!.post.length).toBeGreaterThan(5_000);
    expect(stored[1]!.post.length).toBeLessThanOrEqual(JOB_LIMITS.feedDescriptionChars);
  });

  it("keeps work-rights facts and places from the post instead of its text", async () => {
    const db = await getDb();
    await saveJobs(
      db,
      ACME,
      [
        raw("1", {
          location: "Remote",
          text: "This role is open to candidates based in the United Kingdom only. We do not sponsor visas.",
        }),
      ],
      NOW,
      { snapshot: true },
    );
    const [row] = await db
      .select({ facts: listings.facts, places: listings.places })
      .from(listings);
    expect(row).toEqual({ facts: "PGB;!m;R0GB;Un::", places: "GB" });
  });

  it("keeps a Workday job's path under its site, and finds its stored hash by the list's id", async () => {
    const db = await getDb();
    const site = { source: "workday" as const, board: "acme.wd1/Careers" };
    const job = raw("acme/Careers/job/London/Engineer_R1", {
      url: "https://acme.wd1.myworkdayjobs.com/Careers/job/London/Engineer_R1",
      hashKey: "listing",
    });
    await saveJobs(db, site, [job], NOW, { snapshot: true });
    expect((await rows())[0]?.ext).toBe("/job/London/Engineer_R1");
    expect((await jobOf("/job/London/Engineer_R1"))?.url).toBe(job.url);
    const hashes = await storedHashes(db, site, [job.externalId, "acme/Careers/job/x_R2"]);
    expect([...hashes.keys()]).toEqual([job.externalId]);
  });

  it("skips feed jobs past their end date or older than 30 days", async () => {
    const db = await getDb();
    const stats = await saveJobs(
      db,
      { source: "remoteok", board: "" },
      [
        raw("old", { postedAt: NOW - 40 * DAY }),
        raw("ended", { validThrough: NOW - DAY }),
        raw("new"),
      ],
      NOW,
      { snapshot: false },
    );
    expect(stats.added).toBe(1);
  });

  it("deletes a board's jobs after two 404s in a row", async () => {
    const db = await getDb();
    await saveJobs(db, ACME, [raw("1")], NOW, { snapshot: true });
    expect(await boardFailed(db, "greenhouse", "acme", "not_found", NOW + DAY)).toBe(0);
    expect(await boardFailed(db, "greenhouse", "acme", "not_found", NOW + 2 * DAY)).toBe(1);
    expect(await rows()).toEqual([]);
  });

  it("deletes the jobs of a board taken off the seed list", async () => {
    const db = await getDb();
    await saveJobs(db, ACME, [raw("1")], NOW, { snapshot: true });
    expect(await syncBoards(db, [])).toBe(1);
    expect(await rows()).toEqual([]);
  });

  it("expires and ages out jobs, and a saved one stays saved as it was", async () => {
    const db = await getDb();
    const user = await createUser("maya@example.com");
    await saveJobs(db, ACME, [raw("1", { validThrough: NOW + DAY }), raw("2")], NOW, {
      snapshot: true,
    });
    await saveJobs(
      db,
      { source: "remoteok", board: "" },
      [raw("3", { postedAt: NOW - 29 * DAY })],
      NOW,
      { snapshot: false },
    );
    const one = await jobOf("1");
    expect(await saveJob(db, user.id, one!.id, NOW)).toBe("saved");

    expect(await tidyJobs(db, NOW + 2 * DAY)).toMatchObject({ expired: 1, aged: 1 });
    expect((await rows()).map((row) => row.ext)).toEqual(["2"]);
    const [saved] = await listSavedJobs(db, user.id);
    expect(saved).toMatchObject({
      id: one!.id,
      title: "Backend Engineer 1",
      company: "Acme",
      url: "https://job-boards.greenhouse.io/acme/jobs/1",
      keywords: ["Go", "PostgreSQL", "Kubernetes"],
      closed: true,
      savedAt: NOW,
    });
    expect(await keptJob(db, user.id, one!.id)).toMatchObject({
      title: "Backend Engineer 1",
      closed: true,
      description: "",
    });
  });

  it("keeps an application's job once the job is gone", async () => {
    const db = await getDb();
    const user = await createUser("maya@example.com");
    await saveJobs(db, ACME, [raw("1")], NOW, { snapshot: true });
    const job = await jobOf("1");
    await db.insert(applications).values({
      id: crypto.randomUUID(),
      userId: user.id,
      company: "Acme",
      jobId: job!.id,
      job: { ...job!, keywords: job!.keywords },
      appliedAt: NOW,
      statusChangedAt: NOW,
      createdAt: NOW,
      updatedAt: NOW,
    });
    await boardFailed(db, "greenhouse", "acme", "not_found", NOW);
    await boardFailed(db, "greenhouse", "acme", "not_found", NOW);
    expect(await rows()).toEqual([]);
    expect(await keptJob(db, user.id, job!.id)).toMatchObject({
      title: "Backend Engineer 1",
      closed: true,
    });
    expect(await db.select({ jobId: savedJobs.jobId }).from(savedJobs)).toEqual([]);
  });

  it("trims the oldest rows past the cap", async () => {
    const db = await getDb();
    const many = Array.from({ length: 5 }, (_, i) =>
      raw(String(i), { postedAt: NOW - (10 - i) * DAY }),
    );
    await saveJobs(db, ACME, many, NOW, { snapshot: true });
    const cap = STORE_LIMITS.maxRows;
    Object.assign(STORE_LIMITS, { maxRows: 3 });
    try {
      expect((await tidyJobs(db, NOW)).trimmed).toBe(2);
    } finally {
      Object.assign(STORE_LIMITS, { maxRows: cap });
    }
    expect((await rows()).map((row) => row.ext)).toEqual(["2", "3", "4"]);
  });

  it("weighs skills by how rare they are among open jobs", async () => {
    const db = await getDb();
    const old = raw("old", {
      title: "Elixir Engineer",
      text: "Elixir, Phoenix and PostgreSQL.",
      postedAt: NOW - 60 * DAY,
    });
    const fresh = Array.from({ length: 6 }, (_, i) =>
      raw(`new${i}`, {
        title: `Engineer ${i}`,
        text: "JavaScript and PostgreSQL.",
        postedAt: NOW - i * 60_000,
      }),
    );
    await saveJobs(db, ACME, [old, ...fresh], NOW, { snapshot: true });
    expect(await refreshSkillWeights(db, NOW)).toBeGreaterThan(0);
    const weights = await skillWeights(db);
    expect(weights.get("Elixir")).toBeCloseTo(Math.log(7), 5);
    expect(weights.get("PostgreSQL")).toBeCloseTo(0.05, 5);
  });

  it("counts open jobs for 90 days from posting, or from the first read if that came first, never filler posts", async () => {
    const db = await getDb();
    await saveJobs(
      db,
      ACME,
      [
        raw("old", { postedAt: NOW - 100 * DAY }),
        raw("recent", { postedAt: NOW - 80 * DAY }),
        raw("undated", { postedAt: null }),
        raw("redated", { postedAt: NOW - DAY }),
        raw("pool", { title: "Account Executive — Future Opportunities" }),
      ],
      NOW,
      { snapshot: true },
    );
    await db
      .update(listings)
      .set({ seen: sql`${listings.seen} - ${95 * 24 * 60}` })
      .where(eq(listings.ext, "redated"));
    expect((await jobCounts(db, NOW)).open).toBe(2);
  });

  it("gives each job a public id in the shape of a UUID", async () => {
    const db = await getDb();
    await saveJobs(db, ACME, [raw("1")], NOW, { snapshot: true });
    const [row] = await db.select({ id: listings.id }).from(listings);
    const id = publicJobId(row!.id);
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(listingIdOf(id)).toBe(row!.id);
  });
});
