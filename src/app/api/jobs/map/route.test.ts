import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import type {
  CitySearchResponse,
  CompanyJobsResponse,
  JobMapResponse,
  JobMatchesResponse,
} from "@/lib/api/types";
import { cookieJar, resetDb, setPlan, signInAs } from "@/lib/auth/test-helpers";
import { rebuildMatchIndex } from "@/lib/job-feed/match-index";
import type { RawJob } from "@/lib/job-feed/parsers";
import { refreshSkillWeights, saveJobs, syncBoards } from "@/lib/job-feed/store";
import { GET as cities } from "../cities/route";
import { GET as company } from "../company/route";
import { POST as matches } from "../matches/route";
import { POST as map } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

const DAY = 24 * 60 * 60 * 1_000;
const PROFILE = { skills: ["TypeScript", "PostgreSQL", "Kubernetes"], titles: [], years: 4 };

function raw(id: string, overrides: Partial<RawJob> = {}): RawJob {
  return {
    externalId: id,
    company: "Acme",
    title: "Backend Engineer",
    location: "Berlin, Germany",
    remote: false,
    employmentType: "full_time",
    postedAt: Date.now() - DAY,
    validThrough: null,
    url: `https://job-boards.greenhouse.io/acme/jobs/${id}`,
    text: "Build services in TypeScript and PostgreSQL on Kubernetes.",
    ...overrides,
  };
}

async function seed() {
  const db = await getDb();
  await syncBoards(db, [{ ats: "greenhouse", token: "acme", company: "Acme" }]);
  await saveJobs(
    db,
    { source: "greenhouse", board: "acme" },
    [raw("1"), raw("2", { title: "Platform Engineer", location: "Hybrid · Munich, Germany" })],
    Date.now(),
    { snapshot: true },
  );
  await refreshSkillWeights(db, Date.now());
  await rebuildMatchIndex(db, Date.now());
}

const post = (handler: (req: Request) => Promise<Response>, path: string, body: unknown) =>
  handler(
    new Request(`http://localhost${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

describe("the Jobs tab's map and company panel", () => {
  beforeEach(async () => {
    await resetDb();
    cookieJar.clear();
    await seed();
  });

  it("are for Pro, like filters", async () => {
    await signInAs();
    expect((await post(map, "/api/jobs/map", { profile: PROFILE })).status).toBe(402);
    expect((await company(new Request("http://localhost/api/jobs/company?name=Acme"))).status).toBe(
      402,
    );
  });

  it("pins a list's companies by city and lists a company's jobs", async () => {
    await setPlan(await signInAs(), "pro");
    const res = await post(map, "/api/jobs/map", { profile: PROFILE });
    expect(res.status).toBe(200);
    const body = (await res.json()) as JobMapResponse;
    expect(body.openings).toBe(2);
    expect(body.placed).toBe(2);
    expect(body.pins.map((pin) => [pin.name, pin.city.name, pin.roles, pin.total]).sort()).toEqual([
      ["Acme", "Berlin", 1, 2],
      ["Acme", "Munich", 1, 2],
    ]);

    const panel = await company(new Request("http://localhost/api/jobs/company?name=ACME%20Inc."));
    expect(panel.status).toBe(200);
    const facts = (await panel.json()) as CompanyJobsResponse;
    expect(facts.company).toMatchObject({
      name: "Acme",
      roles: 2,
      hybrid: 1,
      hiring: true,
      careers: "https://job-boards.greenhouse.io/acme",
    });
    expect(facts.jobs.map((job) => job.title).sort()).toEqual([
      "Backend Engineer",
      "Platform Engineer",
    ]);
    const missing = await company(new Request("http://localhost/api/jobs/company?name=Globex"));
    expect(missing.status).toBe(404);
  });

  it("puts the employer's facts on each job card", async () => {
    await setPlan(await signInAs(), "pro");
    const res = await post(matches, "/api/jobs/matches", { profile: PROFILE });
    const body = (await res.json()) as JobMatchesResponse;
    expect(body.jobs[0]?.employer).toMatchObject({ name: "Acme", roles: 2, hiring: true });
  });

  it("keeps to jobs near a rounded point, and never caches that list", async () => {
    await setPlan(await signInAs(), "pro");
    const res = await post(matches, "/api/jobs/matches", {
      profile: PROFILE,
      filters: { near: { lat: 48.137_43, lng: 11.575_49, km: 10 } },
    });
    const body = (await res.json()) as JobMatchesResponse;
    expect(body.jobs.map((job) => job.title)).toEqual(["Platform Engineer"]);
    const db = await getDb();
    const cached = await db.execute("select count(*)::int as n from match_cache");
    expect((cached as unknown as { rows: { n: number }[] }).rows[0]?.n).toBe(0);
  });

  it("finds cities by the start of their name", async () => {
    const res = await cities(new Request("http://localhost/api/jobs/cities?q=munic"));
    const body = (await res.json()) as CitySearchResponse;
    expect(body.cities[0]).toMatchObject({ name: "Munich", country: "DE" });
  });
});
