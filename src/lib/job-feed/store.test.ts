import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { jobBoards, jobs, savedJobs } from "@/db/schema";
import { createUser, resetDb } from "@/lib/auth/test-helpers";
import type { RawJob } from "./parsers";
import { jobCounts, listJobs, matchCandidates, saveJob, skillWeights } from "./records";
import {
  boardFailed,
  refreshSkillWeights,
  saveJobs,
  STORE_LIMITS,
  syncBoards,
  tidyJobs,
} from "./store";
import { DEFAULT_FILTERS } from "./types";

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
    const [board] = await db.select().from(jobBoards).where(eq(jobBoards.token, "acme"));
    expect(board).toMatchObject({ lastStatus: "ok", openJobs: 2, lastFetchedAt: NOW + DAY });
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
    // The employer's own listing arrives: the feed's copy closes as a duplicate.
    expect(await saveJobs(db, ACME, [raw("1")], NOW, { snapshot: true })).toMatchObject({
      added: 1,
      closed: 1,
    });
    // The feed lists it again: it is skipped, not added back.
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

  it("lists open jobs by filters and finds candidates by skill or kind", async () => {
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
    const all = await listJobs(db, DEFAULT_FILTERS, 1, NOW);
    expect(all.jobs.map((job) => job.title)).toEqual([
      "Backend Engineer 1",
      "Product Designer",
      "Account Executive",
    ]);
    const remote = await listJobs(
      db,
      { ...DEFAULT_FILTERS, remote: true, postedWithin: 7 },
      1,
      NOW,
    );
    expect(remote.jobs.map((job) => job.title)).toEqual(["Backend Engineer 1"]);
    const search = await listJobs(db, { ...DEFAULT_FILTERS, q: "desig", place: "berlin" }, 1, NOW);
    expect(search.jobs.map((job) => job.title)).toEqual(["Product Designer"]);
    const designers = await listJobs(db, { ...DEFAULT_FILTERS, role: "design" }, 1, NOW);
    expect(designers.jobs).toHaveLength(1);
    // Search input never reaches tsquery as syntax.
    expect((await listJobs(db, { ...DEFAULT_FILTERS, q: "') | !:* &" }, 1, NOW)).jobs).toHaveLength(
      3,
    );

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
    // One shared skill and another kind of role: nothing matchJob would label, so not a candidate.
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
    // ln(7 open / 1 naming Elixir) against ln(7 / 7) for PostgreSQL, floored.
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

  it("shows location copies as one candidate, and keeps filler posts off Matches but on the list", async () => {
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
          postedAt: NOW - 150 * DAY,
        }),
      ],
      NOW,
      { snapshot: true },
    );
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
    expect((await listJobs(db, DEFAULT_FILTERS, 1, NOW)).jobs).toHaveLength(4);
    expect(await jobCounts(db, NOW)).toEqual({ open: 4, matchable: 1 });
  });
});
