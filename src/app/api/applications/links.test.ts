import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { applications, listings, writings } from "@/db/schema";
import type {
  ApiErrorBody,
  Application,
  ApplicationResponse,
  ApplicationThreadResponse,
  CreateApplicationBody,
  SavedJobsResponse,
} from "@/lib/api/types";
import { cookieJar, jsonRequest, resetDb, setPlan, signInAs } from "@/lib/auth/test-helpers";
import type { RawJob } from "@/lib/job-feed/parsers";
import { saveJob } from "@/lib/job-feed/records";
import { saveJobs, syncBoards } from "@/lib/job-feed/store";
import { storedJobIds } from "@/lib/job-feed/test-fixtures";
import type { WritingResponse } from "@/lib/writings/schema";
import { GET as listSaved } from "../jobs/saved/route";
import { POST as saveWriting } from "../writings/route";
import { DELETE as deleteOne, GET as getOne, PATCH as patchOne } from "./[id]/route";
import { PATCH as patchMany, POST } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

const DAY = 24 * 60 * 60 * 1_000;
const APPLIED_AT = Date.UTC(2026, 9, 1, 12);
const URL_1 = "https://job-boards.greenhouse.io/acme/jobs/1";

const signIn = async (email = "ada@example.com") => setPlan(await signInAs(email), "pro");

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

async function seedJobs(): Promise<Record<string, string>> {
  const db = await getDb();
  await syncBoards(db, [{ ats: "greenhouse", token: "acme", company: "Acme" }]);
  const shared = "https://acme.example.com/careers/shared";
  await saveJobs(
    db,
    { source: "greenhouse", board: "acme" },
    [
      raw("1"),
      raw("2", { title: "Data Engineer", url: shared }),
      raw("3", { title: "Platform Engineer", location: "Austin, TX", url: shared }),
    ],
    Date.now(),
    { snapshot: true },
  );
  const rows = await storedJobIds(db);
  return Object.fromEntries(rows.map((row) => [row.externalId, row.id]));
}

function send(method: string, path: string, payload?: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: payload === undefined ? {} : { "content-type": "application/json" },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
}

const context = (id: string) => ({ params: Promise.resolve({ id }) });

async function create(overrides: Partial<CreateApplicationBody> = {}): Promise<Application> {
  const res = await POST(
    send("POST", "/api/applications", {
      resumeId: "copy-1",
      resumeTitle: "Backend Engineer at Acme",
      company: "Acme",
      role: "Backend Engineer",
      jobUrl: URL_1,
      appliedAt: APPLIED_AT,
      ...overrides,
    }),
  );
  expect(res.status).toBe(201);
  return ((await res.json()) as ApplicationResponse).application;
}

async function setStatus(id: string, status: string): Promise<Application> {
  const res = await patchOne(send("PATCH", `/api/applications/${id}`, { status }), context(id));
  expect(res.status).toBe(200);
  return ((await res.json()) as ApplicationResponse).application;
}

async function thread(id: string): Promise<Response> {
  return getOne(send("GET", `/api/applications/${id}`), context(id));
}

async function threadOf(id: string): Promise<ApplicationThreadResponse["thread"]> {
  const res = await thread(id);
  expect(res.status).toBe(200);
  expect(res.headers.get("cache-control")).toBe("no-store");
  return ((await res.json()) as ApplicationThreadResponse).thread;
}

async function letter(overrides: Record<string, unknown> = {}) {
  const res = await saveWriting(
    jsonRequest("/api/writings", {
      kind: "letter",
      resumeId: "base-1",
      resumeTitle: "Ada Lovelace",
      company: "Acme",
      role: "Backend Engineer",
      jobUrl: URL_1,
      text: "Dear Acme team,\n\nI build services people rely on.\n\nBest,\nAda",
      ...overrides,
    }),
  );
  expect(res.status).toBe(201);
  return ((await res.json()) as WritingResponse).writing;
}

beforeEach(async () => {
  await resetDb();
  cookieJar.clear();
});

describe("the opening an application is for", () => {
  it("keeps the Jobs tab's id, and finds it by link when none was sent", async () => {
    await signIn();
    const ids = await seedJobs();
    const fromJobs = await create({ jobId: ids["1"], jobUrl: URL_1 });
    expect(fromJobs.jobId).toBe(ids["1"]);
    const byLink = await create({ company: "Acme again", jobUrl: URL_1 });
    expect(byLink.jobId).toBe(ids["1"]);
  });

  it("drops an id it doesn't know and a link that names two openings", async () => {
    await signIn();
    const ids = await seedJobs();
    const unknown = await create({
      jobId: crypto.randomUUID(),
      jobUrl: "https://other.example.com/9",
    });
    expect(unknown.jobId).toBeNull();
    const shared = await create({ jobUrl: "https://acme.example.com/careers/shared" });
    expect(shared.jobId).toBeNull();
    const fallback = await create({ jobId: crypto.randomUUID(), jobUrl: URL_1 });
    expect(fallback.jobId).toBe(ids["1"]);
  });

  it("follows a changed link, and lets go when the opening's row is deleted", async () => {
    await signIn();
    const ids = await seedJobs();
    const application = await create({ jobId: ids["1"] });
    const moved = await patchOne(
      send("PATCH", `/api/applications/${application.id}`, {
        jobUrl: "https://other.example.com/9",
      }),
      context(application.id),
    );
    expect(((await moved.json()) as ApplicationResponse).application.jobId).toBeNull();
    await patchOne(
      send("PATCH", `/api/applications/${application.id}`, { jobUrl: URL_1 }),
      context(application.id),
    );
    const db = await getDb();
    await db.delete(listings);
    const [row] = await db
      .select({ jobId: applications.jobId, company: applications.company, job: applications.job })
      .from(applications)
      .where(eq(applications.id, application.id));
    // The job is gone, so the application keeps the link and shows the job as it was.
    expect(row).toMatchObject({ jobId: ids["1"], company: "Acme", job: { url: URL_1 } });
  });
});

describe("the status timeline", () => {
  it("starts at the day it was sent and adds each real change", async () => {
    await signIn();
    const application = await create();
    expect((await threadOf(application.id)).history).toEqual([
      { status: "applied", at: APPLIED_AT },
    ]);
    await setStatus(application.id, "interview");
    await setStatus(application.id, "interview");
    await setStatus(application.id, "offer");
    const history = (await threadOf(application.id)).history;
    expect(history.map((event) => event.status)).toEqual(["applied", "interview", "offer"]);
    expect(history[1]!.at).toBeGreaterThan(APPLIED_AT);

    const bulk = await patchMany(
      send("PATCH", "/api/applications", { ids: [application.id], status: "no_reply" }),
    );
    expect(bulk.status).toBe(200);
    expect((await threadOf(application.id)).history.at(-1)?.status).toBe("no_reply");
  });

  it("logged further along, starts with both steps, and keeps the newest 30", async () => {
    await signIn();
    const interview = await create({ status: "interview", appliedAt: APPLIED_AT });
    expect((await threadOf(interview.id)).history.map((event) => event.status)).toEqual([
      "applied",
      "interview",
    ]);
    for (let i = 0; i < 16; i++) {
      await setStatus(interview.id, "applied");
      await setStatus(interview.id, "interview");
    }
    const history = (await threadOf(interview.id)).history;
    expect(history).toHaveLength(30);
    expect(history.at(-1)?.status).toBe("interview");
  });
});

describe("the interview day", () => {
  it("is kept when a job moves into Interviewing, and can be cleared", async () => {
    await signIn();
    const day = Date.UTC(2026, 10, 20, 12);
    const logged = await create({ status: "interview", interviewAt: day });
    expect(logged.interviewAt).toBe(day);
    const plain = await create({ company: "Globex" });
    expect(plain.interviewAt).toBeNull();
    const moved = await patchOne(
      send("PATCH", `/api/applications/${plain.id}`, { status: "interview", interviewAt: day }),
      context(plain.id),
    );
    expect(((await moved.json()) as ApplicationResponse).application).toMatchObject({
      status: "interview",
      interviewAt: day,
    });
    const cleared = await patchOne(
      send("PATCH", `/api/applications/${plain.id}`, { interviewAt: null }),
      context(plain.id),
    );
    expect(((await cleared.json()) as ApplicationResponse).application.interviewAt).toBeNull();
    const tooFar = await patchOne(
      send("PATCH", `/api/applications/${plain.id}`, { interviewAt: Date.now() + 400 * DAY }),
      context(plain.id),
    );
    expect(tooFar.status).toBe(400);
  });
});

describe("letters and answers join their application by themselves", () => {
  it("links a letter written before the application once it's logged", async () => {
    await signIn();
    const early = await letter();
    expect(early.applicationId).toBeNull();
    const other = await letter({ company: "Globex", jobUrl: "https://globex.example.com/jobs/4" });
    const application = await create();
    const linked = await threadOf(application.id);
    expect(linked.writings.map((writing) => writing.id)).toEqual([early.id]);
    expect(linked.writings[0]!.applicationId).toBe(application.id);
    const db = await getDb();
    const [stray] = await db
      .select({ applicationId: writings.applicationId })
      .from(writings)
      .where(eq(writings.id, other.id));
    expect(stray?.applicationId).toBeNull();
  });

  it("links a letter written after, by link, by company and title, or by the id sent", async () => {
    await signIn();
    const application = await create();
    const byLink = await letter();
    expect(byLink.applicationId).toBe(application.id);
    const byName = await letter({ jobUrl: "", company: "ACME", role: "backend engineer" });
    expect(byName.applicationId).toBe(application.id);
    const elsewhere = await letter({ jobUrl: "https://job-boards.greenhouse.io/acme/jobs/2" });
    expect(elsewhere.applicationId).toBeNull();
    const fromHub = await letter({
      company: "",
      role: "",
      jobUrl: "",
      applicationId: application.id,
    });
    expect(fromHub.applicationId).toBe(application.id);
    const answer = await letter({
      kind: "answer",
      question: "Why do you want to work here?",
      text: "Because your services keep hospitals running.",
    });
    expect(answer.applicationId).toBe(application.id);
    expect((await threadOf(application.id)).writings.map((writing) => writing.id).sort()).toEqual(
      [byLink.id, byName.id, fromHub.id, answer.id].sort(),
    );
  });

  it("never links to another account's application", async () => {
    await signIn("grace@example.com");
    const theirs = await create();
    cookieJar.clear();
    await signIn("ada@example.com");
    const mine = await letter({ applicationId: theirs.id });
    expect(mine.applicationId).toBeNull();
    expect((await thread(theirs.id)).status).toBe(404);
  });

  it("keeps the letter when its application is deleted", async () => {
    await signIn();
    const application = await create();
    const kept = await letter();
    expect(kept.applicationId).toBe(application.id);
    await deleteOne(send("DELETE", `/api/applications/${application.id}`), context(application.id));
    const db = await getDb();
    const [row] = await db
      .select({ id: writings.id, applicationId: writings.applicationId })
      .from(writings)
      .where(eq(writings.id, kept.id));
    expect(row).toEqual({ id: kept.id, applicationId: null });
  });
});

describe("GET /api/applications/:id", () => {
  it("needs sign-in and the account's own id", async () => {
    const id = crypto.randomUUID();
    const signedOut = await thread(id);
    expect(signedOut.status).toBe(401);
    await signIn();
    for (const missing of [id, "not-an-id"]) {
      const res = await thread(missing);
      expect(res.status).toBe(404);
      expect(((await res.json()) as ApiErrorBody).error.code).toBe("not_found");
    }
  });

  it("hands over the opening, the letters, the prep and the timeline together", async () => {
    await signIn();
    const ids = await seedJobs();
    const application = await create({ jobId: ids["1"] });
    const db = await getDb();
    const old = await letter({ company: "Old Co", role: "" });
    await db.update(writings).set({ applicationId: null }).where(eq(writings.id, old.id));
    await db
      .update(applications)
      .set({
        prep: {
          version: 3,
          technical: null,
          job: { title: "Backend Engineer", company: "Acme" },
          questions: [],
          stories: [],
          asks: [],
          createdAt: APPLIED_AT + DAY,
          demo: true,
        },
      })
      .where(eq(applications.id, application.id));

    const result = await threadOf(application.id);
    expect(result.application).toMatchObject({
      id: application.id,
      hasPrep: true,
      jobId: ids["1"],
    });
    expect(result.job).toMatchObject({
      id: ids["1"],
      company: "Acme",
      title: "Backend Engineer",
      url: URL_1,
      closed: false,
    });
    expect(result.writings.map((writing) => writing.id)).toEqual([old.id]);
    expect(result.prep).toEqual({
      createdAt: APPLIED_AT + DAY,
      questions: 0,
      stories: 0,
      demo: true,
    });
  });
});

describe("GET /api/jobs/saved", () => {
  it("lists the account's saved jobs, newest save first", async () => {
    const user = await signIn();
    const ids = await seedJobs();
    const db = await getDb();
    expect(await saveJob(db, user.id, ids["1"]!, 1_000)).toBe("saved");
    expect(await saveJob(db, user.id, ids["2"]!, 2_000)).toBe("saved");
    const res = await listSaved();
    expect(res.status).toBe(200);
    const body = (await res.json()) as SavedJobsResponse;
    expect(body.jobs.map((job) => [job.id, job.savedAt])).toEqual([
      [ids["2"], 2_000],
      [ids["1"], 1_000],
    ]);
    expect(body.jobs[1]).toMatchObject({ company: "Acme", url: URL_1, closed: false });
  });

  it("needs sign-in", async () => {
    expect((await listSaved()).status).toBe(401);
  });
});
