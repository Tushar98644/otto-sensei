import { eq, inArray, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { applications } from "@/db/schema";
import type {
  ApiErrorBody,
  Application,
  ApplicationResponse,
  ApplicationsResponse,
  BulkApplicationsResponse,
  CreateApplicationBody,
} from "@/lib/api/types";
import { applicationLimit, MAX_APPLICATIONS_PER_USER } from "@/config/plans";
import { APPLICATION_LIMITS } from "@/lib/applications/schema";
import { CreateApplicationSchema } from "@/lib/applications/validation";
import { cookieJar, resetDb, setPlan, signInAs } from "@/lib/auth/test-helpers";
import type { SessionUser } from "@/lib/auth/types";
import { deleteUserData } from "@/lib/users";
import { DELETE as deleteOne, PATCH as patchOne } from "./[id]/route";
import { createApplication, listApplications, parseCursor } from "./records";
import { GET, PATCH as patchMany, POST } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

const DAY_MS = 24 * 60 * 60 * 1_000;
const APPLIED_AT = Date.UTC(2026, 9, 1, 12);

function body(overrides: Partial<CreateApplicationBody> = {}): CreateApplicationBody {
  return {
    resumeId: "resume-1",
    resumeTitle: "Product Manager at Stripe",
    company: "Stripe",
    role: "Product Manager",
    jobUrl: "https://stripe.com/jobs/123",
    appliedAt: APPLIED_AT,
    ...overrides,
  };
}

function send(
  method: string,
  path: string,
  payload?: unknown,
  headers: Record<string, string> = { "content-type": "application/json" },
): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers,
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
}

const context = (id: string) => ({ params: Promise.resolve({ id }) });

const list = (cursor?: string) =>
  GET(
    send(
      "GET",
      cursor === undefined
        ? "/api/applications"
        : `/api/applications?cursor=${encodeURIComponent(cursor)}`,
      undefined,
      {},
    ),
  );
const create = (payload: unknown, headers?: Record<string, string>) =>
  POST(send("POST", "/api/applications", payload, headers));
const patch = (id: string, payload: unknown, headers?: Record<string, string>) =>
  patchOne(send("PATCH", `/api/applications/${id}`, payload, headers), context(id));
const bulk = (payload: unknown) => patchMany(send("PATCH", "/api/applications", payload));
const remove = (id: string, headers: Record<string, string> = {}) =>
  deleteOne(send("DELETE", `/api/applications/${id}`, undefined, headers), context(id));

async function signIn(email: string): Promise<SessionUser> {
  return setPlan(await signInAs(email), "pro");
}

async function created(res: Response): Promise<Application> {
  expect(res.status).toBe(201);
  return ((await res.json()) as ApplicationResponse).application;
}

async function updated(res: Response): Promise<Application> {
  expect(res.status).toBe(200);
  return ((await res.json()) as ApplicationResponse).application;
}

async function listed(): Promise<Application[]> {
  const res = await list();
  expect(res.status).toBe(200);
  return ((await res.json()) as ApplicationsResponse).applications;
}

async function errorOf(res: Response): Promise<ApiErrorBody["error"]> {
  return ((await res.json()) as ApiErrorBody).error;
}

async function seed(userId: string, total: number, start = APPLIED_AT) {
  const db = await getDb();
  const rows = Array.from({ length: total }, (_, index) => ({
    id: crypto.randomUUID(),
    userId,
    company: `Company ${index}`,
    appliedAt: start - Math.floor(index / 2) * 1_000,
    statusChangedAt: start,
    createdAt: start,
    updatedAt: start,
  }));
  for (let i = 0; i < rows.length; i += 200)
    await db.insert(applications).values(rows.slice(i, i + 200));
}

beforeEach(async () => {
  await resetDb();
  cookieJar.clear();
});

describe("/api/applications", () => {
  it("needs a signed-in user for every method", async () => {
    const id = crypto.randomUUID();
    const responses = [
      await list(),
      await create(body()),
      await bulk({ ids: [id], status: "no_reply" }),
      await patch(id, { status: "interview" }),
      await remove(id),
    ];
    for (const res of responses) {
      expect(res.status).toBe(401);
      expect(await errorOf(res)).toEqual({
        code: "unauthorized",
        message: "Sign in to track your applications.",
      });
    }
  });

  it("creates cleaned-up applications and lists them newest first, uncached", async () => {
    await signIn("ada@example.com");
    const older = await created(
      await create(body({ company: "Linear", appliedAt: APPLIED_AT - DAY_MS })),
    );
    const newer = await created(
      await create(
        body({
          company: "  Stripe \n Payments ",
          jobUrl: "stripe.com/jobs/123",
          notes: "Referred by Sam.\r\n\r\n\r\nFollow up Friday.",
        }),
      ),
    );
    expect(newer).toMatchObject({
      company: "Stripe Payments",
      jobUrl: "https://stripe.com/jobs/123",
      notes: "Referred by Sam.\n\nFollow up Friday.",
      status: "applied",
      stageReached: "applied",
      resumeId: "resume-1",
      resumeTitle: "Product Manager at Stripe",
    });

    const res = await list();
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual({ ok: true, applications: [newer, older], nextCursor: null });
  });

  it("logs an older application that already moved on, or one sent with a file outside Otto", async () => {
    await signIn("ada@example.com");
    const interview = await created(await create(body({ status: "interview" })));
    expect(interview).toMatchObject({ status: "interview", stageReached: "interview" });
    const outside = await created(await create({ company: "Figma", appliedAt: APPLIED_AT }));
    expect(outside).toMatchObject({
      resumeId: null,
      resumeTitle: "",
      role: "",
      jobUrl: "",
      notes: "",
    });
  });

  it("rejects bad details, other websites and non-JSON bodies", async () => {
    await signIn("ada@example.com");
    const invalid = [
      body({ company: "   " }),
      body({ jobUrl: "javascript:alert(1)" }),
      body({ jobUrl: "not a link" }),
      body({ appliedAt: Date.now() + 3 * DAY_MS }),
      body({ appliedAt: Date.UTC(1999, 0, 1) }),
      body({ notes: "x".repeat(APPLICATION_LIMITS.notes + 1) }),
      body({ resumeId: "x".repeat(65) }),
      { ...body(), status: "ghosted" },
    ];
    for (const payload of invalid) {
      const res = await create(payload);
      expect(res.status).toBe(400);
      expect((await errorOf(res)).code).toBe("bad_request");
    }
    expect((await create(body(), { "content-type": "text/plain" })).status).toBe(415);
    expect(
      (await create(body(), { "content-type": "application/json", "sec-fetch-site": "cross-site" }))
        .status,
    ).toBe(403);
    expect(await listed()).toEqual([]);
  });

  it("keeps at most Pro's number of applications, and changes the ones kept", async () => {
    const ada = await signIn("ada@example.com");
    await seed(ada.id, applicationLimit("pro"));
    const res = await create(body());
    expect(res.status).toBe(429);
    expect(await errorOf(res)).toEqual({
      code: "limit_reached",
      message:
        "Pro tracks 1,000 applications. Delete some old ones to add more, or move to Max for 2,000.",
    });

    const [first] = ((await (await list()).json()) as ApplicationsResponse).applications;
    expect((await patch(first?.id ?? "", { status: "interview" })).status).toBe(200);
    await signIn("grace@example.com");
    expect((await create(body())).status).toBe(201);
  });

  it("answers a retry of one already saved, even when it filled the plan", async () => {
    const ada = await signIn("ada@example.com");
    await seed(ada.id, applicationLimit("pro") - 1);
    const id = crypto.randomUUID();
    const first = await created(await create(body({ id })));
    expect(await created(await create(body({ id })))).toEqual(first);
    expect((await create(body())).status).toBe(429);
  });
  it("pages through a long list by applied date, then id", async () => {
    const ada = await signIn("ada@example.com");
    await seed(ada.id, APPLICATION_LIMITS.pageSize + 3);

    const first = (await (await list()).json()) as ApplicationsResponse;
    expect(first.applications).toHaveLength(APPLICATION_LIMITS.pageSize);
    expect(first.nextCursor).not.toBeNull();
    const second = (await (await list(first.nextCursor ?? "")).json()) as ApplicationsResponse;
    expect(second.applications).toHaveLength(3);
    expect(second.nextCursor).toBeNull();

    const all = [...first.applications, ...second.applications];
    expect(new Set(all.map((item) => item.id)).size).toBe(APPLICATION_LIMITS.pageSize + 3);
    const order = all.map((item) => [item.appliedAt, item.id] as const);
    const sorted = [...order].sort((a, b) => b[0] - a[0] || (a[1] < b[1] ? 1 : -1));
    expect(order).toEqual(sorted);

    expect((await list("nope")).status).toBe(400);
    expect((await list(`12.${"x".repeat(10)}`)).status).toBe(400);
  });

  it("keeps each account's applications apart", async () => {
    await signIn("ada@example.com");
    const adas = await created(await create(body()));

    await signIn("grace@example.com");
    expect(await listed()).toEqual([]);
    const notFound = await patch(adas.id, { status: "offer" });
    expect(notFound.status).toBe(404);
    expect((await errorOf(notFound)).code).toBe("not_found");
    const bulkRes = await bulk({ ids: [adas.id], status: "no_reply" });
    expect(((await bulkRes.json()) as BulkApplicationsResponse).applications).toEqual([]);
    expect((await remove(adas.id)).status).toBe(200);

    await signIn("ada@example.com");
    expect(await listed()).toEqual([adas]);
  });

  it("keeps an id the browser picked, answers a repeat with the same row, and never reuses another account's", async () => {
    const id = crypto.randomUUID();
    await signIn("ada@example.com");
    const first = await created(await create(body({ id })));
    expect(first.id).toBe(id);
    expect(await created(await create(body({ id, company: "Other" })))).toEqual(first);
    expect(await listed()).toEqual([first]);

    await signIn("grace@example.com");
    const taken = await create(body({ id }));
    expect(taken.status).toBe(409);
    expect((await errorOf(taken)).code).toBe("bad_request");
    expect(await listed()).toEqual([]);

    const notUuid = await create(body({ id: "not-a-uuid" }));
    expect(notUuid.status).toBe(400);
  });
});

describe("the tracker on Free", () => {
  it("tracks one application, changes it freely, and offers the trial for a second", async () => {
    await signInAs("ada@example.com");
    const first = await created(await create(body()));
    expect((await updated(await patch(first.id, { status: "interview" }))).status).toBe(
      "interview",
    );
    expect((await bulk({ ids: [first.id], status: "no_reply" })).status).toBe(200);

    const second = await create(body({ company: "Linear" }));
    expect(second.status).toBe(402);
    expect(await errorOf(second)).toEqual({
      code: "upgrade_required",
      message: "Free tracks 1 application. Pro tracks up to 1,000. Try Pro for 3 days.",
    });
    expect(await listed()).toHaveLength(1);

    expect((await remove(first.id)).status).toBe(200);
    expect((await create(body({ company: "Linear" }))).status).toBe(201);
  });

  it("keeps everything logged on a paid plan changeable after it ends", async () => {
    const free = await signInAs("ada@example.com");
    for (const company of ["Stripe", "Linear"]) {
      const made = await createApplication(
        free.id,
        CreateApplicationSchema.parse(body({ company })),
        Date.now(),
        MAX_APPLICATIONS_PER_USER,
      );
      if (made.status !== "created") throw new Error("seed failed");
    }
    const [kept] = await listed();
    if (!kept) throw new Error("seed failed");
    expect((await updated(await patch(kept.id, { status: "offer" }))).status).toBe("offer");
    expect((await create(body({ company: "Vercel" }))).status).toBe(402);
  });

  it("works on the trial", async () => {
    await setPlan(await signInAs("ada@example.com"), "trial");
    const made = await created(await create(body()));
    expect((await updated(await patch(made.id, { status: "interview" }))).status).toBe("interview");
  });
});

describe("each plan's tracker cap", () => {
  async function count(userId: string): Promise<number> {
    const db = await getDb();
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(applications)
      .where(eq(applications.userId, userId));
    return row?.n ?? 0;
  }

  it("gives the trial Pro's number", async () => {
    const ada = await setPlan(await signInAs("ada@example.com"), "trial");
    await seed(ada.id, applicationLimit("pro") - 1);
    expect((await create(body())).status).toBe(201);
    const res = await create(body({ company: "Linear" }));
    expect(res.status).toBe(429);
    expect((await errorOf(res)).message).toMatch(/^Pro tracks 1,000 applications\./);
  });

  it("lets Max past Pro's number, up to its own, with no plan to sell after it", async () => {
    const ada = await setPlan(await signInAs("ada@example.com"), "max");
    await seed(ada.id, applicationLimit("pro"));
    expect((await create(body())).status).toBe(201);
    await seed(ada.id, applicationLimit("max") - applicationLimit("pro") - 1);
    const res = await create(body({ company: "Linear" }));
    expect(res.status).toBe(429);
    expect(await errorOf(res)).toEqual({
      code: "limit_reached",
      message: "Max tracks 2,000 applications. Delete some old ones to add more.",
    });
    expect(await count(ada.id)).toBe(applicationLimit("max"));
  });

  it("keeps every application of an account moved from Max to Pro, and adds again only under Pro's number", async () => {
    const ada = await setPlan(await signInAs("ada@example.com"), "max");
    const kept = 1_800;
    await seed(ada.id, kept);
    await setPlan(ada, "pro");

    const pages: Application[] = [];
    let cursor: string | null = null;
    do {
      const page = await listApplications(ada.id, cursor === null ? null : parseCursor(cursor));
      pages.push(...page.applications);
      cursor = page.nextCursor;
    } while (cursor !== null);
    expect(pages).toHaveLength(kept);

    const [first, second] = pages;
    expect((await updated(await patch(first!.id, { status: "interview" }))).status).toBe(
      "interview",
    );
    expect((await bulk({ ids: [second!.id], status: "no_reply" })).status).toBe(200);
    expect((await remove(first!.id)).status).toBe(200);
    expect((await create(body())).status).toBe(429);
    expect(await count(ada.id)).toBe(kept - 1);

    const db = await getDb();
    const extra = pages.slice(1, kept - applicationLimit("pro") + 1).map((item) => item.id);
    for (let i = 0; i < extra.length; i += 100) {
      await db.delete(applications).where(inArray(applications.id, extra.slice(i, i + 100)));
    }
    expect(await count(ada.id)).toBe(applicationLimit("pro") - 1);
    expect((await create(body())).status).toBe(201);
  });
});

describe("PATCH /api/applications/:id", () => {
  it("keeps an interview's time with the zone it was typed in, and drops both with the day", async () => {
    await signIn("ada@example.com");
    const day = Date.UTC(2026, 10, 24, 11);
    const application = await created(
      await create(
        body({
          status: "interview",
          interviewAt: day,
          interviewTime: 870,
          interviewZone: "Europe/Berlin",
        }),
      ),
    );
    expect(application).toMatchObject({
      interviewAt: day,
      interviewTime: 870,
      interviewZone: "Europe/Berlin",
    });
    const dayOnly = await updated(await patch(application.id, { interviewAt: day + DAY_MS }));
    expect(dayOnly).toMatchObject({
      interviewAt: day + DAY_MS,
      interviewTime: null,
      interviewZone: null,
    });
    const timed = await updated(
      await patch(application.id, {
        interviewAt: day,
        interviewTime: 600,
        interviewZone: "Asia/Kolkata",
      }),
    );
    expect(timed).toMatchObject({ interviewTime: 600, interviewZone: "Asia/Kolkata" });
    const cleared = await updated(await patch(application.id, { interviewAt: null }));
    expect(cleared).toMatchObject({ interviewAt: null, interviewTime: null, interviewZone: null });
    expect((await patch(application.id, { interviewAt: day, interviewTime: 1440 })).status).toBe(
      400,
    );
    expect(
      (await patch(application.id, { interviewAt: day, interviewZone: "Mars/Base" })).status,
    ).toBe(400);
  });

  it("changes only the fields sent", async () => {
    await signIn("ada@example.com");
    const application = await created(await create(body({ notes: "Keep" })));
    const edited = await updated(
      await patch(application.id, { role: "Senior Product Manager", jobUrl: "", resumeId: null }),
    );
    expect(edited).toMatchObject({
      role: "Senior Product Manager",
      jobUrl: "",
      resumeId: null,
      company: "Stripe",
      notes: "Keep",
      status: "applied",
    });
    expect(edited.updatedAt).toBeGreaterThanOrEqual(application.updatedAt);
  });

  it("keeps the furthest step when an application ends, and moves it back on a correction", async () => {
    await signIn("ada@example.com");
    const application = await created(await create(body()));
    const interview = await updated(await patch(application.id, { status: "interview" }));
    expect(interview).toMatchObject({ status: "interview", stageReached: "interview" });

    const rejected = await updated(await patch(application.id, { status: "rejected" }));
    expect(rejected).toMatchObject({ status: "rejected", stageReached: "interview" });

    await patch(application.id, { status: "offer" });
    const fixed = await updated(await patch(application.id, { status: "interview" }));
    expect(fixed).toMatchObject({ status: "interview", stageReached: "interview" });
  });

  it("refuses the old screening step, which the database no longer stores either", async () => {
    await signIn("ada@example.com");
    const application = await created(await create(body()));
    const db = await getDb();
    await expect(
      db.execute(
        sql`update public.applications set status = 'screening' where id = ${application.id}`,
      ),
    ).rejects.toMatchObject({
      cause: { message: expect.stringContaining("applications_status_check") },
    });
    expect((await patch(application.id, { status: "screening" })).status).toBe(400);
    expect((await listed())[0]).toMatchObject({ status: "applied", stageReached: "applied" });
  });

  it("moves the status time only when the status really changes", async () => {
    const ada = await signIn("ada@example.com");
    const result = await createApplication(
      ada.id,
      CreateApplicationSchema.parse(body()),
      APPLIED_AT,
      applicationLimit("pro"),
    );
    if (result.status !== "created") throw new Error(`expected created, got ${result.status}`);
    const { application } = result;
    expect(application.statusChangedAt).toBe(APPLIED_AT);

    const same = await updated(await patch(application.id, { status: "applied", notes: "Called" }));
    expect(same.statusChangedAt).toBe(APPLIED_AT);
    const moved = await updated(await patch(application.id, { status: "interview" }));
    expect(moved.statusChangedAt).toBeGreaterThan(APPLIED_AT);
  });

  it("rejects an empty or invalid change, unknown ids and other websites", async () => {
    await signIn("ada@example.com");
    const application = await created(await create(body()));
    expect((await patch(application.id, {})).status).toBe(400);
    expect((await patch(application.id, { company: "" })).status).toBe(400);
    expect((await patch(application.id, { status: "hired" })).status).toBe(400);
    expect(
      (await patch(application.id, { notes: "x" }, { "content-type": "text/plain" })).status,
    ).toBe(415);
    expect((await patch("not-a-uuid", { status: "offer" })).status).toBe(404);
    expect((await patch(crypto.randomUUID(), { status: "offer" })).status).toBe(404);
    expect(
      (
        await patch(
          application.id,
          { status: "offer" },
          { "content-type": "application/json", origin: "https://evil.example" },
        )
      ).status,
    ).toBe(403);
    expect((await listed())[0]?.status).toBe("applied");
  });
});

describe("PATCH /api/applications (many)", () => {
  it("sets one status for the user's own applications and returns the ones that changed", async () => {
    await signIn("ada@example.com");
    const quiet = await created(await create(body({ company: "Quiet Co" })));
    const already = await created(await create(body({ company: "Done Co", status: "no_reply" })));
    const talking = await created(
      await create(body({ company: "Talking Co", status: "interview" })),
    );

    const res = await bulk({
      ids: [quiet.id, already.id, talking.id, quiet.id],
      status: "no_reply",
    });
    expect(res.status).toBe(200);
    const changed = ((await res.json()) as BulkApplicationsResponse).applications;
    expect(changed.map((item) => item.company).sort()).toEqual(["Quiet Co", "Talking Co"]);
    expect(changed.find((item) => item.id === talking.id)?.stageReached).toBe("interview");

    expect((await bulk({ ids: [], status: "no_reply" })).status).toBe(400);
    expect((await bulk({ ids: ["x"], status: "no_reply" })).status).toBe(400);
    const tooMany = Array.from({ length: APPLICATION_LIMITS.bulk + 1 }, () => crypto.randomUUID());
    expect((await bulk({ ids: tooMany, status: "no_reply" })).status).toBe(400);
  });
});

describe("DELETE /api/applications/:id", () => {
  it("deletes only the given application and succeeds when it's already gone", async () => {
    await signIn("ada@example.com");
    const keep = await created(await create(body({ company: "Keep" })));
    const drop = await created(await create(body({ company: "Drop" })));

    const res = await remove(drop.id);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(await listed()).toEqual([keep]);
    expect((await remove(drop.id)).status).toBe(200);
    expect((await remove("x".repeat(500))).status).toBe(200);
    expect((await remove(keep.id, { "sec-fetch-site": "cross-site" })).status).toBe(403);
    expect(await listed()).toEqual([keep]);
  });
});

describe("account deletion", () => {
  it("removes the account's applications and stops new ones", async () => {
    const ada = await signIn("ada@example.com");
    await created(await create(body()));
    await deleteUserData(ada.id);

    const db = await getDb();
    expect(await db.select().from(applications).where(eq(applications.userId, ada.id))).toEqual([]);
    expect(
      await createApplication(ada.id, CreateApplicationSchema.parse(body()), Date.now(), 1),
    ).toEqual({ status: "no_user" });
    expect((await listApplications(ada.id, null)).applications).toEqual([]);
  });
});

describe("follow-up reminders", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("sets one 7 days after applying, or tomorrow for an older application", async () => {
    await signIn("maya@example.com");
    const now = Date.now();
    const today = await created(await create(body({ appliedAt: now })));
    expect(today.followUpAt).toBeGreaterThanOrEqual(now + 7 * DAY_MS - 5_000);
    expect(today.followUpAt).toBeLessThanOrEqual(Date.now() + 7 * DAY_MS);

    const old = await created(await create(body({ appliedAt: now - 30 * DAY_MS })));
    expect(old.followUpAt).toBeGreaterThanOrEqual(now + DAY_MS - 5_000);
    expect(old.followUpAt).toBeLessThanOrEqual(Date.now() + DAY_MS);

    const movedOn = await created(await create(body({ status: "interview" })));
    expect(movedOn.followUpAt).toBeNull();
  });

  it("uses the account's own default, up to the longest one", async () => {
    const maya = await signIn("maya@example.com");
    const { saveReminderSettings } = await import("@/lib/notifications/records");
    await saveReminderSettings(maya.id, { followUpDays: 14 });
    const now = Date.now();
    const app = await created(await create(body({ appliedAt: now })));
    expect(app.followUpAt).toBeGreaterThanOrEqual(now + 14 * DAY_MS - 5_000);

    await saveReminderSettings(maya.id, { followUpDays: 60 });
    await patch(app.id, { status: "interview" });
    const back = (await (await patch(app.id, { status: "applied" })).json()) as ApplicationResponse;
    expect(back.application.followUpAt).toBeGreaterThanOrEqual(Date.now() + 59 * DAY_MS);
  });

  it("ends with a new status, starts again back on applied, and takes a date or null", async () => {
    await signIn("maya@example.com");
    const app = await created(await create(body({ appliedAt: Date.now() })));
    const set = async (payload: unknown) =>
      ((await (await patch(app.id, payload)).json()) as ApplicationResponse).application;

    expect((await set({ status: "interview" })).followUpAt).toBeNull();
    const back = await set({ status: "applied" });
    expect(back.followUpAt).toBeGreaterThan(Date.now() + 6 * DAY_MS);
    expect((await set({ status: "applied" })).followUpAt).toBe(back.followUpAt);

    const snoozed = Date.now() + 3 * DAY_MS;
    expect((await set({ followUpAt: snoozed })).followUpAt).toBe(snoozed);
    expect((await set({ followUpAt: null })).followUpAt).toBeNull();
    expect((await patch(app.id, { followUpAt: Date.now() + 400 * DAY_MS })).status).toBe(400);

    const many = (await (
      await bulk({ ids: [app.id], status: "no_reply" })
    ).json()) as BulkApplicationsResponse;
    expect(many.applications[0]?.followUpAt).toBeNull();
  });
});
