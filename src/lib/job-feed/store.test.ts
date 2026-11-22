import type { PGlite } from "@electric-sql/pglite";
import { and, desc, eq, getTableColumns, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { beforeEach, describe, expect, it } from "vitest";
import { getDb, type Db } from "@/db/client";
import * as schema from "@/db/schema";
import { applications, jobBoards, jobs, savedJobs } from "@/db/schema";
import { createUser, resetDb } from "@/lib/auth/test-helpers";
import type { RawJob } from "./parsers";
import {
  filterConditions,
  jobCounts,
  matchableConditions,
  matchCandidates,
  saveJob,
  skillWeights,
} from "./records";
import { JOB_LIMITS } from "./normalize";
import {
  boardFailed,
  refreshSkillWeights,
  saveJobs,
  STORE_LIMITS,
  syncBoards,
  tidyJobs,
} from "./store";
import { DEFAULT_FILTERS, type JobFilters } from "./types";

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
    .select({
      externalId: jobs.externalId,
      source: jobs.source,
      closedAt: jobs.closedAt,
      closeReason: jobs.closeReason,
      missedRuns: jobs.missedRuns,
    })
    .from(jobs)
    .orderBy(jobs.externalId);
}

async function titlesFor(filters: JobFilters): Promise<string[]> {
  const db = await getDb();
  const rows = await db
    .select({ title: jobs.title })
    .from(jobs)
    .where(and(...filterConditions(filters, NOW)))
    .orderBy(desc(jobs.postedAt), desc(jobs.id));
  return rows.map((row) => row.title);
}

describe("job store", () => {
  beforeEach(async () => {
    await resetDb();
    await syncBoards(await getDb(), SEEDS, NOW);
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
      {
        snapshot: true,
      },
    );
    expect(again).toMatchObject({ added: 0, updated: 1, seen: 2 });
    const [two] = await db.select().from(jobs).where(eq(jobs.externalId, "2"));
    expect(two).toMatchObject({ seniority: "senior", lastSeenAt: NOW + DAY });
    const [one] = await db.select().from(jobs).where(eq(jobs.externalId, "1"));
    expect(one).toMatchObject({ lastSeenAt: NOW, missedRuns: 0 });
    const [board] = await db.select().from(jobBoards).where(eq(jobBoards.token, "acme"));
    expect(board).toMatchObject({ lastStatus: "ok", openJobs: 2, lastFetchedAt: NOW + DAY });
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
    const bookkeeping = new Set([
      "id",
      "firstSeenAt",
      "lastSeenAt",
      "missedRuns",
      "createdAt",
      "updatedAt",
    ]);
    const content = Object.fromEntries(
      Object.entries(getTableColumns(jobs)).filter(([key]) => !bookkeeping.has(key)),
    );
    await saveJobs(db, ACME, posts, NOW, { snapshot: true });
    const fresh = await db.select(content).from(jobs).orderBy(jobs.externalId);
    await db.update(jobs).set({
      title: "Old",
      keywords: [],
      search: sql`''::tsvector`,
      groupKey: "",
      remote: false,
      contentHash: "stale",
    });

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
    expect(await db.select(content).from(jobs).orderBy(jobs.externalId)).toEqual(fresh);
    expect(
      await db.select({ lastSeenAt: jobs.lastSeenAt, updatedAt: jobs.updatedAt }).from(jobs),
    ).toEqual(Array.from({ length: 5 }, () => ({ lastSeenAt: NOW + DAY, updatedAt: NOW + DAY })));
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
    await syncBoards(db, SEEDS, NOW + DAY);
    expect(await version()).toBe(first);
    await syncBoards(db, [{ ...SEEDS[0]!, company: "Acme Labs" }], NOW + DAY);
    expect(await version()).not.toBe(first);
  });

  it("closes a job missing from two reads in a row, and reopens it if it comes back", async () => {
    const db = await getDb();
    await saveJobs(db, ACME, [raw("1"), raw("2")], NOW, { snapshot: true });
    await saveJobs(db, ACME, [raw("1")], NOW + DAY, { snapshot: true });
    expect((await rows()).find((row) => row.externalId === "2")).toMatchObject({
      missedRuns: 1,
      closedAt: null,
    });
    const third = await saveJobs(db, ACME, [raw("1")], NOW + 2 * DAY, { snapshot: true });
    expect(third.closed).toBe(1);
    expect((await rows()).find((row) => row.externalId === "2")).toMatchObject({
      closeReason: "gone",
    });
    await saveJobs(db, ACME, [raw("1"), raw("2")], NOW + 3 * DAY, { snapshot: true });
    expect((await rows()).find((row) => row.externalId === "2")).toMatchObject({
      closedAt: null,
      missedRuns: 0,
    });
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
    ).toMatchObject({
      added: 0,
      duplicates: 1,
    });
    const open = (await rows()).filter((row) => row.closedAt === null);
    expect(open.map((row) => row.source)).toEqual(["greenhouse"]);
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
      .select({ externalId: jobs.externalId, description: jobs.description, rules: jobs.rulesText })
      .from(jobs)
      .orderBy(jobs.externalId);
    expect(stored[0]).toMatchObject({ externalId: "board", description: "" });
    expect(stored[1]!.description.length).toBeGreaterThan(5_000);
    expect(stored[1]!.description.length).toBeLessThanOrEqual(JOB_LIMITS.feedDescriptionChars);
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

  it("closes a board's jobs after two 404s in a row", async () => {
    const db = await getDb();
    await saveJobs(db, ACME, [raw("1")], NOW, { snapshot: true });
    expect(await boardFailed(db, "greenhouse", "acme", "not_found", NOW + DAY)).toBe(0);
    expect(await boardFailed(db, "greenhouse", "acme", "not_found", NOW + 2 * DAY)).toBe(1);
    expect((await rows())[0]).toMatchObject({ closeReason: "board_gone" });
  });

  it("closes the jobs of a board taken off the seed list", async () => {
    const db = await getDb();
    await saveJobs(db, ACME, [raw("1")], NOW, { snapshot: true });
    expect(await syncBoards(db, [], NOW + DAY)).toBe(1);
    expect((await rows())[0]).toMatchObject({ closeReason: "board_gone" });
  });

  it("expires, ages out, deletes long-closed jobs and their saves", async () => {
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
    const [one] = await db.select({ id: jobs.id }).from(jobs).where(eq(jobs.externalId, "1"));
    expect(await saveJob(db, user.id, one!.id, NOW)).toBe("saved");

    const later = await tidyJobs(db, NOW + 2 * DAY);
    expect(later).toMatchObject({ expired: 1, aged: 1, deleted: 0 });
    const gone = await tidyJobs(db, NOW + 33 * DAY);
    expect(gone.deleted).toBe(2);
    expect(await db.select().from(savedJobs)).toEqual([]);
  });

  it("deletes closed rows after a week, unless saved or linked to an application", async () => {
    const db = await getDb();
    const user = await createUser("maya@example.com");
    await saveJobs(db, ACME, [raw("1"), raw("2"), raw("3")], NOW, { snapshot: true });
    const ids = new Map(
      (await db.select({ id: jobs.id, externalId: jobs.externalId }).from(jobs)).map((row) => [
        row.externalId,
        row.id,
      ]),
    );
    expect(await saveJob(db, user.id, ids.get("1")!, NOW)).toBe("saved");
    await db.insert(applications).values({
      id: crypto.randomUUID(),
      userId: user.id,
      company: "Acme",
      jobId: ids.get("2")!,
      appliedAt: NOW,
      statusChangedAt: NOW,
      createdAt: NOW,
      updatedAt: NOW,
    });
    await db.update(jobs).set({ closedAt: NOW, closeReason: "gone" });
    expect((await tidyJobs(db, NOW + 8 * DAY)).deleted).toBe(1);
    expect((await rows()).map((row) => row.externalId)).toEqual(["1", "2"]);
    expect((await tidyJobs(db, NOW + 31 * DAY)).deleted).toBe(2);
  });

  it("trims the oldest rows past the cap, closed ones first", async () => {
    const db = await getDb();
    const many = Array.from({ length: 5 }, (_, i) =>
      raw(String(i), { postedAt: NOW - (10 - i) * DAY }),
    );
    await saveJobs(db, ACME, many, NOW, { snapshot: true });
    await db
      .update(jobs)
      .set({ closedAt: NOW, closeReason: "gone" })
      .where(eq(jobs.externalId, "4"));
    const cap = STORE_LIMITS.maxRows;
    Object.assign(STORE_LIMITS, { maxRows: 3 });
    try {
      expect((await tidyJobs(db, NOW)).trimmed).toBe(2);
    } finally {
      Object.assign(STORE_LIMITS, { maxRows: cap });
    }
    expect((await rows()).map((row) => row.externalId)).toEqual(["1", "2", "3"]);
  });

  it("filters open jobs and finds candidates by skill or kind", async () => {
    const db = await getDb();
    await saveJobs(
      db,
      ACME,
      [
        raw("1"),
        raw("2", {
          title: "Product Designer",
          text: "Design in Figma.",
          location: "Berlin",
          remote: false,
          postedAt: NOW - 2 * DAY,
        }),
        raw("3", {
          title: "Account Executive",
          text: "Sell with Salesforce.",
          postedAt: NOW - 20 * DAY,
        }),
      ],
      NOW,
      { snapshot: true },
    );
    expect(await titlesFor(DEFAULT_FILTERS)).toEqual([
      "Backend Engineer 1",
      "Product Designer",
      "Account Executive",
    ]);
    expect(await titlesFor({ ...DEFAULT_FILTERS, remote: true, postedWithin: 7 })).toEqual([
      "Backend Engineer 1",
    ]);
    expect(await titlesFor({ ...DEFAULT_FILTERS, q: "desig", place: "berlin" })).toEqual([
      "Product Designer",
    ]);
    expect(await titlesFor({ ...DEFAULT_FILTERS, role: "design" })).toHaveLength(1);
    expect(await titlesFor({ ...DEFAULT_FILTERS, q: "') | !:* &" })).toHaveLength(3);

    const query = { seniority: null, filters: DEFAULT_FILTERS, weights: new Map<string, number>() };
    const pool = await matchCandidates(
      db,
      { ...query, skills: ["Go", "PostgreSQL"], families: ["sales"] },
      NOW,
    );
    expect(pool.rows.map((job) => job.title).sort()).toEqual([
      "Account Executive",
      "Backend Engineer 1",
    ]);
    expect(pool.groups).toBe(2);
    expect(
      (await matchCandidates(db, { ...query, skills: ["Go"], families: [] }, NOW)).rows,
    ).toEqual([]);
    expect((await matchCandidates(db, { ...query, skills: [], families: [] }, NOW)).rows).toEqual(
      [],
    );
  });

  it("ranks candidates by weighted overlap across every open job, not the newest", async () => {
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
    const pool = await matchCandidates(
      db,
      {
        skills: ["Elixir", "JavaScript", "PostgreSQL"],
        families: [],
        seniority: null,
        filters: DEFAULT_FILTERS,
        weights,
      },
      NOW,
    );
    expect(pool.rows[0]?.title).toBe("Elixir Engineer");
    expect(pool.groups).toBe(7);
  });

  it("shows location copies as one candidate, keeps filler posts off Matches but on the list, and counts neither as open", async () => {
    const db = await getDb();
    const text =
      "Own enterprise accounts with Salesforce and Gong.\nThis role is based in {place}.";
    await saveJobs(
      db,
      ACME,
      [
        raw("uk", {
          title: "Account Executive - Remote UK",
          location: "Remote, United Kingdom",
          text: text.replace("{place}", "London"),
        }),
        raw("ca", {
          title: "Account Executive (Canada)",
          location: "Toronto, Canada",
          text: text.replace("{place}", "Toronto"),
        }),
        raw("pool", {
          title: "Account Executive — Future Opportunities",
          text: "Salesforce and Gong.",
        }),
        raw("stale", {
          title: "Account Executive, Mid-Market",
          text: "Salesforce and Gong.",
          postedAt: NOW - DAY,
        }),
      ],
      NOW,
      { snapshot: true },
    );
    await db
      .update(jobs)
      .set({ firstSeenAt: NOW - 150 * DAY })
      .where(eq(jobs.externalId, "stale"));
    const pool = await matchCandidates(
      db,
      {
        skills: ["Salesforce", "Gong"],
        families: ["sales"],
        seniority: null,
        filters: DEFAULT_FILTERS,
        weights: new Map(),
      },
      NOW,
    );
    expect(pool.groups).toBe(1);
    expect(pool.rows).toHaveLength(1);
    expect(
      pool.copies
        .get(pool.rows[0]!.groupKey)
        ?.map((copy) => copy.location)
        .sort(),
    ).toEqual(["Remote, United Kingdom", "Toronto, Canada"]);
    expect(await titlesFor(DEFAULT_FILTERS)).toHaveLength(4);
    expect(await jobCounts(db, NOW)).toEqual({ open: 2, matchable: 1 });
  });

  it("keeps a job for 90 days from its posting, or from when it was first read if that came first", async () => {
    const db = await getDb();
    await saveJobs(
      db,
      ACME,
      [
        raw("old", { postedAt: NOW - 100 * DAY }),
        raw("recent", { postedAt: NOW - 80 * DAY }),
        raw("undated", { postedAt: null }),
        raw("redated", { postedAt: NOW - DAY }),
      ],
      NOW,
      { snapshot: true },
    );
    await db
      .update(jobs)
      .set({ firstSeenAt: NOW - 95 * DAY })
      .where(eq(jobs.externalId, "redated"));
    const shown = await db
      .select({ id: jobs.externalId })
      .from(jobs)
      .where(and(...matchableConditions(DEFAULT_FILTERS, NOW)));
    expect(shown.map((row) => row.id).sort()).toEqual(["recent", "undated"]);
    expect((await jobCounts(db, NOW)).open).toBe(2);
  });
});
