import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { jobs } from "@/db/schema";
import type { JobPostResponse } from "@/lib/api/types";
import { cookieJar, resetDb, signInAs } from "@/lib/auth/test-helpers";
import { saveJobs, syncBoards } from "@/lib/job-feed/store";
import { GREENHOUSE_JOB } from "@/lib/jobs/test-fixtures";
import { fakeNet } from "@/lib/jobs/test-network";
import { GET } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);
vi.mock("node:dns", async (importOriginal) =>
  (await import("@/lib/jobs/test-network")).dnsMock(await importOriginal()),
);
vi.mock(
  "@/lib/jobs/transport",
  async () => (await import("@/lib/jobs/test-network")).transportMock,
);
// unstable_cache needs Next's server: this keeps what it keeps, every answer and never a throw.
vi.mock("@/lib/job-feed/public-cache", () => ({
  cachedForDay: <Args extends unknown[], Result>(
    _name: string,
    load: (...args: Args) => Promise<Result>,
  ) => {
    const kept = new Map<string, Result>();
    return async (...args: Args) => {
      const key = JSON.stringify(args);
      if (kept.has(key)) return kept.get(key) as Result;
      const value = await load(...args);
      kept.set(key, value);
      return value;
    };
  },
}));

const BOARD_API =
  "https://boards-api.greenhouse.io/v1/boards/gitlab/jobs/8638232002?questions=true";

async function seedJob(): Promise<string> {
  const db = await getDb();
  await syncBoards(db, [{ ats: "greenhouse", token: "gitlab", company: "GitLab" }], Date.now());
  await saveJobs(
    db,
    { source: "greenhouse", board: "gitlab" },
    [
      {
        externalId: "8638232002",
        company: "GitLab",
        title: "Senior Backend Engineer",
        location: "Remote, United States",
        remote: true,
        employmentType: "full_time",
        postedAt: Date.now() - 24 * 60 * 60 * 1_000,
        validThrough: null,
        url: "https://job-boards.greenhouse.io/gitlab/jobs/8638232002",
        text: "Build services in Go and PostgreSQL.",
      },
    ],
    Date.now(),
    { snapshot: true },
  );
  const [row] = await db.select({ id: jobs.id }).from(jobs);
  return row!.id;
}

async function read(id: string): Promise<JobPostResponse> {
  const res = await GET(new Request(`http://localhost/api/jobs/${id}`), {
    params: Promise.resolve({ id }),
  });
  expect(res.status).toBe(200);
  return (await res.json()) as JobPostResponse;
}

describe("GET /api/jobs/[id]", () => {
  beforeEach(async () => {
    await resetDb();
    cookieJar.clear();
    fakeNet.reset();
    fakeNet.resolve("boards-api.greenhouse.io", "93.184.216.34");
  });

  it("doesn't keep a failed board read for the day, and keeps the next good one", async () => {
    await signInAs();
    const id = await seedJob();
    fakeNet.json(BOARD_API, { status: 500 }, 500);
    const missed = await read(id);
    expect(missed).toMatchObject({ text: "", posting: null });

    fakeNet.json(BOARD_API, GREENHOUSE_JOB);
    const live = await read(id);
    expect(live.text).toContain("Salary range: $120,000–$180,000 & equity.");
    expect(live.posting?.source).toBe("greenhouse");

    fakeNet.json(BOARD_API, { status: 500 }, 500);
    expect((await read(id)).text).toBe(live.text);
    expect(fakeNet.requests).toHaveLength(2);
  });
});
