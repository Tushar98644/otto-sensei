import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import type { JobPostResponse } from "@/lib/api/types";
import { cookieJar, resetDb, signInAs } from "@/lib/auth/test-helpers";
import { saveJobs, syncBoards } from "@/lib/job-feed/store";
import { storedJobIds } from "@/lib/job-feed/test-fixtures";
import { GREENHOUSE_JOB } from "@/lib/jobs/test-fixtures";
import { fakeNet } from "@/lib/jobs/test-network";
import { HOUR_MS, MINUTE_MS } from "@/lib/time";
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
const NOW = Date.UTC(2026, 10, 21, 12, 30, 0);

async function seedJob(): Promise<string> {
  const db = await getDb();
  await syncBoards(db, [{ ats: "greenhouse", token: "gitlab", company: "GitLab" }]);
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
  const [row] = await storedJobIds(db);
  return row!.id;
}

function open(id: string): Promise<Response> {
  return GET(new Request(`http://localhost/api/jobs/${id}`), { params: Promise.resolve({ id }) });
}

async function read(id: string): Promise<JobPostResponse> {
  const res = await open(id);
  expect(res.status).toBe(200);
  return (await res.json()) as JobPostResponse;
}

describe("GET /api/jobs/[id]", () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    await resetDb();
    cookieJar.clear();
    fakeNet.reset();
    fakeNet.resolve("boards-api.greenhouse.io", "93.184.216.34");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("doesn't keep a failed board read for the day, and keeps the next good one", async () => {
    await signInAs();
    const id = await seedJob();
    fakeNet.json(BOARD_API, { status: 500 }, 500);
    const missed = await read(id);
    expect(missed).toMatchObject({ text: "", posting: null });

    fakeNet.json(BOARD_API, GREENHOUSE_JOB);
    vi.setSystemTime(NOW + 15 * MINUTE_MS);
    const live = await read(id);
    expect(live.text).toContain("Salary range: $120,000–$180,000 & equity.");
    expect(live.posting?.source).toBe("greenhouse");

    fakeNet.json(BOARD_API, { status: 500 }, 500);
    expect((await read(id)).text).toBe(live.text);
    expect(fakeNet.requests).toHaveLength(2);
  });

  it("asks a board that failed again only after 15 minutes, answering the stored text meanwhile", async () => {
    await signInAs();
    const id = await seedJob();
    fakeNet.json(BOARD_API, { status: 500 }, 500);
    expect(await read(id)).toMatchObject({ text: "", posting: null });

    fakeNet.json(BOARD_API, GREENHOUSE_JOB);
    for (const at of [NOW, NOW + MINUTE_MS, NOW + 15 * MINUTE_MS - 1]) {
      vi.setSystemTime(at);
      expect(await read(id)).toMatchObject({ text: "", posting: null });
    }
    expect(fakeNet.requests).toHaveLength(1);

    vi.setSystemTime(NOW + 15 * MINUTE_MS);
    expect((await read(id)).posting?.source).toBe("greenhouse");
    expect(fakeNet.requests).toHaveLength(2);
  });

  it("caps job opens at 120 an hour per account", async () => {
    await signInAs();
    const id = await seedJob();
    fakeNet.json(BOARD_API, GREENHOUSE_JOB);
    for (let i = 0; i < 120; i++) await read(id);

    const res = await open(id);
    expect(res.status).toBe(429);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("retry-after")).toBe(String((HOUR_MS - (NOW % HOUR_MS)) / 1_000));
    expect(await res.json()).toMatchObject({ ok: false, error: { code: "rate_limited" } });

    await signInAs("grace@example.com");
    expect((await read(id)).posting?.source).toBe("greenhouse");
    expect(fakeNet.requests).toHaveLength(1);
  });
});
