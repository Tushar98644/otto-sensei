import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { companies, listings } from "@/db/schema";
import { geocode } from "@/lib/geo/geocode";
import { resetDb } from "@/lib/auth/test-helpers";
import { buildCompanies } from "./companies";
import { poolCompanies, poolOpenings, readStoredCounts, rebuildMatchIndex } from "./match-index";
import { nearCityIds } from "./near";
import type { RawJob } from "./parsers";
import { refreshSkillWeights, saveJobs, syncBoards } from "./store";
import { DEFAULT_FILTERS, type JobFilters } from "./types";

const DAY = 24 * 60 * 60 * 1_000;
const NOW = Date.UTC(2026, 10, 25, 6);
const ACME = { source: "greenhouse" as const, board: "acme" };
const GLOBEX = { source: "lever" as const, board: "globex" };

function raw(id: string, overrides: Partial<RawJob> = {}): RawJob {
  return {
    externalId: id,
    company: "Acme",
    title: `Backend Engineer ${id}`,
    location: "Berlin, Germany",
    remote: false,
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
  weights: new Map<string, number>(),
  places: null,
};

const cityId = (location: string, countries: string[]) => geocode(location, countries)!.id;

async function setUp() {
  const db = await getDb();
  await syncBoards(db, [
    { ats: "greenhouse", token: "acme", company: "Acme" },
    { ats: "lever", token: "globex", company: "Globex" },
  ]);
  await saveJobs(
    db,
    ACME,
    [
      raw("1"),
      raw("2", { location: "Hybrid · Munich, Germany" }),
      raw("3", { location: "Remote - Germany", remote: true }),
    ],
    NOW,
    { snapshot: true },
  );
  await saveJobs(
    db,
    GLOBEX,
    [
      raw("g1", {
        company: "Globex",
        location: "Potsdam, Germany",
        postedAt: NOW - 40 * DAY,
        url: "https://jobs.lever.co/globex/g1",
      }),
    ],
    NOW - 40 * DAY,
    { snapshot: true },
  );
  await refreshSkillWeights(db, NOW);
  await rebuildMatchIndex(db, NOW);
  return db;
}

async function titlesWith(filters: Partial<JobFilters>) {
  const db = await getDb();
  const counts = await readStoredCounts(db);
  const pool = await poolOpenings(
    db,
    {
      ...QUERY,
      filters: { ...DEFAULT_FILTERS, ...filters },
      near: nearCityIds({ ...DEFAULT_FILTERS, ...filters }.near),
    },
    counts,
    NOW,
  );
  return pool.openings.map((opening) => opening.row.title).sort();
}

describe("job cities and companies", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("reads each job's city at ingest and keeps a row per company", async () => {
    const db = await setUp();
    const rows = await db.select({ ext: listings.ext, city: listings.city }).from(listings);
    const byExt = new Map(rows.map((row) => [row.ext.split(":").at(-1), row.city]));
    expect(byExt.get("1")).toBe(cityId("Berlin", ["DE"]));
    expect(byExt.get("2")).toBe(cityId("Munich", ["DE"]));
    expect(byExt.get("3")).toBe(0);

    const stored = await db.select().from(companies).orderBy(companies.board);
    expect(stored.map((row) => [row.name, row.roles, row.remote, row.hybrid])).toEqual([
      ["Acme", 3, 1, 1],
      ["Globex", 1, 0, 0],
    ]);
    expect(stored[0]?.city).toBe(cityId("Berlin", ["DE"]));
  });

  it("fills the city of a stored job on the next rebuild, once", async () => {
    const db = await setUp();
    await db.update(listings).set({ city: 0 });
    await rebuildMatchIndex(db, NOW);
    const [filled] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(listings)
      .where(sql`${listings.city} <> 0`);
    expect(filled?.n).toBe(3);
    const before = await db.execute(
      sql`select string_agg(xmin::text, ',' order by id) as v from listings`,
    );
    await rebuildMatchIndex(db, NOW);
    const after = await db.execute(
      sql`select string_agg(xmin::text, ',' order by id) as v from listings`,
    );
    expect(after).toEqual(before);
  });

  it("filters by distance, work mode and hiring now", async () => {
    await setUp();
    const berlin = cityId("Berlin", ["DE"]);
    expect(await titlesWith({ near: { city: berlin, lat: null, lng: null, km: 50 } })).toEqual([
      "Backend Engineer 1",
      "Backend Engineer g1",
    ]);
    expect(await titlesWith({ near: { city: null, lat: 48.14, lng: 11.58, km: 10 } })).toEqual([
      "Backend Engineer 2",
    ]);
    expect(await titlesWith({ workMode: "hybrid" })).toEqual(["Backend Engineer 2"]);
    expect(await titlesWith({ workMode: "onsite" })).toEqual([
      "Backend Engineer 1",
      "Backend Engineer g1",
    ]);
    expect(await titlesWith({ hiring: true })).toEqual([
      "Backend Engineer 1",
      "Backend Engineer 2",
      "Backend Engineer 3",
    ]);
  });

  it("counts a list's openings by company and city for the map", async () => {
    const db = await setUp();
    const { companies: found, openings } = await poolCompanies(
      db,
      { ...QUERY, filters: DEFAULT_FILTERS },
      await readStoredCounts(db),
      NOW,
    );
    expect(openings).toBe(4);
    expect(found.map((row) => [row.company, row.city, row.roles]).sort()).toEqual(
      [
        ["", cityId("Berlin", ["DE"]), 1],
        ["", cityId("Munich", ["DE"]), 1],
        ["", 0, 1],
        ["", cityId("Potsdam", ["DE"]), 1],
      ].sort(),
    );
  });

  it("names a company by its most used spelling and its city by most jobs", () => {
    const member = (board: number, company: string, city: number, lead = true) => ({
      board,
      company,
      city,
      location: "",
      remote: false,
      lead,
      newest: 10,
    });
    const rows = buildCompanies(
      [member(1, "", 5), member(1, "", 5), member(2, "ACME", 7), member(1, "", 7, false)],
      new Map([
        [1, "Acme"],
        [2, "Feed"],
      ]),
    );
    expect(rows).toEqual([
      expect.objectContaining({ board: 1, company: "", name: "Acme", city: 5, roles: 3 }),
      expect.objectContaining({ board: 2, company: "ACME", name: "Acme", city: 5, roles: 3 }),
    ]);
  });
});
