import { ne } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FREE_JOB_MATCHES } from "@/config/plans";
import { getDb } from "@/db/client";
import { jobs, matchEvents } from "@/db/schema";
import type { ApiErrorBody, JobMatchesResponse, SavedJobResponse } from "@/lib/api/types";
import { cookieJar, resetDb, setPlan, signInAs as signInFree } from "@/lib/auth/test-helpers";
import { saveWorkProfile } from "@/lib/eligibility/records";
import { emptyWorkProfile } from "@/lib/eligibility/profile";
import type { RawJob } from "@/lib/job-feed/parsers";
import { saveJobs, syncBoards } from "@/lib/job-feed/store";
import { JOBS_PREFETCH_HEADER } from "@/lib/job-feed/prefetch-header";
import type { JobMatchesRequestBody } from "@/lib/job-feed/types";
import { freezeClock } from "@/lib/timing-testing";
import { GET as getProfile } from "../profile/route";
import type { LookingForResponse, WorkProfileResponse } from "@/lib/api/types";
import { POST as event } from "./events/route";
import { PUT as putLookingFor } from "./looking-for/route";
import { POST as matches } from "./matches/route";
import { DELETE as unsave, PUT as save } from "./saved/[id]/route";

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

const signInAs = async (email?: string) => setPlan(await signInFree(email), "pro");

const DAY = 24 * 60 * 60 * 1_000;

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

async function seedJobs() {
  const db = await getDb();
  await syncBoards(db, [{ ats: "greenhouse", token: "acme", company: "Acme" }], Date.now());
  await saveJobs(
    db,
    { source: "greenhouse", board: "acme" },
    [
      raw("1"),
      raw("2", {
        title: "Senior Frontend Engineer",
        text: "React and TypeScript.",
        postedAt: Date.now() - 2 * DAY,
      }),
      raw("3", {
        title: "Platform Engineer",
        location: "Austin, TX",
        remote: false,
        text: "Go and Kubernetes. Applicants must be authorized to work in the US. We do not sponsor visas.",
      }),
      raw("4", { title: "Account Executive", text: "Sell with Salesforce." }),
    ],
    Date.now(),
    { snapshot: true },
  );
  return db.select({ id: jobs.id, externalId: jobs.externalId }).from(jobs);
}

const PROFILE = {
  skills: ["TypeScript", "Node.js", "PostgreSQL", "React", "Go"],
  titles: ["Software Engineer"],
  years: 4,
};

function call(
  body: unknown,
  headers: Record<string, string> = { "content-type": "application/json" },
) {
  return matches(
    new Request("http://localhost/api/jobs/matches", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }),
  );
}

async function ranked(body: Partial<JobMatchesRequestBody> = {}): Promise<JobMatchesResponse> {
  const res = await call({ profile: PROFILE, ...body });
  expect(res.status).toBe(200);
  expect(res.headers.get("cache-control")).toBe("no-store");
  return (await res.json()) as JobMatchesResponse;
}

const context = (id: string) => ({ params: Promise.resolve({ id }) });

function sendEvent(body: unknown) {
  return event(
    new Request("http://localhost/api/jobs/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("the Jobs tab on Free", () => {
  beforeEach(async () => {
    await resetDb();
    cookieJar.clear();
  });

  it("gets the closest few, unfiltered, and the trial prompt for saving", async () => {
    const user = await signInFree();
    const [first] = await seedJobs();
    const preview = await ranked({ filters: { remote: true }, view: "saved", page: 2 });
    expect(preview).toMatchObject({
      locked: true,
      total: 3,
      matching: 3,
      strong: 2,
      openJobs: 4,
      profileReady: false,
    });
    expect(preview.jobs.map((job) => job.title)).toEqual([
      "Backend Engineer",
      "Senior Frontend Engineer",
      "Platform Engineer",
    ]);
    expect(preview.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(await (await getDb()).select().from(matchEvents)).toHaveLength(3);

    const put = await save(
      new Request(`http://localhost/api/jobs/saved/${first!.id}`, { method: "PUT" }),
      context(first!.id),
    );
    expect(put.status).toBe(402);
    expect(((await put.json()) as ApiErrorBody).error).toEqual({
      code: "upgrade_required",
      message: "Filters, saved jobs and every match come with Pro. Try Pro for 3 days.",
    });
    await setPlan(user, "trial");
    const full = await ranked({ filters: { remote: true } });
    expect(full.locked).toBeUndefined();
    expect(full.jobs.map((job) => job.title)).toEqual([
      "Backend Engineer",
      "Senior Frontend Engineer",
    ]);
  });

  it("lets Free set what it's looking for, and ranks its few for it", async () => {
    await signInFree();
    await seedJobs();
    const choice = {
      role: { title: "Account Executive", family: "sales" },
      level: null,
      place: "c:US",
      remote: true,
    };
    const res = await putLookingFor(
      new Request("http://localhost/api/jobs/looking-for", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(choice),
      }),
    );
    expect(res.status).toBe(200);
    const stored = { ...choice, role: { ...choice.role, occupation: null } };
    expect(((await res.json()) as LookingForResponse).choice).toEqual(stored);
    const read = (await (await getProfile()).json()) as WorkProfileResponse;
    expect(read.lookingFor).toEqual(stored);
    expect(read.profile.remoteOnly).toBe(true);

    const lookingFor = {
      title: "Account Executive",
      family: "sales" as const,
      level: "mid" as const,
      place: "g:eu" as const,
      remote: true,
    };
    const preview = await ranked({ lookingFor });
    expect(preview.lookingFor).toEqual({ ...lookingFor, occupation: "41-4011.00" });
    expect(preview.occupation?.name).toBe("Sales Representative (technical products)");
    expect(preview.jobs.map((job) => [job.title, job.match.label])).toEqual([
      ["Backend Engineer", "good"],
      ["Senior Frontend Engineer", "good"],
      ["Account Executive", "stretch"],
    ]);

    const bad = await putLookingFor(
      new Request("http://localhost/api/jobs/looking-for", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...choice, place: "c:XX" }),
      }),
    );
    expect(bad.status).toBe(400);
  });

  it(`shows Free at most ${FREE_JOB_MATCHES} and counts the rest`, async () => {
    await signInFree();
    const db = await getDb();
    await syncBoards(db, [{ ats: "greenhouse", token: "acme", company: "Acme" }], Date.now());
    await saveJobs(
      db,
      { source: "greenhouse", board: "acme" },
      Array.from({ length: 8 }, (_, i) =>
        raw(String(i), { title: `Backend Engineer, Team ${i}`, company: `Company ${i}` }),
      ),
      Date.now(),
      { snapshot: true },
    );
    const preview = await ranked();
    expect(preview).toMatchObject({ locked: true, matching: 8 });
    expect(preview.jobs).toHaveLength(FREE_JOB_MATCHES);
    expect(preview.jobs.map((job) => job.position)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("POST /api/jobs/matches", () => {
  beforeEach(async () => {
    await resetDb();
    cookieJar.clear();
  });

  it("needs a sign-in and JSON", async () => {
    expect((await call({ profile: PROFILE })).status).toBe(401);
    await signInAs();
    expect((await call({ profile: PROFILE }, { "content-type": "text/plain" })).status).toBe(415);
    const bad = await call({ profile: { ...PROFILE, years: -1 } });
    expect(bad.status).toBe(400);
    expect(((await bad.json()) as ApiErrorBody).error.code).toBe("bad_request");
  });

  it("ranks the matching jobs with labels and reasons, and leaves out the rest", async () => {
    await signInAs();
    await seedJobs();
    const body = await ranked();
    expect(body.jobs.map((job) => [job.title, job.match.label])).toEqual([
      ["Backend Engineer", "strong"],
      ["Senior Frontend Engineer", "strong"],
      ["Platform Engineer", "good"],
    ]);
    expect(body.jobs[0]!.match.reason).toBe(
      "Found in your resume: TypeScript, Node.js, PostgreSQL. Not found: Kubernetes.",
    );
    expect(body).toMatchObject({
      total: 3,
      strong: 2,
      newToday: 3,
      openJobs: 4,
      savedCount: 0,
      profileReady: false,
    });
    expect(JSON.stringify(body)).not.toMatch(/score/i);
  });

  it("uses the work profile for rules, and hides blocked jobs when asked", async () => {
    const user = await signInAs();
    await seedJobs();
    await saveWorkProfile(user.id, {
      ...emptyWorkProfile(),
      country: "DE",
      rights: { us: "sponsorship", uk: null, eu: "authorized", ca: null },
    });
    const lookingFor = {
      title: "Software Engineer",
      family: "engineering" as const,
      level: null,
      place: "anywhere" as const,
      remote: false,
    };
    const all = await ranked({ lookingFor });
    const platform = all.jobs.find((job) => job.title === "Platform Engineer")!;
    expect(platform.match).toMatchObject({ label: "stretch", blocked: true });
    expect(all.profileReady).toBe(true);
    const eligible = await ranked({ lookingFor, filters: { eligibleOnly: true } });
    expect(eligible.jobs.map((job) => job.title)).not.toContain("Platform Engineer");
  });

  it("filters and pages", async () => {
    await signInAs();
    await seedJobs();
    expect((await ranked({ filters: { remote: true } })).jobs.map((job) => job.title)).toEqual([
      "Backend Engineer",
      "Senior Frontend Engineer",
    ]);
    expect((await ranked({ filters: { level: "senior" } })).total).toBe(1);
    expect((await ranked({ filters: { q: "frontend" } })).total).toBe(1);
    expect((await ranked({ page: 2 })).jobs).toEqual([]);
  });

  it("saves and unsaves jobs, and lists the saved ones", async () => {
    await signInAs();
    const first = (await seedJobs()).find((row) => row.externalId === "1");
    const put = await save(
      new Request(`http://localhost/api/jobs/saved/${first!.id}`, { method: "PUT" }),
      context(first!.id),
    );
    expect((await put.json()) as SavedJobResponse).toMatchObject({
      ok: true,
      saved: true,
      savedCount: 1,
    });
    const savedView = await ranked({ view: "saved" });
    expect(savedView.jobs.map((job) => [job.id, job.saved])).toEqual([[first!.id, true]]);
    expect((await ranked()).jobs.find((job) => job.id === first!.id)?.saved).toBe(true);

    const del = await unsave(
      new Request(`http://localhost/api/jobs/saved/${first!.id}`, { method: "DELETE" }),
      context(first!.id),
    );
    expect((await del.json()) as SavedJobResponse).toMatchObject({ saved: false, savedCount: 0 });
    expect((await ranked({ view: "saved" })).jobs).toEqual([]);
  });

  it("logs what it showed and what was done with it, never the resume", async () => {
    const user = await signInAs();
    await seedJobs();
    const body = await ranked();
    expect(body).toMatchObject({ variant: "occupation-v6", matching: 3 });
    expect(body.requestId).toMatch(/^[0-9a-f-]{36}$/);
    const db = await getDb();
    const shown = await db.select().from(matchEvents).orderBy(matchEvents.position);
    expect(shown.map((row) => [row.kind, row.position, row.label])).toEqual([
      ["impression", 1, "strong"],
      ["impression", 2, "strong"],
      ["impression", 3, "good"],
    ]);
    expect(shown[0]).toMatchObject({
      userId: user.id,
      requestId: body.requestId,
      resumeHash: body.resumeHash,
    });
    expect(JSON.stringify(shown)).not.toMatch(/TypeScript|Software Engineer/);

    const first = body.jobs[0]!;
    const action = {
      jobId: first.id,
      requestId: body.requestId,
      position: first.position,
      label: first.match.label,
      variant: body.variant,
      resumeHash: body.resumeHash,
    };
    expect((await sendEvent({ ...action, kind: "not_fit", reason: "level" })).status).toBe(200);
    expect((await sendEvent({ ...action, kind: "open" })).status).toBe(200);
    expect((await sendEvent({ ...action, kind: "not_fit" })).status).toBe(400);
    expect((await sendEvent({ ...action, kind: "save", reason: "role" })).status).toBe(400);
    expect((await sendEvent({ ...action, kind: "asked_applied", answer: "yes" })).status).toBe(200);
    expect(
      (await sendEvent({ jobId: first.id, kind: "asked_applied", answer: "not_yet" })).status,
    ).toBe(200);
    expect((await sendEvent({ ...action, kind: "asked_applied" })).status).toBe(400);
    expect((await sendEvent({ ...action, kind: "open", answer: "yes" })).status).toBe(400);
    expect((await sendEvent({ ...action, kind: "asked_applied", answer: "maybe" })).status).toBe(
      400,
    );
    const actions = await db.select().from(matchEvents).where(ne(matchEvents.kind, "impression"));
    expect(actions.map((row) => [row.kind, row.reason, row.answer, row.position])).toEqual(
      expect.arrayContaining([
        ["not_fit", "level", null, 1],
        ["open", null, null, 1],
        ["asked_applied", null, "yes", 1],
        ["asked_applied", null, "not_yet", null],
      ]),
    );
    expect(actions).toHaveLength(4);
    cookieJar.clear();
    expect((await sendEvent({ ...action, kind: "open" })).status).toBe(401);
  });

  it("answers first and writes the impressions after, in a request", async () => {
    await signInAs();
    await seedJobs();
    scheduled.tasks = [];
    try {
      const res = await call({ profile: PROFILE });
      expect(res.status).toBe(200);
      const db = await getDb();
      expect(await db.select().from(matchEvents)).toHaveLength(0);
      expect(scheduled.tasks).toHaveLength(1);
      for (const task of scheduled.tasks) await task();
      const body = (await res.json()) as JobMatchesResponse;
      const logged = await db.select().from(matchEvents);
      expect(logged).toHaveLength(3);
      expect(logged.every((row) => row.requestId === body.requestId)).toBe(true);
    } finally {
      scheduled.tasks = null;
    }
  });

  it("logs a hover prefetch only when the Jobs tab shows it", async () => {
    await signInAs();
    await seedJobs();
    const res = await call(
      { profile: PROFILE },
      { "content-type": "application/json", [JOBS_PREFETCH_HEADER]: "1" },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as JobMatchesResponse;
    expect(body.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.resumeHash).toBeTruthy();
    const db = await getDb();
    expect(await db.select().from(matchEvents)).toHaveLength(0);

    const shown = {
      kind: "impressions",
      requestId: body.requestId,
      variant: body.variant,
      resumeHash: body.resumeHash,
      jobs: body.jobs.map((job) => ({
        jobId: job.id,
        position: job.position,
        label: job.match.label,
      })),
    };
    expect((await sendEvent(shown)).status).toBe(200);
    const logged = await db.select().from(matchEvents).orderBy(matchEvents.position);
    expect(logged.map((row) => [row.kind, row.requestId, row.position, row.label])).toEqual([
      ["impression", body.requestId, 1, "strong"],
      ["impression", body.requestId, 2, "strong"],
      ["impression", body.requestId, 3, "good"],
    ]);
    expect((await sendEvent({ ...shown, jobs: [] })).status).toBe(400);
    const tooMany = Array.from({ length: 21 }, () => shown.jobs[0]);
    expect((await sendEvent({ ...shown, jobs: tooMany })).status).toBe(400);
    expect((await sendEvent({ ...shown, requestId: null })).status).toBe(400);
    expect(await db.select().from(matchEvents)).toHaveLength(3);
  });

  it("takes only a few impression batches a minute, while actions still go through", async () => {
    freezeClock();
    await signInAs();
    const batch = {
      kind: "impressions",
      requestId: crypto.randomUUID(),
      variant: "occupation-v6",
      resumeHash: "abcdefgh12345678",
      jobs: [{ jobId: crypto.randomUUID(), position: 1, label: "good" }],
    };
    for (let i = 0; i < 20; i++) expect((await sendEvent(batch)).status).toBe(200);
    const refused = await sendEvent(batch);
    expect(refused.status).toBe(429);
    expect(refused.headers.get("retry-after")).toBeTruthy();
    const db = await getDb();
    expect(await db.select().from(matchEvents)).toHaveLength(20);
    const open = { kind: "open", jobId: batch.jobs[0]!.jobId, requestId: batch.requestId };
    expect((await sendEvent(open)).status).toBe(200);
  });

  it("refuses saves for unknown jobs, signed-out callers and other websites", async () => {
    const missing = crypto.randomUUID();
    const signedOut = await save(
      new Request(`http://localhost/api/jobs/saved/${missing}`, { method: "PUT" }),
      context(missing),
    );
    expect(signedOut.status).toBe(401);
    await signInAs();
    expect(
      (
        await save(
          new Request(`http://localhost/api/jobs/saved/${missing}`, { method: "PUT" }),
          context(missing),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await save(
          new Request("http://localhost/api/jobs/saved/nope", { method: "PUT" }),
          context("nope"),
        )
      ).status,
    ).toBe(404);
    const crossSite = await save(
      new Request(`http://localhost/api/jobs/saved/${missing}`, {
        method: "PUT",
        headers: { "sec-fetch-site": "cross-site" },
      }),
      context(missing),
    );
    expect(crossSite.status).toBe(403);
  });
});
