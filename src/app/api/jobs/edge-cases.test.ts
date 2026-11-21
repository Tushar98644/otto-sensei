import { AuthRetryableFetchError } from "@supabase/supabase-js";
import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import {
  jobs,
  matchCache,
  matchEvents,
  rateLimits,
  savedJobs,
  users,
  workProfiles,
} from "@/db/schema";
import type {
  ApiErrorBody,
  JobMatchesResponse,
  LookingForResponse,
  SavedJobResponse,
  SavedJobsResponse,
} from "@/lib/api/types";
import {
  cookieJar,
  fakeAuth,
  resetDb,
  setPlan,
  signInAs as signInFree,
} from "@/lib/auth/test-helpers";
import { rebuildMatchIndex } from "@/lib/job-feed/match-index";
import { searchOccupations } from "@/lib/job-feed/occupations";
import type { RawJob } from "@/lib/job-feed/parsers";
import { refreshSkillWeights, saveJobs, syncBoards } from "@/lib/job-feed/store";
import { SAVED_JOBS_LIMIT } from "@/lib/job-feed/types";
import { POST as event } from "./events/route";
import { PUT as putLookingFor } from "./looking-for/route";
import { POST as matches } from "./matches/route";
import { GET as occupations } from "./occupations/route";
import { DELETE as unsave, PUT as save } from "./saved/[id]/route";
import { GET as listSaved } from "./saved/route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);
// Outside a request after() throws, as Next's does; a test can hold the work it was handed instead.
const scheduled = vi.hoisted(() => ({ tasks: null as (() => Promise<unknown>)[] | null }));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (task: () => Promise<unknown>) => {
    if (!scheduled.tasks) throw new Error("`after` was called outside a request scope.");
    scheduled.tasks.push(task);
  },
}));
vi.mock("@/lib/job-feed/occupations", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/job-feed/occupations")>();
  return { ...original, searchOccupations: vi.fn(original.searchOccupations) };
});

const NOW = Date.UTC(2026, 10, 21, 12, 30, 15);
const MINUTE_START = Math.floor(NOW / 60_000) * 60_000;
const DAY = 24 * 60 * 60 * 1_000;
const OCCUPATIONS_CACHE = "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400";
const PROFILE = {
  skills: ["TypeScript", "Node.js", "PostgreSQL", "React", "Go"],
  titles: ["Software Engineer"],
  years: 4,
};

const signInAs = async (email?: string) => setPlan(await signInFree(email), "pro");

function raw(id: string, overrides: Partial<RawJob> = {}): RawJob {
  return {
    externalId: id,
    company: "Acme",
    title: "Backend Engineer",
    location: "Remote - Germany",
    remote: true,
    employmentType: "full_time",
    postedAt: Date.now() - DAY,
    validThrough: null,
    url: `https://job-boards.greenhouse.io/acme/jobs/${id}`,
    text: "Build services in TypeScript, Node.js and PostgreSQL on Kubernetes.",
    ...overrides,
  };
}

async function seedJobs(): Promise<Map<string, string>> {
  const db = await getDb();
  await syncBoards(db, [{ ats: "greenhouse", token: "acme", company: "Acme" }], Date.now());
  await saveJobs(
    db,
    { source: "greenhouse", board: "acme" },
    [
      raw("1"),
      raw("2", { title: "Senior Frontend Engineer", text: "React and TypeScript." }),
      raw("3", { title: "Platform Engineer", text: "Go and Kubernetes." }),
    ],
    Date.now(),
    { snapshot: true },
  );
  const rows = await db.select({ id: jobs.id, externalId: jobs.externalId }).from(jobs);
  return new Map(rows.map((row) => [row.externalId, row.id]));
}

const context = (id: string) => ({ params: Promise.resolve({ id }) });

function saveRequest(id: string, method: "PUT" | "DELETE", headers: Record<string, string> = {}) {
  return new Request(`http://localhost/api/jobs/saved/${id}`, { method, headers });
}

const saveJob = (id: string) => save(saveRequest(id, "PUT"), context(id));
const unsaveJob = (id: string, headers?: Record<string, string>) =>
  unsave(saveRequest(id, "DELETE", headers), context(id));

function post(
  handler: (req: Request) => Promise<Response>,
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
  method = "POST",
) {
  return handler(
    new Request(`http://localhost${path}`, {
      method,
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );
}

const search = (body: unknown = { profile: PROFILE }, headers?: Record<string, string>) =>
  post(matches, "/api/jobs/matches", body, headers);
const sendEvent = (body: unknown, headers?: Record<string, string>) =>
  post(event, "/api/jobs/events", body, headers);
const lookFor = (body: unknown, headers?: Record<string, string>) =>
  post(putLookingFor, "/api/jobs/looking-for", body, headers, "PUT");
const searchFor = (q?: string) =>
  occupations(
    new Request(
      `http://localhost/api/jobs/occupations${q === undefined ? "" : `?q=${encodeURIComponent(q)}`}`,
    ),
  );

async function errorOf(res: Response): Promise<ApiErrorBody["error"]> {
  return ((await res.json()) as ApiErrorBody).error;
}

function supabaseDown(): void {
  fakeAuth.failNext("getUser", new AuthRetryableFetchError("fetch failed", 503));
}

async function fillMinuteLimit(key: string, count: number): Promise<void> {
  await (await getDb()).insert(rateLimits).values({ key, windowStart: MINUTE_START, count });
}

async function deleteAccount(userId: string): Promise<void> {
  await (await getDb()).delete(users).where(eq(users.id, userId));
}

// Stands in for the account being deleted after sign-in was checked but before the write.
function deletesAccountWhenRead(
  handler: (req: Request) => Promise<Response>,
  method: string,
  path: string,
  body: unknown,
  userId: string,
): Promise<Response> {
  const bytes = new TextEncoder().encode(JSON.stringify(body));
  const stream = new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        await deleteAccount(userId);
        controller.enqueue(bytes);
        controller.close();
      },
    },
    { highWaterMark: 0 },
  );
  const init = {
    method,
    headers: { "content-type": "application/json" },
    body: stream,
    duplex: "half",
  };
  return handler(new Request(`http://localhost${path}`, init as RequestInit));
}

async function savedRows(userId: string) {
  return (await getDb()).select().from(savedJobs).where(eq(savedJobs.userId, userId));
}

function errorEvents(): unknown[] {
  return vi.mocked(console.error).mock.calls.map((call) => call[0]);
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  await resetDb();
  cookieJar.clear();
  scheduled.tasks = null;
  vi.mocked(searchOccupations).mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  scheduled.tasks = null;
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("GET /api/jobs/occupations", () => {
  it("suggests up to 8 occupations for what's typed, the same for everyone", async () => {
    const res = await searchFor("  Software dev ");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe(OCCUPATIONS_CACHE);
    const body = (await res.json()) as { occupations: { code: string; name: string }[] };
    expect(body.occupations[0]).toEqual({
      code: "15-1252.00",
      name: "Software Developer",
      group: "Computers and maths",
    });
    expect(searchOccupations).toHaveBeenCalledWith("Software dev", 8);
    const broad = (await (await searchFor("engineer")).json()) as { occupations: unknown[] };
    expect(broad.occupations).toHaveLength(8);
  });

  it("answers an empty list when nothing is typed, without searching", async () => {
    for (const q of [undefined, "", "   "]) {
      const res = await searchFor(q);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, occupations: [] });
    }
    expect(searchOccupations).not.toHaveBeenCalled();
  });

  it("takes at most 60 characters", async () => {
    expect((await searchFor("a".repeat(60))).status).toBe(200);
    const res = await searchFor("a".repeat(61));
    expect(res.status).toBe(400);
    expect(res.headers.get("cache-control")).toBeNull();
    expect(await errorOf(res)).toEqual({
      code: "bad_request",
      message: "Type at most 60 characters.",
    });
    expect(searchOccupations).toHaveBeenCalledTimes(1);
  });

  it("answers 500 when the search breaks, and never as a cacheable answer", async () => {
    vi.mocked(searchOccupations).mockImplementationOnce(() => {
      throw new Error("index missing");
    });
    const res = await searchFor("nurse");
    expect(res.status).toBe(500);
    expect(res.headers.get("cache-control")).toBeNull();
    expect(await errorOf(res)).toEqual({
      code: "server_error",
      message: "Search didn't work. Please try again.",
    });
  });
});

describe("GET /api/jobs/saved", () => {
  it("needs a sign-in", async () => {
    const res = await listSaved();
    expect(res.status).toBe(401);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await errorOf(res)).toEqual({
      code: "unauthorized",
      message: "Sign in to see your saved jobs.",
    });
  });

  it("lists only the account's own saves, newest first", async () => {
    const ids = await seedJobs();
    await signInAs("grace@example.com");
    expect((await saveJob(ids.get("2")!)).status).toBe(200);
    await signInAs("ada@example.com");
    expect((await saveJob(ids.get("1")!)).status).toBe(200);
    vi.setSystemTime(NOW + 1_000);
    expect((await saveJob(ids.get("3")!)).status).toBe(200);

    const res = await listSaved();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = (await res.json()) as SavedJobsResponse;
    expect(body.jobs.map((job) => [job.title, job.savedAt])).toEqual([
      ["Platform Engineer", NOW + 1_000],
      ["Backend Engineer", NOW],
    ]);

    await signInAs("grace@example.com");
    const theirs = (await (await listSaved()).json()) as SavedJobsResponse;
    expect(theirs.jobs.map((job) => job.title)).toEqual(["Senior Frontend Engineer"]);
  });

  it("answers 500 when sign-in can't be checked", async () => {
    await signInAs();
    supabaseDown();
    const res = await listSaved();
    expect(res.status).toBe(500);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect((await errorOf(res)).message).toBe("Couldn't load your saved jobs. Please try again.");
    expect(errorEvents()).toEqual(["[error] jobs.saved_list_failed"]);
  });
});

describe("saving and removing a job", () => {
  it(`stops at ${SAVED_JOBS_LIMIT} saved jobs, still answering for one already saved`, async () => {
    const ada = await signInAs();
    const ids = await seedJobs();
    const db = await getDb();
    await db.execute(sql`
      insert into public.jobs (id, source, external_id, board, company, title, posted_at, url,
        search, dedupe_key, content_hash, first_seen_at, last_seen_at, created_at, updated_at)
      select gen_random_uuid(), source, external_id || '-copy-' || n, board, company, title,
        posted_at, url, search, dedupe_key || '-' || n, content_hash, first_seen_at,
        last_seen_at, created_at, updated_at
      from public.jobs cross join generate_series(1, ${SAVED_JOBS_LIMIT}) as n
      where external_id = '1'`);
    await db.execute(sql`
      insert into public.saved_jobs (user_id, job_id, saved_at)
      select ${ada.id}, id, ${NOW} from public.jobs where external_id like '1-copy-%'`);
    const [copy] = await db
      .select({ id: jobs.id })
      .from(jobs)
      .where(eq(jobs.externalId, "1-copy-1"));

    const full = await saveJob(ids.get("2")!);
    expect(full.status).toBe(400);
    expect(full.headers.get("cache-control")).toBe("no-store");
    expect(await errorOf(full)).toEqual({
      code: "bad_request",
      message: `You can save up to ${SAVED_JOBS_LIMIT} jobs. Remove some to save more.`,
    });
    expect(await saveJob(copy!.id).then((res) => res.json())).toEqual({
      ok: true,
      saved: true,
      savedCount: SAVED_JOBS_LIMIT,
    });

    expect(((await (await unsaveJob(copy!.id)).json()) as SavedJobResponse).savedCount).toBe(
      SAVED_JOBS_LIMIT - 1,
    );
    expect(((await (await saveJob(ids.get("2")!)).json()) as SavedJobResponse).savedCount).toBe(
      SAVED_JOBS_LIMIT,
    );
  });

  it("lets an account remove its saves after Pro ends, and never touches another account's", async () => {
    const ids = await seedJobs();
    const first = ids.get("1")!;
    const grace = await signInAs("grace@example.com");
    await saveJob(first);
    const ada = await signInAs("ada@example.com");
    await saveJob(first);
    await (await getDb()).update(users).set({ plan: "free" }).where(eq(users.id, ada.id));

    const locked = await saveJob(ids.get("2")!);
    expect(locked.status).toBe(402);
    expect((await errorOf(locked)).code).toBe("upgrade_required");
    const removed = await unsaveJob(first);
    expect(removed.status).toBe(200);
    expect(removed.headers.get("cache-control")).toBe("no-store");
    expect(await removed.json()).toEqual({ ok: true, saved: false, savedCount: 0 });
    expect(await savedRows(ada.id)).toEqual([]);
    expect((await savedRows(grace.id)).map((row) => row.jobId)).toEqual([first]);

    await signInAs("grace@example.com");
    const notTheirs = await unsaveJob(ids.get("3")!);
    expect(await notTheirs.json()).toEqual({ ok: true, saved: false, savedCount: 1 });
    expect(await savedRows(grace.id)).toHaveLength(1);
  });

  it("answers the count for an id that isn't a job id, removing nothing", async () => {
    const ids = await seedJobs();
    const ada = await signInAs();
    await saveJob(ids.get("1")!);
    const res = await unsaveJob("nope");
    expect(await res.json()).toEqual({ ok: true, saved: false, savedCount: 1 });
    expect(await savedRows(ada.id)).toHaveLength(1);
  });

  it("needs a sign-in and this website to remove a save", async () => {
    const ids = await seedJobs();
    const ada = await signInAs();
    const first = ids.get("1")!;
    await saveJob(first);

    const crossSite = await unsaveJob(first, { "sec-fetch-site": "cross-site" });
    expect(crossSite.status).toBe(403);
    expect((await errorOf(crossSite)).code).toBe("forbidden");
    cookieJar.clear();
    const signedOut = await unsaveJob(first);
    expect(signedOut.status).toBe(401);
    expect(await errorOf(signedOut)).toEqual({
      code: "unauthorized",
      message: "Sign in to save jobs.",
    });
    expect(await savedRows(ada.id)).toHaveLength(1);
  });

  it("answers 401 when the account is deleted while a save is under way", async () => {
    const ids = await seedJobs();
    const ada = await signInAs();
    const first = ids.get("1")!;
    // The id is read after the sign-in and plan checks, just before the save.
    const res = await save(saveRequest(first, "PUT"), {
      get params() {
        return deleteAccount(ada.id).then(() => ({ id: first }));
      },
    });
    expect(res.status).toBe(401);
    expect((await errorOf(res)).message).toBe("Sign in to save jobs.");
    expect(await (await getDb()).select().from(savedJobs)).toEqual([]);
  });

  it("answers 500 when sign-in can't be checked, keeping the saves", async () => {
    const ids = await seedJobs();
    const ada = await signInAs();
    const first = ids.get("1")!;
    await saveJob(first);

    supabaseDown();
    const saving = await saveJob(ids.get("2")!);
    expect(saving.status).toBe(500);
    expect(saving.headers.get("cache-control")).toBe("no-store");
    expect((await errorOf(saving)).message).toBe("Couldn't save that job. Please try again.");
    supabaseDown();
    const removing = await unsaveJob(first);
    expect(removing.status).toBe(500);
    expect((await errorOf(removing)).message).toBe("Couldn't remove that job. Please try again.");

    expect((await savedRows(ada.id)).map((row) => row.jobId)).toEqual([first]);
    expect(errorEvents()).toEqual(["[error] jobs.save_failed", "[error] jobs.unsave_failed"]);
  });
});

describe("PUT /api/jobs/looking-for", () => {
  const CHOICE = {
    role: { title: "Account Executive", family: "sales" },
    level: "mid",
    place: "c:US",
    remote: true,
  };

  it("needs a sign-in, this website and JSON, storing nothing otherwise", async () => {
    const signedOut = await lookFor(CHOICE);
    expect(signedOut.status).toBe(401);
    expect(signedOut.headers.get("cache-control")).toBe("no-store");
    expect(await errorOf(signedOut)).toEqual({
      code: "unauthorized",
      message: "Sign in to keep what you're looking for.",
    });
    await signInFree();
    expect((await lookFor(CHOICE, { "sec-fetch-site": "cross-site" })).status).toBe(403);
    expect((await lookFor(CHOICE, { "content-type": "text/plain" })).status).toBe(415);
    expect(await (await getDb()).select().from(workProfiles)).toEqual([]);
  });

  it("clears the choice back to nothing", async () => {
    const ada = await signInFree();
    expect((await lookFor(CHOICE)).status).toBe(200);
    const cleared = { role: null, level: null, place: null, remote: false };
    const res = await lookFor(cleared);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(((await res.json()) as LookingForResponse).choice).toEqual(cleared);
    const [row] = await (
      await getDb()
    )
      .select()
      .from(workProfiles)
      .where(eq(workProfiles.userId, ada.id));
    expect(row).toMatchObject({
      targetTitle: null,
      targetFamily: null,
      targetLevel: null,
      targetPlace: null,
      remoteOnly: false,
    });
  });

  it("answers 401 when the account is deleted while the choice is saved", async () => {
    const ada = await signInFree();
    const res = await deletesAccountWhenRead(
      putLookingFor,
      "PUT",
      "/api/jobs/looking-for",
      CHOICE,
      ada.id,
    );
    expect(res.status).toBe(401);
    expect((await errorOf(res)).message).toBe("Sign in to keep what you're looking for.");
    expect(await (await getDb()).select().from(workProfiles)).toEqual([]);
  });

  it("answers 500 when sign-in can't be checked", async () => {
    await signInFree();
    supabaseDown();
    const res = await lookFor(CHOICE);
    expect(res.status).toBe(500);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await errorOf(res)).toEqual({
      code: "server_error",
      message: "Couldn't save that. Please try again.",
    });
    expect(await (await getDb()).select().from(workProfiles)).toEqual([]);
  });
});

describe("POST /api/jobs/events", () => {
  const open = () => ({ kind: "open", jobId: crypto.randomUUID() });

  it("needs this website and JSON", async () => {
    await signInAs();
    const crossSite = await sendEvent(open(), { "sec-fetch-site": "cross-site" });
    expect(crossSite.status).toBe(403);
    expect((await sendEvent(open(), { "content-type": "text/plain" })).status).toBe(415);
    expect(await (await getDb()).select().from(matchEvents)).toEqual([]);
  });

  it("takes 120 events a minute per account", async () => {
    const ada = await signInAs();
    await fillMinuteLimit(`jobs-events:user:${ada.id}`, 120);
    const res = await sendEvent(open());
    expect(res.status).toBe(429);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("retry-after")).toBe(String((MINUTE_START + 60_000 - NOW) / 1000));
    expect(await errorOf(res)).toEqual({
      code: "rate_limited",
      message: "Too many at once. Try again in a minute.",
    });
    expect(await (await getDb()).select().from(matchEvents)).toEqual([]);

    await signInAs("grace@example.com");
    expect((await sendEvent(open())).status).toBe(200);
  });

  it("answers 500 when the event can't be written, saying nothing else changed", async () => {
    const ada = await signInAs();
    const res = await deletesAccountWhenRead(event, "POST", "/api/jobs/events", open(), ada.id);
    expect(res.status).toBe(500);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await errorOf(res)).toEqual({
      code: "server_error",
      message: "Couldn't note that. It doesn't change anything else.",
    });
    expect(errorEvents()).toEqual(["[error] jobs.event_failed"]);
    expect(await (await getDb()).select().from(matchEvents)).toEqual([]);
  });
});

describe("POST /api/jobs/matches", () => {
  it("refuses other websites", async () => {
    await signInAs();
    const res = await search({ profile: PROFILE }, { "sec-fetch-site": "cross-site" });
    expect(res.status).toBe(403);
    expect((await errorOf(res)).code).toBe("forbidden");
  });

  it("takes 60 searches a minute per account, logging nothing for a refused one", async () => {
    const ada = await signInAs();
    await seedJobs();
    await fillMinuteLimit(`jobs:user:${ada.id}`, 60);
    const res = await search();
    expect(res.status).toBe(429);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("retry-after")).toBe(String((MINUTE_START + 60_000 - NOW) / 1000));
    expect(await errorOf(res)).toEqual({
      code: "rate_limited",
      message: "That's a lot of searches at once. Try again in a minute.",
    });
    expect(await (await getDb()).select().from(matchEvents)).toEqual([]);
  });

  it("answers 500 when sign-in can't be checked", async () => {
    await signInAs();
    await seedJobs();
    supabaseDown();
    const res = await search();
    expect(res.status).toBe(500);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await errorOf(res)).toEqual({
      code: "server_error",
      message: "Couldn't load jobs right now. Please try again.",
    });
    expect(await (await getDb()).select().from(matchEvents)).toEqual([]);
  });

  it("keeps its answer when the impressions can't be written after it", async () => {
    const ada = await signInAs();
    await seedJobs();
    scheduled.tasks = [];
    const res = await search();
    expect(res.status).toBe(200);
    const body = (await res.json()) as JobMatchesResponse;
    expect(body.jobs.map((job) => job.title)).toEqual([
      "Backend Engineer",
      "Senior Frontend Engineer",
      "Platform Engineer",
    ]);
    expect(scheduled.tasks).toHaveLength(1);

    await deleteAccount(ada.id);
    for (const task of scheduled.tasks) await expect(task()).resolves.toBeUndefined();
    expect(await (await getDb()).select().from(matchEvents)).toEqual([]);
    expect(errorEvents()).toEqual(["[error] jobs.impressions_failed"]);
  });

  it("keeps a ranked page once the match index is built, and answers the same search from it with saves up to date", async () => {
    const ada = await signInAs();
    const ids = await seedJobs();
    const db = await getDb();
    await refreshSkillWeights(db, NOW);
    await rebuildMatchIndex(db, NOW);

    scheduled.tasks = [];
    const first = (await (await search()).json()) as JobMatchesResponse;
    expect(first.jobs.map((job) => job.title)).toEqual([
      "Backend Engineer",
      "Senior Frontend Engineer",
      "Platform Engineer",
    ]);
    expect(await db.select().from(matchCache)).toEqual([]);
    for (const task of scheduled.tasks.splice(0)) await task();
    const kept = async () =>
      (await db.select().from(matchCache)).map((row) => [row.userId, row.createdAt]);
    expect(await kept()).toEqual([[ada.id, NOW]]);
    expect(await db.select().from(matchEvents)).toHaveLength(3);

    expect((await saveJob(ids.get("2")!)).status).toBe(200);
    vi.setSystemTime(NOW + 1_000);
    const again = (await (await search()).json()) as JobMatchesResponse;
    for (const task of scheduled.tasks.splice(0)) await task();
    expect(again.jobs.map((job) => [job.title, job.saved])).toEqual([
      ["Backend Engineer", false],
      ["Senior Frontend Engineer", true],
      ["Platform Engineer", false],
    ]);
    expect(again.savedCount).toBe(1);
    expect(again.requestId).not.toBe(first.requestId);
    // Answered from the kept page, so it wasn't written again.
    expect(await kept()).toEqual([[ada.id, NOW]]);
    expect(await db.select().from(matchEvents)).toHaveLength(6);
  });
});
