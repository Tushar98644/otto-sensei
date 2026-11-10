import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { companyVisa, jobs, matchCache } from "@/db/schema";
import { emptyWorkProfile } from "@/lib/eligibility/profile";
import { createUser, resetDb } from "@/lib/auth/test-helpers";
import { poolOpenings, readStoredCounts, rebuildMatchIndex } from "./match-index";
import type { RawJob } from "./parsers";
import { rankJobs } from "./rank";
import { refreshSkillWeights, saveJobs, syncBoards } from "./store";
import { DEFAULT_FILTERS } from "./types";

const DAY = 24 * 60 * 60 * 1_000;
const NOW = Date.UTC(2026, 10, 9, 6);
const ACME = { source: "greenhouse" as const, board: "acme" };

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
    text: `Build services in Go and PostgreSQL on Kubernetes. Job ${id}.`,
    ...overrides,
  };
}

const QUERY = {
  skills: ["Go", "PostgreSQL", "Kubernetes"],
  families: ["engineering" as const],
  seniority: "mid" as const,
  filters: DEFAULT_FILTERS,
  weights: new Map<string, number>(),
  places: null,
};

async function ingest(list: RawJob[]) {
  const db = await getDb();
  await saveJobs(db, ACME, list, NOW, { snapshot: true });
  await refreshSkillWeights(db, NOW);
  return rebuildMatchIndex(db, NOW);
}

describe("match index", () => {
  beforeEach(async () => {
    await resetDb();
    await syncBoards(await getDb(), [{ ats: "greenhouse", token: "acme", company: "Acme" }], NOW);
  });

  it("ranks from jobs until an ingest has built it, then from job_match, with the same openings", async () => {
    const db = await getDb();
    await saveJobs(
      db,
      ACME,
      [raw("1"), raw("2"), raw("3", { title: "Account Executive", text: "Salesforce." })],
      NOW,
      {
        snapshot: true,
      },
    );
    expect(await readStoredCounts(db)).toBeNull();
    const before = await poolOpenings(db, QUERY, null, NOW);
    expect(before.source).toBe("jobs");

    await refreshSkillWeights(db, NOW);
    expect(await rebuildMatchIndex(db, NOW)).toBe(3);
    const counts = await readStoredCounts(db);
    expect(counts).toMatchObject({ openJobs: 3, matchable: 3, builtAt: NOW });
    const after = await poolOpenings(db, QUERY, counts, NOW);
    expect(after.source).toBe("index");
    expect(after.openings.map((item) => item.row.title).sort()).toEqual(
      before.openings.map((item) => item.row.title).sort(),
    );
    expect(after.groups).toBe(before.groups);
  });

  it("keeps one row per opening with every copy's place, and filters on any copy", async () => {
    const text = "Own accounts with Salesforce and HubSpot.\nThis role is based in {place}.";
    await ingest([
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
    const db = await getDb();
    const counts = await readStoredCounts(db);
    const sales = { ...QUERY, skills: ["Salesforce", "HubSpot"], families: ["sales" as const] };
    const pool = await poolOpenings(db, sales, counts, NOW);
    expect(pool.openings).toHaveLength(1);
    expect(pool.openings[0]!.places).toEqual(["GB", "US"]);
    expect(pool.openings[0]!.copies).toHaveLength(2);
    // Remote only: the opening stays, shown as its remote copy.
    const remote = await poolOpenings(
      db,
      { ...sales, filters: { ...DEFAULT_FILTERS, remote: true } },
      counts,
      NOW,
    );
    expect(remote.openings.map((item) => item.row.location)).toEqual(["Remote · United States"]);
  });

  it("puts a place the card names first and a far level last", async () => {
    await ingest([
      raw("de", { title: "Backend Engineer", location: "Berlin, Germany", remote: false }),
      raw("us", {
        title: "Backend Engineer",
        location: "Austin, TX",
        remote: false,
        text: "Go, PostgreSQL and Kubernetes services. Austin office.",
      }),
      raw("dir", {
        title: "Director of Engineering",
        location: "Austin, TX",
        text: "Go, PostgreSQL, Kubernetes. Lead the org.",
      }),
    ]);
    const db = await getDb();
    const counts = await readStoredCounts(db);
    const pool = await poolOpenings(
      db,
      { ...QUERY, places: ["*", "US", "g:north_america", "g:americas"] },
      counts,
      NOW,
    );
    expect(pool.openings.map((item) => item.row.title)).toEqual([
      "Backend Engineer",
      "Backend Engineer",
      "Director of Engineering",
    ]);
    expect(pool.openings[0]!.row.location).toBe("Austin, TX");
    // Two levels away counts only when nothing nearer matches.
    expect(pool.groups).toBe(2);
  });

  it("copies company visa facts in and shows them as plain lines", async () => {
    const db = await getDb();
    await db.insert(companyVisa).values({
      companyKey: "acme",
      ukName: "ACME LTD",
      h1bYear: 2025,
      h1bApprovals: 12,
      usName: "ACME INC",
      checkedAt: NOW,
    });
    await ingest([raw("1")]);
    const user = await createUser("ada@example.com");
    const result = await rankJobs(db, {
      userId: user.id,
      view: "matches",
      profile: { skills: ["Go", "PostgreSQL"], titles: ["Backend Engineer"], years: 4 },
      filters: DEFAULT_FILTERS,
      page: 1,
      workProfile: null,
      deviceTimeZone: "",
      now: NOW,
    });
    expect(result.jobs[0]?.visa).toEqual([
      "Listed as a UK visa sponsor",
      "H-1B visa petitions approved in fiscal 2025 (USCIS)",
    ]);
  });

  it("keeps a page of matches for the day and reuses it, with saved jobs read fresh", async () => {
    await ingest([raw("1"), raw("2")]);
    const db = await getDb();
    const user = await createUser("ada@example.com");
    const request = {
      userId: user.id,
      view: "matches" as const,
      profile: { skills: ["Go", "PostgreSQL"], titles: ["Backend Engineer"], years: 4 },
      filters: DEFAULT_FILTERS,
      page: 1,
      workProfile: { ...emptyWorkProfile(), country: "DE" },
      deviceTimeZone: "",
      now: NOW,
      cache: true,
    };
    const first = await rankJobs(db, request);
    expect(first.jobs).toHaveLength(2);
    expect(first.lookingFor).toMatchObject({ family: "engineering", place: "g:eu" });
    expect(await db.select().from(matchCache)).toHaveLength(1);
    // A job closing doesn't change today's cached page...
    await db
      .update(jobs)
      .set({ closedAt: NOW, closeReason: "gone" })
      .where(eq(jobs.externalId, "2"));
    const again = await rankJobs(db, { ...request, now: NOW + 60_000 });
    expect(again.jobs.map((job) => job.id)).toEqual(first.jobs.map((job) => job.id));
    // ...but a new ingest run, a new day or another "Looking for" does.
    const other = await rankJobs(db, {
      ...request,
      lookingFor: {
        title: "",
        family: "data",
        occupation: null,
        level: null,
        place: "anywhere",
        remote: false,
      },
    });
    expect(other.jobs).toHaveLength(1);
    expect(await db.select().from(matchCache)).toHaveLength(2);
  });
});
