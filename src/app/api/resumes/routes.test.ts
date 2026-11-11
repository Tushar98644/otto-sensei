import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { resumes, resumeTombstones, users } from "@/db/schema";
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
import { GET } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

function resume(overrides: Partial<Resume> = {}): Resume {
  return { ...createSampleResume(1_000), ...overrides };
}

const context = (id: string) => ({ params: Promise.resolve({ id }) });

function put(body: unknown, id: string, contentType = "application/json"): Promise<Response> {
  const req = new Request(`http://localhost/api/resumes/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "content-type": contentType },
    body: JSON.stringify(body),
  });
  return PUT(req, context(id));
}

const save = (item: Resume) => put(item, item.id);

function remove(id: string): Promise<Response> {
  return DELETE(new Request(`http://localhost/api/resumes/${encodeURIComponent(id)}`, { method: "DELETE" }), context(id));
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
  return db
    .select({ id: resumeTombstones.id, deletedAt: resumeTombstones.deletedAt })
    .from(resumeTombstones)
    .where(eq(resumeTombstones.userId, userId));
}

async function insertTombstones(userId: string, rows: { id: string; deletedAt: number }[]) {
  const db = await getDb();
  for (let i = 0; i < rows.length; i += 200) {
    await db.insert(resumeTombstones).values(rows.slice(i, i + 200).map((row) => ({ userId, ...row })));
  }
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
      expect(await errorOf(res)).toEqual({ code: "unauthorized", message: "Sign in to sync your resumes." });
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
    expect(extra.status).toBe(400);
    expect(await errorOf(extra)).toEqual({
      code: "bad_request",
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
    const long = "Shipped a feature that customers loved and wrote about it at length. ".repeat(14).slice(0, 1_000);
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
      { userId: user.id, id: "not-an-object", data: sql`'"just text"'::jsonb`, createdAt: 1, updatedAt: 9_000 },
      { userId: user.id, id: "old-shape", data: sql`${JSON.stringify({ id: "old-shape" })}::jsonb`, createdAt: 1, updatedAt: 9_000 },
    ]);

    expect(await list()).toEqual([good]);
  });
});

describe("Free's resume limit", () => {
  it(`refuses a new resume past ${RESUME_LIMITS.free} on Free with the trial prompt`, async () => {
    await signIn("ada@example.com", "free");
    const first = resume({ title: "First" });
    expect(await saved(await save(first))).toEqual({ ok: true, deleted: false });

    const second = await save(resume({ title: "Second" }));
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
    expect((await save(resume({ title: "Another" }))).status).toBe(200);
  });

  it("takes more resumes on the trial and on Pro", async () => {
    for (const [email, plan] of [
      ["trial@example.com", "trial"],
      ["pro@example.com", "pro"],
    ] as const) {
      await signIn(email, plan);
      for (let i = 0; i < 3; i++) expect((await save(resume({ updatedAt: 10_000 + i }))).status).toBe(200);
      expect(await list()).toHaveLength(3);
    }
  });

  it("keeps every resume usable on Free after a paid plan ends, but adds no more", async () => {
    const user = await signIn("ada@example.com", "trial");
    const kept = [resume({ updatedAt: 3_000 }), resume({ updatedAt: 2_000 }), resume({ updatedAt: 1_500 })];
    for (const item of kept) await save(item);
    const db = await getDb();
    await db.update(users).set({ plan: "free", planStatus: "canceled", trialEndsAt: null }).where(eq(users.id, user.id));

    expect(await list()).toEqual(kept);
    const edited = { ...kept[2]!, title: "Still mine", updatedAt: 5_000 };
    expect((await save(edited)).status).toBe(200);
    expect((await list())[0]).toEqual(edited);
    expect((await save(resume({ updatedAt: 6_000 }))).status).toBe(402);
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

    const res = await save({ ...drop, title: "Edited on device B", updatedAt: Date.now() + 60_000 });
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
    expect(await tombstonesOf(grace.id)).toEqual([{ id: shared.id, deletedAt: expect.any(Number) }]);
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
