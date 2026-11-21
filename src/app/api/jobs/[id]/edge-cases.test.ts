import { AuthRetryableFetchError } from "@supabase/supabase-js";
import { asc, eq, like, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { jobs, rateLimits } from "@/db/schema";
import type { ApiErrorBody, JobPostResponse } from "@/lib/api/types";
import { cookieJar, fakeAuth, resetDb, signInAs } from "@/lib/auth/test-helpers";
import { jobById } from "@/lib/job-feed/records";
import { saveJobs, syncBoards } from "@/lib/job-feed/store";
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
vi.mock("@/lib/job-feed/records", async (importOriginal) => {
  const records = await importOriginal<typeof import("@/lib/job-feed/records")>();
  return { ...records, jobById: vi.fn(records.jobById) };
});

const NOW = Date.UTC(2026, 10, 21, 12, 30, 0);
const STORED_TEXT = "Build services in Go and PostgreSQL.";
const GONE = { code: "not_found", message: "That job isn't here any more." };

const POSTED = {
  company: "GitLab",
  title: "Senior Backend Engineer",
  location: "Remote, United States",
  remote: true,
  employmentType: "full_time" as const,
  postedAt: NOW - 24 * 60 * 60 * 1_000,
  validThrough: null,
};

async function onlyJobId(): Promise<string> {
  const [row] = await (await getDb()).select({ id: jobs.id }).from(jobs);
  return row!.id;
}

// A closed job is never read from its board again, and a board job keeps no text of its own.
async function seedClosedJob(): Promise<string> {
  const db = await getDb();
  await syncBoards(db, [{ ats: "greenhouse", token: "gitlab", company: "GitLab" }], NOW);
  await saveJobs(
    db,
    { source: "greenhouse", board: "gitlab" },
    [
      {
        ...POSTED,
        externalId: "8638232002",
        url: "https://job-boards.greenhouse.io/gitlab/jobs/8638232002",
        text: STORED_TEXT,
      },
    ],
    NOW,
    { snapshot: true },
  );
  const id = await onlyJobId();
  await db.update(jobs).set({ closedAt: NOW, closeReason: "gone" }).where(eq(jobs.id, id));
  return id;
}

// A feed's job keeps its text and is never read live.
async function seedFeedJob(): Promise<string> {
  const db = await getDb();
  await saveJobs(
    db,
    { source: "himalayas", board: "" },
    [
      {
        ...POSTED,
        externalId: "gitlab-senior-backend",
        url: "https://himalayas.app/companies/gitlab/jobs/senior-backend-engineer",
        text: STORED_TEXT,
      },
    ],
    NOW,
    { snapshot: false },
  );
  return onlyJobId();
}

function open(id: string): Promise<Response> {
  return GET(new Request(`http://localhost/api/jobs/${id}`), { params: Promise.resolve({ id }) });
}

async function errorOf(res: Response): Promise<ApiErrorBody["error"]> {
  return ((await res.json()) as ApiErrorBody).error;
}

describe("GET /api/jobs/[id]", () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    await resetDb();
    cookieJar.clear();
    fakeNet.reset();
    vi.mocked(jobById).mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("needs a sign-in, and reads nothing for a signed-out caller", async () => {
    const id = await seedClosedJob();
    const res = await open(id);
    expect(res.status).toBe(401);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await errorOf(res)).toEqual({
      code: "unauthorized",
      message: "Sign in to tailor your resume to this job.",
    });
    expect(jobById).not.toHaveBeenCalled();
  });

  it("answers 404 for an id that isn't a job id or isn't stored", async () => {
    await signInAs();
    const malformed = await open("not-a-job");
    expect(malformed.status).toBe(404);
    expect(malformed.headers.get("cache-control")).toBe("no-store");
    expect(await errorOf(malformed)).toEqual(GONE);
    expect(jobById).not.toHaveBeenCalled();

    const missing = await open(crypto.randomUUID());
    expect(missing.status).toBe(404);
    expect(await errorOf(missing)).toEqual(GONE);
    expect(fakeNet.requests).toHaveLength(0);
  });

  it("opens a closed job without asking its board", async () => {
    await signInAs();
    const id = await seedClosedJob();
    const res = await open(id);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toMatchObject({
      text: "",
      posting: null,
      job: { id, title: "Senior Backend Engineer", company: "GitLab", closed: true },
    });
    expect(fakeNet.requests).toHaveLength(0);
  });

  it("opens a feed's job from its stored text, once, without asking anyone", async () => {
    await signInAs();
    const id = await seedFeedJob();
    const body = (await (await open(id)).json()) as JobPostResponse;
    expect(body).toMatchObject({
      text: STORED_TEXT,
      posting: null,
      job: { id, source: "himalayas", closed: false },
    });
    expect(body.job).not.toHaveProperty("description");
    expect(await (await open(id)).json()).toEqual(body);
    expect(jobById).toHaveBeenCalledTimes(1);
    expect(fakeNet.requests).toHaveLength(0);
  });

  it("answers 500 when the job can't be read, and opens it once the database is back", async () => {
    await signInAs();
    const id = await seedFeedJob();
    vi.mocked(jobById).mockRejectedValueOnce(new Error("connection terminated unexpectedly"));
    const res = await open(id);
    expect(res.status).toBe(500);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({
      ok: false,
      error: { code: "server_error", message: "Couldn't open that job. Please try again." },
    });
    expect(text).not.toContain("connection terminated");
    expect(vi.mocked(console.error).mock.calls.map((call) => call[0])).toEqual([
      "[error] jobs.read_failed",
    ]);

    expect(((await (await open(id)).json()) as JobPostResponse).text).toBe(STORED_TEXT);
  });

  it("answers 500 when sign-in can't be checked", async () => {
    await signInAs();
    const id = await seedClosedJob();
    fakeAuth.failNext("getUser", new AuthRetryableFetchError("fetch failed", 503));
    const res = await open(id);
    expect(res.status).toBe(500);
    expect((await errorOf(res)).code).toBe("server_error");
    expect(jobById).not.toHaveBeenCalled();
  });

  it("remembers at most 1,000 boards that just failed, forgetting the oldest first", async () => {
    await signInAs();
    fakeNet.resolve("boards-api.greenhouse.io", "93.184.216.34");
    await seedClosedJob();
    const db = await getDb();
    await db.execute(sql`
      insert into public.jobs (id, source, external_id, board, company, title, posted_at, url,
        search, dedupe_key, content_hash, first_seen_at, last_seen_at, created_at, updated_at)
      select gen_random_uuid(), source, (9000000000 + n)::text, board, company, title, posted_at,
        'https://job-boards.greenhouse.io/gitlab/jobs/' || (9000000000 + n)::text, search,
        dedupe_key || '-' || n, content_hash, first_seen_at, last_seen_at, created_at, updated_at
      from public.jobs cross join generate_series(1, 1001) as n`);
    const live = await db
      .select({ id: jobs.id })
      .from(jobs)
      .where(like(jobs.externalId, "9%"))
      .orderBy(asc(jobs.externalId));
    expect(live).toHaveLength(1_001);

    for (const [i, { id }] of live.entries()) {
      // Only the miss list is under test here, not the hourly cap on opens.
      if (i % 100 === 0) await db.delete(rateLimits);
      expect((await open(id)).status).toBe(200);
    }
    expect(fakeNet.requests).toHaveLength(1_001);

    expect(await (await open(live[1]!.id)).json()).toMatchObject({ posting: null });
    expect(fakeNet.requests).toHaveLength(1_001);
    expect(await (await open(live[0]!.id)).json()).toMatchObject({ posting: null });
    expect(fakeNet.requests).toHaveLength(1_002);
    expect(fakeNet.urls().at(-1)).toContain("/jobs/9000000001");
  });
});
