import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { companyVisa, listings, matchCache, skills } from "@/db/schema";
import { emptyWorkProfile } from "@/lib/eligibility/profile";
import { createUser, resetDb } from "@/lib/auth/test-helpers";
import {
  poolOpenings,
  readStoredCounts,
  rebuildMatchIndex,
  type StoredCounts,
} from "./match-index";
import type { RawJob } from "./parsers";
import { rankJobs } from "./rank";
import rawVectors from "./occupations/vectors.json";
import { refreshSkillWeights, saveJobs, syncBoards } from "./store";
import {
  saveTitleVectors,
  titleVectorKey,
  waitingTitles,
  type TitleVectorRow,
} from "./title-vectors";
import { DEFAULT_FILTERS, type JobFilters } from "./types";

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
    await syncBoards(await getDb(), [{ ats: "greenhouse", token: "acme", company: "Acme" }]);
  });

  it("rewrites only the rows that changed, and drops openings that closed", async () => {
    const db = await getDb();
    expect(await ingest([raw("1"), raw("2"), raw("3", { title: "Account Executive" })])).toBe(3);
    const versions = async () => {
      const result = await db.execute(sql`select id::text, xmin::text as v from listings`);
      const { rows } = result as unknown as { rows: { id: string; v: string }[] };
      return new Map(rows.map((row) => [row.id, row.v]));
    };
    const first = await versions();

    expect(await rebuildMatchIndex(db, NOW)).toBe(3);
    expect(await versions()).toEqual(first);

    await saveJobs(db, ACME, [raw("1"), raw("2")], NOW + 1, { snapshot: true });
    await saveJobs(db, ACME, [raw("1"), raw("2")], NOW + 2, { snapshot: true });
    expect(await rebuildMatchIndex(db, NOW + 2)).toBe(2);
    const after = await versions();
    expect(after.size).toBe(2);
    for (const [id, version] of after) expect(version).toBe(first.get(id));
  });

  it("gives a skill its id when a post first names it, never changes it, and drops only the weight once no open post names it", async () => {
    const db = await getDb();
    const table = async () =>
      new Map(
        (await db.select().from(skills)).map((row) => [
          row.skill,
          { sid: row.sid, openJobs: row.openJobs, weighted: row.weight !== null },
        ]),
      );
    const stale = raw("old", { text: "Elixir and Go.", postedAt: NOW - 200 * DAY });
    await ingest([raw("1"), stale]);
    const first = await table();
    const ids = new Map([...first].map(([skill, row]) => [skill, row.sid]));
    expect(new Set([ids.get("Go"), ids.get("PostgreSQL"), ids.get("Kubernetes")])).toEqual(
      new Set([1, 2, 3]),
    );
    expect(first.get("Elixir")).toEqual({ sid: 4, openJobs: 1, weighted: true });
    expect(first.get("Go")).toMatchObject({ openJobs: 2, weighted: true });

    const python = raw("2", { text: "Build services in Python and Elixir." });
    await saveJobs(db, ACME, [python, stale], NOW + 1, { snapshot: true });
    await saveJobs(db, ACME, [python, stale], NOW + 2, { snapshot: true });
    await refreshSkillWeights(db, NOW + 2);
    await rebuildMatchIndex(db, NOW + 2);
    const later = await table();
    expect(later.get("Go")).toEqual({ sid: ids.get("Go"), openJobs: 1, weighted: true });
    expect(later.get("PostgreSQL")).toEqual({
      sid: ids.get("PostgreSQL"),
      openJobs: 0,
      weighted: false,
    });
    expect(later.get("Elixir")?.sid).toBe(4);
    expect(later.get("Python")?.sid).toBe(5);
    const result = await db.execute(sql`select skills from listings where ext = '2'`);
    const { rows } = result as unknown as { rows: { skills: number[] }[] };
    expect(rows).toEqual([{ skills: [5, 4] }]);
  });

  it("ranks every fresh job until a rebuild has marked the openings, then each opening", async () => {
    const db = await getDb();
    await saveJobs(
      db,
      ACME,
      [raw("1"), raw("2"), raw("3", { title: "Account Executive", text: "Salesforce." })],
      NOW,
      { snapshot: true },
    );
    expect(await readStoredCounts(db)).toBeNull();
    const before = await poolOpenings(db, QUERY, null, NOW);

    await refreshSkillWeights(db, NOW);
    expect(await rebuildMatchIndex(db, NOW)).toBe(3);
    const counts = await readStoredCounts(db);
    expect(counts).toMatchObject({ openJobs: 3, matchable: 3, builtAt: NOW });
    const after = await poolOpenings(db, QUERY, counts, NOW);
    expect(after.openings.map((item) => item.row.title).sort()).toEqual([
      "Backend Engineer 1",
      "Backend Engineer 2",
    ]);
    expect(after.groups).toBe(2);
    expect(before.openings.map((item) => item.row.title).sort()).toEqual(
      after.openings.map((item) => item.row.title).sort(),
    );
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
    const remote = await poolOpenings(
      db,
      { ...sales, filters: { ...DEFAULT_FILTERS, remote: true } },
      counts,
      NOW,
    );
    expect(remote.openings.map((item) => item.row.location)).toEqual(["Remote · United States"]);
  });

  it("finds an opening by the words of any of its open copies", async () => {
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
    const shown = async (filters: Partial<JobFilters>, stored: StoredCounts | null = counts) => {
      const query = { ...sales, filters: { ...DEFAULT_FILTERS, ...filters } };
      const pool = await poolOpenings(db, query, stored, NOW);
      return pool.openings.map((item) => item.row.location);
    };
    expect(await shown({ q: "london" })).toEqual(["London, United Kingdom"]);
    expect(await shown({ place: "united states" })).toEqual(["Remote · United States"]);
    expect(await shown({ q: "berlin" })).toEqual([]);
  });

  it("keeps only openings someone in the chosen place can take, and counts a far level but ranks it last", async () => {
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
      "Director of Engineering",
    ]);
    expect(pool.openings[0]!.row.location).toBe("Austin, TX");
    expect(pool.groups).toBe(2);
  });

  it("shows Remote, India only jobs open worldwide, in India, in a region with India, or unplaced by location and post", async () => {
    await ingest([
      raw("us", { location: "Remote - US" }),
      raw("in", { location: "Remote - India" }),
      raw("ww", { location: "Remote (Worldwide)" }),
      raw("apac", { location: "Remote - APAC" }),
      raw("bare", { location: "Remote" }),
      raw("said", {
        location: "Remote",
        text: "Build services in Go and PostgreSQL. This is a remote position open to candidates based in the United States and in the Pacific Timezone.",
      }),
      raw("blr", { location: "Bengaluru, India", remote: false }),
    ]);
    const db = await getDb();
    const user = await createUser("ada@example.com");
    const result = await rankJobs(db, {
      userId: user.id,
      view: "matches",
      profile: { skills: ["Go", "PostgreSQL"], titles: ["Backend Engineer"], years: 4 },
      filters: { ...DEFAULT_FILTERS, remote: true },
      lookingFor: {
        title: "Backend Engineer",
        family: "engineering",
        occupation: null,
        level: null,
        place: "c:IN",
        remote: true,
      },
      page: 1,
      workProfile: null,
      deviceTimeZone: "",
      now: NOW,
    });
    expect(result.jobs.map((job) => job.location).sort()).toEqual([
      "Remote",
      "Remote (Worldwide)",
      "Remote - APAC",
      "Remote - India",
    ]);
    expect(result.total).toBe(4);
  });

  it("leaves out posts asking for more years than the chosen level allows, wherever the title puts them", async () => {
    await ingest([
      raw("new", {
        title: "Backend Engineer",
        text: "Go, PostgreSQL, Kubernetes. 1+ years of experience.",
      }),
      raw("five", {
        title: "Backend Engineer II",
        text: "Go, PostgreSQL, Kubernetes. 5+ years of experience.",
      }),
      raw("open", { title: "Backend Developer", text: "Go, PostgreSQL, Kubernetes." }),
    ]);
    const db = await getDb();
    const counts = await readStoredCounts(db);
    const titles = async (seniority: "junior" | "senior") =>
      (await poolOpenings(db, { ...QUERY, seniority }, counts, NOW)).openings
        .map((item) => item.row.title)
        .sort();
    expect(await titles("junior")).toEqual(["Backend Developer", "Backend Engineer"]);
    expect(await titles("senior")).toEqual([
      "Backend Developer",
      "Backend Engineer",
      "Backend Engineer II",
    ]);
  });

  it("ranks levels two steps away after every nearer one instead of dropping them", async () => {
    await ingest([
      raw("mid", { title: "Backend Engineer" }),
      raw("dir", { title: "Director of Engineering", text: "Go, PostgreSQL, Kubernetes. Lead." }),
      raw("sr", { title: "Senior Backend Engineer" }),
    ]);
    const db = await getDb();
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
    expect(result.jobs.map((job) => job.title)).toEqual([
      "Backend Engineer",
      "Senior Backend Engineer",
      "Director of Engineering",
    ]);
    expect(result.jobs[2]!.match.label).toBe("stretch");
    expect(result).toMatchObject({ total: 3, matching: 3 });
  });

  it("pages past the closely ranked openings in the index's own order, through every match", async () => {
    await ingest([raw("seed")]);
    const db = await getDb();
    await db.execute(sql`
      insert into public.listings (id, title, dedupe, posted, seen, valid, grp, hash, occ, board,
        level, family, min_years, flags, missed, ext, title_text, location, places, company, url,
        facts, skills)
      select id + n, title, dedupe + n, posted - n, seen, valid, grp + n, hash, occ, board, level,
        family, min_years, flags, missed, 'copy-' || n, title_text, location, places, 'Acme ' || n,
        url, facts, skills
      from public.listings cross join generate_series(1, 329) as n`);
    await rebuildMatchIndex(db, NOW);
    const user = await createUser("ada@example.com");
    const page = (n: number) =>
      rankJobs(db, {
        userId: user.id,
        view: "matches",
        profile: { skills: ["Go", "PostgreSQL"], titles: ["Backend Engineer"], years: 4 },
        filters: DEFAULT_FILTERS,
        page: n,
        workProfile: null,
        deviceTimeZone: "",
        now: NOW,
      });
    const last = await page(15);
    const deep = await page(16);
    expect(last.jobs.at(-1)?.position).toBe(300);
    expect(deep.jobs.map((job) => job.position)).toEqual(
      Array.from({ length: 20 }, (_, i) => 301 + i),
    );
    expect(deep).toMatchObject({ total: 330, matching: 330, strong: 0 });
    const seen = new Set(last.jobs.map((job) => job.id));
    expect(deep.jobs.some((job) => seen.has(job.id))).toBe(false);
    expect((await page(17)).jobs).toHaveLength(10);
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

  it("reads each job's kind of role from its title vector once one is stored", async () => {
    const text = "Build services in Go, PostgreSQL and Kubernetes on Linux.";
    await ingest([
      raw("dev", { title: "Backend Developer", text }),
      raw("support", { title: "Associate Linux Support Engineer", text }),
      raw("nurse", { title: "Registered Nurse", text: "Patient care." }),
    ]);
    const db = await getDb();
    // Each test title gets its occupation's vector, as scripts/title-vectors.py sends one.
    const file = rawVectors as { codes: string[]; vectors: string };
    const all = Buffer.from(file.vectors, "base64");
    const row = (title: string, code: string): TitleVectorRow => {
      const at = file.codes.indexOf(code) * 256;
      return [titleVectorKey(title), all.subarray(at, at + 256).toString("base64"), [code], [0.9]];
    };
    expect((await waitingTitles(db, 10)).sort()).toEqual([
      "associate linux support engineer",
      "backend developer",
      "registered nurse",
    ]);
    await saveTitleVectors(db, [
      row("Backend Developer", "15-1252.00"),
      row("Associate Linux Support Engineer", "15-1232.00"),
      row("Registered Nurse", "29-1141.00"),
    ]);
    expect(await rebuildMatchIndex(db, NOW)).toBe(3);
    const user = await createUser("ada@example.com");
    const result = await rankJobs(db, {
      userId: user.id,
      view: "matches",
      profile: {
        skills: ["Go", "PostgreSQL", "Kubernetes", "Linux"],
        titles: ["Software Engineer"],
        years: 4,
      },
      filters: DEFAULT_FILTERS,
      page: 1,
      workProfile: null,
      deviceTimeZone: "",
      now: NOW,
    });
    const [first, ...rest] = result.jobs;
    expect(first).toMatchObject({ title: "Backend Developer", match: { label: "strong" } });
    expect(first!.match.reason).toMatch(
      /^Role match: Backend Developer ≈ your Software Engineer\. /,
    );
    expect(first!.features).toHaveLength(5);
    expect(rest.map((job) => job.title)).not.toContain("Registered Nurse");
    for (const job of rest) expect(job.match.label).not.toBe("strong");
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
    await db.delete(listings).where(eq(listings.ext, "2"));
    const again = await rankJobs(db, { ...request, now: NOW + 60_000 });
    expect(again.jobs.map((job) => job.id)).toEqual(first.jobs.map((job) => job.id));
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
    // A backend job isn't a data role, however many skills it shares.
    expect(other.jobs).toHaveLength(0);
    expect(await db.select().from(matchCache)).toHaveLength(2);
  });

  it("keeps the next page with a ranked one, so Next is read from the cache", async () => {
    await ingest(Array.from({ length: 25 }, (_, i) => raw(String(i))));
    const db = await getDb();
    const user = await createUser("ada@example.com");
    const request = {
      userId: user.id,
      view: "matches" as const,
      profile: { skills: ["Go", "PostgreSQL"], titles: ["Backend Engineer"], years: 4 },
      filters: DEFAULT_FILTERS,
      page: 1,
      workProfile: null,
      deviceTimeZone: "",
      now: NOW,
      cache: true,
    };
    const first = await rankJobs(db, request);
    expect(first).toMatchObject({ page: 1, total: 25 });
    expect(first.jobs).toHaveLength(20);
    expect(await db.select().from(matchCache)).toHaveLength(2);

    await db.delete(listings);
    const second = await rankJobs(db, { ...request, page: 2 });
    expect(second).toMatchObject({ page: 2, total: 25 });
    expect(second.jobs.map((job) => job.position)).toEqual([21, 22, 23, 24, 25]);
    expect(new Set([...first.jobs, ...second.jobs].map((job) => job.id)).size).toBe(25);
    expect(await db.select().from(matchCache)).toHaveLength(2);

    const free = await createUser("grace@example.com");
    await ingest(Array.from({ length: 25 }, (_, i) => raw(String(i))));
    await rankJobs(db, { ...request, userId: free.id, free: true });
    const kept = await db.select().from(matchCache).where(eq(matchCache.userId, free.id));
    expect(kept).toHaveLength(1);
  });

  it("hands the cache write to the caller when asked, with the counts it already read", async () => {
    await ingest([raw("1"), raw("2")]);
    const db = await getDb();
    const user = await createUser("ada@example.com");
    const writes: (() => Promise<void>)[] = [];
    const result = await rankJobs(db, {
      userId: user.id,
      view: "matches",
      profile: { skills: ["Go", "PostgreSQL"], titles: ["Backend Engineer"], years: 4 },
      filters: DEFAULT_FILTERS,
      page: 1,
      workProfile: null,
      deviceTimeZone: "",
      now: NOW,
      cache: true,
      counts: await readStoredCounts(db),
      defer: (write) => writes.push(write),
    });
    expect(result.jobs).toHaveLength(2);
    expect(writes).toHaveLength(1);
    expect(await db.select().from(matchCache)).toHaveLength(0);
    await writes[0]!();
    expect(await db.select().from(matchCache)).toHaveLength(1);
  });

  it("gives Saved the stored open-job count instead of counting per request", async () => {
    await ingest([raw("1"), raw("2")]);
    const db = await getDb();
    const user = await createUser("ada@example.com");
    await db.delete(listings).where(eq(listings.ext, "2"));
    const saved = await rankJobs(db, {
      userId: user.id,
      view: "saved",
      profile: { skills: ["Go"], titles: ["Backend Engineer"], years: 4 },
      filters: DEFAULT_FILTERS,
      page: 1,
      workProfile: null,
      deviceTimeZone: "",
      now: NOW,
    });
    expect(saved).toMatchObject({ openJobs: 2, checkedAt: NOW });
  });
});
