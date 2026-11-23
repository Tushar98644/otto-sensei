import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { resumes, users, userSettings } from "@/db/schema";
import type { ApiErrorBody, PutResumeResponse, ResumesResponse } from "@/lib/api/types";
import { cookieJar, resetDb, setPlan, signInAs } from "@/lib/auth/test-helpers";
import type { SessionUser } from "@/lib/auth/types";
import { RESUME_LIMITS } from "@/config/plans";
import { createSampleResume } from "@/lib/resume/sample";
import { newBullet, newExperience, type Resume } from "@/lib/resume/schema";
import { deleteUserData } from "@/lib/users";
import {
  MAX_DELETED_IDS_LISTED,
  MAX_RESUMES_PER_USER,
  MAX_TOMBSTONES_PER_USER,
  saveBackup,
  TOMBSTONE_MAX_AGE_MS,
} from "./backups";
import { DELETE, PUT } from "./[id]/route";
import { GET, POST } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

function resume(overrides: Partial<Resume> = {}): Resume {
  return { ...createSampleResume(1_000), ...overrides };
}

const context = (id: string) => ({ params: Promise.resolve({ id }) });

function put(
  body: unknown,
  id: string,
  contentType = "application/json",
  base?: number,
): Promise<Response> {
  const query = base === undefined ? "" : `?base=${base}`;
  const req = new Request(`http://localhost/api/resumes/${encodeURIComponent(id)}${query}`, {
    method: "PUT",
    headers: { "content-type": contentType },
    body: JSON.stringify(body),
  });
  return PUT(req, context(id));
}

const save = (item: Resume) => put(item, item.id);

function listSince(body: unknown, contentType = "application/json"): Promise<Response> {
  return POST(
    new Request("http://localhost/api/resumes", {
      method: "POST",
      headers: { "content-type": contentType },
      body: JSON.stringify(body),
    }),
  );
}

function remove(id: string): Promise<Response> {
  return DELETE(
    new Request(`http://localhost/api/resumes/${encodeURIComponent(id)}`, { method: "DELETE" }),
    context(id),
  );
}

async function listed(): Promise<Omit<ResumesResponse, "ok">> {
  const res = await GET();
  expect(res.status).toBe(200);
  const { resumes: items, deletedIds } = (await res.json()) as ResumesResponse;
  return { resumes: items, deletedIds };
}

async function list(): Promise<Resume[]> {
  return (await listed()).resumes;
}

async function saved(res: Response): Promise<PutResumeResponse> {
  expect(res.status).toBe(200);
  return (await res.json()) as PutResumeResponse;
}

async function tombstonesOf(userId: string): Promise<{ id: string; deletedAt: number }[]> {
  const db = await getDb();
  const [row] = await db
    .select({ map: userSettings.deletedResumes })
    .from(userSettings)
    .where(eq(userSettings.userId, userId));
  return Object.entries(row?.map ?? {}).map(([id, deletedAt]) => ({ id, deletedAt }));
}

async function insertTombstones(userId: string, rows: { id: string; deletedAt: number }[]) {
  const db = await getDb();
  const map = Object.fromEntries(rows.map((row) => [row.id, row.deletedAt]));
  await db
    .insert(userSettings)
    .values({ userId, deletedResumes: map, updatedAt: 1 })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: {
        deletedResumes: sql`coalesce(${userSettings.deletedResumes}, '{}') || ${JSON.stringify(map)}::jsonb`,
      },
    });
}

async function signIn(email: string, plan: "free" | "pro" | "trial" = "pro"): Promise<SessionUser> {
  const user = await signInAs(email);
  return plan === "free" ? user : setPlan(user, plan);
}

async function errorOf(res: Response): Promise<ApiErrorBody["error"]> {
  return ((await res.json()) as ApiErrorBody).error;
}

const DAY_MS = 24 * 60 * 60 * 1_000;

beforeEach(async () => {
  await resetDb();
  cookieJar.clear();
});

describe("/api/resumes", () => {
  it("needs a signed-in user for every method", async () => {
    const item = resume();
    for (const res of [await GET(), await save(item), await remove(item.id)]) {
      expect(res.status).toBe(401);
      expect(await errorOf(res)).toEqual({
        code: "unauthorized",
        message: "Sign in to sync your resumes.",
      });
    }
  });

  it("saves, lists newest first, and never caches the list", async () => {
    await signIn("ada@example.com");
    const older = resume({ title: "Older", updatedAt: 2_000 });
    const newer = resume({ title: "Newer", updatedAt: 3_000 });
    expect((await save(newer)).status).toBe(200);
    const res = await save(older);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, deleted: false });

    const get = await GET();
    expect(get.headers.get("Cache-Control")).toBe("no-store");
    expect(((await get.json()) as ResumesResponse).resumes).toEqual([newer, older]);
  });

  it("updates in place and ignores an older copy arriving late", async () => {
    await signIn("ada@example.com");
    const first = resume({ title: "First draft", updatedAt: 2_000 });
    await save(first);
    const edited = { ...first, title: "Second draft", updatedAt: 5_000 };
    expect((await save(edited)).status).toBe(200);
    expect((await save(edited)).status).toBe(200);
    expect((await save(first)).status).toBe(200);

    expect(await list()).toEqual([edited]);
  });

  it("keeps each account's resumes apart, even under the same id", async () => {
    const shared = resume({ title: "Ada's resume" });
    await signIn("ada@example.com");
    await save(shared);

    await signIn("grace@example.com");
    expect(await list()).toEqual([]);
    const graces = { ...shared, title: "Grace's resume" };
    await save(graces);
    expect(await list()).toEqual([graces]);
    expect((await remove(shared.id)).status).toBe(200);
    expect(await list()).toEqual([]);

    await signIn("ada@example.com");
    expect(await list()).toEqual([shared]);
  });

  it("deletes only the given resume and succeeds when it's already gone", async () => {
    await signIn("ada@example.com");
    const keep = resume({ title: "Keep" });
    const drop = resume({ title: "Drop" });
    await save(keep);
    await save(drop);

    const res = await remove(drop.id);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(await list()).toEqual([keep]);
    expect((await remove(drop.id)).status).toBe(200);
    expect((await remove("x".repeat(500))).status).toBe(200);
  });

  it("rejects a body whose id doesn't match the address", async () => {
    await signIn("ada@example.com");
    const item = resume();
    const res = await put(item, "some-other-id");
    expect(res.status).toBe(400);
    expect((await errorOf(res)).code).toBe("bad_request");
    expect(await list()).toEqual([]);
  });

  it("rejects invalid resumes, bad ids and non-JSON bodies", async () => {
    await signIn("ada@example.com");
    const item = resume();
    expect((await put({ ...item, version: 2 }, item.id)).status).toBe(400);
    expect((await put({ ...item, id: "x".repeat(65) }, "x".repeat(65))).status).toBe(400);
    expect((await put(item, item.id, "text/plain")).status).toBe(415);
    expect(await list()).toEqual([]);
  });

  it(`keeps at most ${MAX_RESUMES_PER_USER} resumes per account`, async () => {
    await signIn("ada@example.com");
    const saved: Resume[] = [];
    for (let i = 0; i < MAX_RESUMES_PER_USER; i++) {
      const item = resume({ updatedAt: 10_000 + i });
      saved.push(item);
      expect((await save(item)).status).toBe(200);
    }

    const extra = await save(resume({ updatedAt: 99_000 }));
    expect(extra.status).toBe(429);
    expect(await errorOf(extra)).toEqual({
      code: "limit_reached",
      message: "You can keep up to 50 resumes. Delete one to save another.",
    });

    const first = saved[0];
    if (!first) throw new Error("no resumes saved");
    expect((await save({ ...first, title: "Updated", updatedAt: 50_000 })).status).toBe(200);
    expect(await list()).toHaveLength(MAX_RESUMES_PER_USER);

    await signIn("grace@example.com");
    expect((await save(resume())).status).toBe(200);
  });

  it("refuses a resume too big to back up", async () => {
    await signIn("ada@example.com");
    const long = "Shipped a feature that customers loved and wrote about it at length. "
      .repeat(14)
      .slice(0, 1_000);
    const experience = Array.from({ length: 3 }, () => ({
      ...newExperience(),
      bullets: Array.from({ length: 40 }, () => newBullet(long)),
    }));
    const huge = resume({ experience });
    const res = await save(huge);
    expect(res.status).toBe(413);
    expect((await errorOf(res)).code).toBe("too_large");
    expect(await list()).toEqual([]);
  });

  it("writes nothing for an account deleted after the save was signed in", async () => {
    const user = await signIn("ada@example.com");
    const item = resume();
    await deleteUserData(user.id);

    expect(await saveBackup(user.id, item)).toMatchObject({ status: "no_user" });
    const db = await getDb();
    expect(await db.select().from(resumes).where(eq(resumes.userId, user.id))).toEqual([]);
  });

  it("skips stored rows that no longer pass the schema", async () => {
    const user = await signIn("ada@example.com");
    const good = resume();
    await save(good);
    const db = await getDb();
    await db.insert(resumes).values([
      {
        userId: user.id,
        id: "not-an-object",
        data: sql`'"just text"'::jsonb`,
        createdAt: 1,
        updatedAt: 9_000,
      },
      {
        userId: user.id,
        id: "old-shape",
        data: sql`${JSON.stringify({ id: "old-shape" })}::jsonb`,
        createdAt: 1,
        updatedAt: 9_000,
      },
    ]);

    expect(await list()).toEqual([good]);
  });
});

describe("Free's resume limit", () => {
  const own = (overrides: Partial<Resume> = {}) => resume({ source: "import", ...overrides });

  it(`refuses a new resume past ${RESUME_LIMITS.free} on Free with the trial prompt`, async () => {
    await signIn("ada@example.com", "free");
    const first = own({ title: "First" });
    expect(await saved(await save(first))).toEqual({ ok: true, deleted: false });

    const second = await save(own({ title: "Second" }));
    expect(second.status).toBe(402);
    expect(await errorOf(second)).toEqual({
      code: "upgrade_required",
      message: "Free keeps 1 resume. Try Pro for 3 days.",
    });
    expect(await list()).toEqual([first]);

    const edited = { ...first, title: "First, edited", updatedAt: 9_000 };
    expect((await save(edited)).status).toBe(200);
    expect(await list()).toEqual([edited]);

    await remove(first.id);
    expect((await save(own({ title: "Another" }))).status).toBe(200);
  });

  it("keeps a sample beside Free's one resume, in a slot of its own", async () => {
    await signIn("ada@example.com", "free");
    const sample = resume({ updatedAt: 2_000 });
    const mine = own({ title: "Mine" });
    expect((await save(sample)).status).toBe(200);
    expect((await save(mine)).status).toBe(200);
    expect(await list()).toEqual([sample, mine]);

    expect((await save(own({ title: "Another of mine" }))).status).toBe(402);
    expect((await save(resume({ title: "Second sample" }))).status).toBe(402);
    expect(await list()).toHaveLength(2);
  });

  it("checks a copy that changes kind like a new one, so it can't slip past either count", async () => {
    await signIn("ada@example.com", "free");
    const sample = resume({ updatedAt: 2_000 });
    const mine = own({ title: "Mine" });
    await save(sample);
    await save(mine);

    expect((await save({ ...sample, source: "import", updatedAt: 3_000 })).status).toBe(402);
    expect((await save({ ...mine, source: "sample", updatedAt: 3_000 })).status).toBe(402);
    expect(await list()).toEqual([sample, mine]);

    const edited = { ...sample, title: "Sample, edited", updatedAt: 4_000 };
    expect((await save(edited)).status).toBe(200);
    await remove(mine.id);
    expect((await save({ ...edited, source: "import", updatedAt: 5_000 })).status).toBe(200);
  });

  it("takes more resumes on the trial and on Pro", async () => {
    for (const [email, plan] of [
      ["trial@example.com", "trial"],
      ["pro@example.com", "pro"],
    ] as const) {
      await signIn(email, plan);
      for (let i = 0; i < 3; i++)
        expect((await save(resume({ updatedAt: 10_000 + i }))).status).toBe(200);
      expect(await list()).toHaveLength(3);
    }
  });

  it("keeps every resume usable on Free after a paid plan ends, but adds no more", async () => {
    const user = await signIn("ada@example.com", "trial");
    const kept = [own({ updatedAt: 3_000 }), own({ updatedAt: 2_000 }), own({ updatedAt: 1_500 })];
    for (const item of kept) await save(item);
    const db = await getDb();
    await db
      .update(users)
      .set({ plan: "free", planStatus: "canceled", trialEndsAt: null })
      .where(eq(users.id, user.id));

    expect(await list()).toEqual(kept);
    const edited = { ...kept[2]!, title: "Still mine", updatedAt: 5_000 };
    expect((await save(edited)).status).toBe(200);
    expect((await list())[0]).toEqual(edited);
    expect((await save(own({ updatedAt: 6_000 }))).status).toBe(402);
    expect(await list()).toHaveLength(3);
  });
});

describe("/api/resumes deletions", () => {
  it("lists nothing as deleted before anything is deleted", async () => {
    await signIn("ada@example.com");
    await save(resume());
    expect((await listed()).deletedIds).toEqual([]);
  });

  it("remembers a deletion so another device's copy can't bring it back", async () => {
    const user = await signIn("ada@example.com");
    const keep = resume({ title: "Keep" });
    const drop = resume({ title: "Drop", updatedAt: 2_000 });
    await save(keep);
    await save(drop);

    expect((await remove(drop.id)).status).toBe(200);
    expect(await tombstonesOf(user.id)).toEqual([{ id: drop.id, deletedAt: expect.any(Number) }]);

    const res = await save({
      ...drop,
      title: "Edited on device B",
      updatedAt: Date.now() + 60_000,
    });
    expect(await saved(res)).toEqual({ ok: true, deleted: true });
    expect(await listed()).toEqual({ resumes: [keep], deletedIds: [drop.id] });

    expect(await saved(await save(drop))).toEqual({ ok: true, deleted: true });
    expect(await list()).toEqual([keep]);
  });

  it("lists deletions newest first and caps the list", async () => {
    const user = await signIn("ada@example.com");
    const first = resume();
    const second = resume();
    await save(first);
    await save(second);
    await remove(first.id);
    await remove(second.id);
    const ids = (await listed()).deletedIds;
    expect(new Set(ids)).toEqual(new Set([first.id, second.id]));

    const now = Date.now();
    await insertTombstones(
      user.id,
      Array.from({ length: MAX_DELETED_IDS_LISTED + 20 }, (_, i) => ({
        id: `old-${String(i).padStart(4, "0")}`,
        deletedAt: now - DAY_MS - i,
      })),
    );
    const capped = (await listed()).deletedIds;
    expect(capped).toHaveLength(MAX_DELETED_IDS_LISTED);
    expect(new Set(capped.slice(0, 2))).toEqual(new Set([first.id, second.id]));
    expect(capped[2]).toBe("old-0000");
    expect(capped.at(-1)).toBe(`old-${String(MAX_DELETED_IDS_LISTED - 3).padStart(4, "0")}`);
  });

  it("leaves no tombstone for a resume that was never backed up", async () => {
    const user = await signIn("ada@example.com");
    const neverSaved = resume();
    expect((await remove(neverSaved.id)).status).toBe(200);
    expect(await tombstonesOf(user.id)).toEqual([]);
    expect(await saved(await save(neverSaved))).toEqual({ ok: true, deleted: false });
    expect(await list()).toEqual([neverSaved]);
  });

  it("keeps each account's deletions apart, even under the same id", async () => {
    const shared = resume({ title: "Same id" });
    const ada = await signIn("ada@example.com");
    await save(shared);
    await remove(shared.id);

    const grace = await signIn("grace@example.com");
    expect((await listed()).deletedIds).toEqual([]);
    expect(await saved(await save(shared))).toEqual({ ok: true, deleted: false });
    expect(await list()).toEqual([shared]);
    expect(await tombstonesOf(grace.id)).toEqual([]);

    await remove(resume().id);
    await remove(shared.id);
    expect(await tombstonesOf(grace.id)).toEqual([
      { id: shared.id, deletedAt: expect.any(Number) },
    ]);
    expect(await tombstonesOf(ada.id)).toEqual([{ id: shared.id, deletedAt: expect.any(Number) }]);

    await signIn("ada@example.com");
    expect(await listed()).toEqual({ resumes: [], deletedIds: [shared.id] });
  });

  it("frees a slot under the cap when a resume is deleted", async () => {
    await signIn("ada@example.com");
    const saved50: Resume[] = [];
    for (let i = 0; i < MAX_RESUMES_PER_USER; i++) {
      const item = resume({ updatedAt: 10_000 + i });
      saved50.push(item);
      await save(item);
    }
    const first = saved50[0];
    if (!first) throw new Error("no resumes saved");
    await remove(first.id);
    expect(await saved(await save(resume()))).toEqual({ ok: true, deleted: false });
    expect(await list()).toHaveLength(MAX_RESUMES_PER_USER);
  });

  it("prunes tombstones older than the retention window when deleting", async () => {
    const user = await signIn("ada@example.com");
    const now = Date.now();
    await insertTombstones(user.id, [
      { id: "expired", deletedAt: now - TOMBSTONE_MAX_AGE_MS - DAY_MS },
      { id: "recent", deletedAt: now - DAY_MS },
    ]);
    const item = resume();
    await save(item);
    await remove(item.id);

    const ids = (await tombstonesOf(user.id)).map((row) => row.id).sort();
    expect(ids).toEqual(["recent", item.id].sort());
  });

  it(`keeps at most ${MAX_TOMBSTONES_PER_USER} tombstones per account, dropping the oldest`, async () => {
    const user = await signIn("ada@example.com");
    const now = Date.now();
    await insertTombstones(
      user.id,
      Array.from({ length: MAX_TOMBSTONES_PER_USER }, (_, i) => ({
        id: `t-${String(i).padStart(4, "0")}`,
        deletedAt: now - DAY_MS - i,
      })),
    );
    const item = resume();
    await save(item);
    await remove(item.id);

    const rows = await tombstonesOf(user.id);
    expect(rows).toHaveLength(MAX_TOMBSTONES_PER_USER);
    const ids = new Set(rows.map((row) => row.id));
    expect(ids.has(item.id)).toBe(true);
    expect(ids.has(`t-${String(MAX_TOMBSTONES_PER_USER - 1).padStart(4, "0")}`)).toBe(false);
    expect(ids.has("t-0000")).toBe(true);
  });
});

describe("/api/resumes edits and the copy they were made on", () => {
  it("writes an edit made on the account's current copy", async () => {
    await signIn("ada@example.com");
    const first = resume({ title: "First", updatedAt: 2_000 });
    await save(first);
    const res = await put(
      { ...first, title: "Second", updatedAt: 3_000 },
      first.id,
      "application/json",
      2_000,
    );
    expect(await saved(res)).toEqual({ ok: true, deleted: false });
    expect((await list())[0]?.title).toBe("Second");
  });

  it("says when the account moved on since, and writes nothing", async () => {
    await signIn("ada@example.com");
    const first = resume({ title: "First", updatedAt: 2_000 });
    await save(first);
    await save({ ...first, title: "From the laptop", updatedAt: 3_000 });

    const fromPhone = { ...first, title: "From the phone", updatedAt: 9_000 };
    const stale = { ok: true, deleted: false, stale: true };
    expect(await saved(await put(fromPhone, first.id, "application/json", 2_000))).toEqual(stale);
    expect(await saved(await save({ ...first, title: "Late", updatedAt: 2_500 }))).toEqual(stale);
    expect((await list())[0]?.title).toBe("From the laptop");
  });

  it("takes the copy it already holds, sent again, as saved and writes nothing", async () => {
    await signIn("ada@example.com");
    const first = resume({ title: "First", updatedAt: 2_000 });
    await save(first);
    const edited = { ...first, title: "Edited", updatedAt: 3_000 };
    const savedNow = { ok: true, deleted: false };
    expect(await saved(await put(edited, first.id, "application/json", 2_000))).toEqual(savedNow);

    const again = { ...edited, title: "Same version, other text" };
    expect(await saved(await put(again, first.id, "application/json", 2_000))).toEqual(savedNow);
    expect(await saved(await save(again))).toEqual(savedNow);
    expect((await list())[0]?.title).toBe("Edited");
  });

  it("saves a new resume whatever base it names, and ignores a base that isn't a version", async () => {
    await signIn("ada@example.com");
    const item = resume();
    expect(await saved(await put(item, item.id, "application/json", 123))).toEqual({
      ok: true,
      deleted: false,
    });
    const req = new Request(`http://localhost/api/resumes/${item.id}?base=soon`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...item, title: "Edited", updatedAt: 5_000 }),
    });
    expect(await saved(await PUT(req, context(item.id)))).toEqual({ ok: true, deleted: false });
    expect((await list())[0]?.title).toBe("Edited");
  });
});

describe("POST /api/resumes", () => {
  it("sends in full only the resumes whose version differs from the browser's", async () => {
    await signIn("ada@example.com");
    const same = resume({ title: "Same", updatedAt: 2_000 });
    const changed = resume({ title: "Changed", updatedAt: 3_000 });
    const onlyThere = resume({ title: "Only in the account", updatedAt: 4_000 });
    const deleted = resume({ title: "Deleted" });
    for (const item of [same, changed, onlyThere, deleted]) await save(item);
    await remove(deleted.id);

    const res = await listSince({
      known: { [same.id]: 2_000, [changed.id]: 1_000, "not-hers": 5 },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual({
      ok: true,
      resumes: [onlyThere, changed],
      unchanged: [same.id],
      deletedIds: [deleted.id],
    });
  });

  it("needs a session and a valid list", async () => {
    expect((await listSince({ known: {} })).status).toBe(401);
    await signIn("ada@example.com");
    expect((await listSince({ known: { a: -1 } })).status).toBe(400);
    const tooMany = Object.fromEntries(Array.from({ length: 201 }, (_, i) => [`id-${i}`, 1]));
    expect((await listSince({ known: tooMany })).status).toBe(400);
    expect((await listSince({ known: {} }, "text/plain")).status).toBe(415);
  });
});
