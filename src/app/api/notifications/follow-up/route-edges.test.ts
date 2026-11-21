import { AuthRetryableFetchError } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { applications } from "@/db/schema";
import type { ApiErrorBody } from "@/lib/api/types";
import { cookieJar, createUser, fakeAuth, resetDb, signInAs } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import type { FollowUpActionResponse } from "@/lib/notifications/types";
import { followUpActionUrl } from "@/lib/notifications/unsubscribe";
import { POST } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

const DAY = 24 * 60 * 60 * 1_000;
const INVALID = "That reminder link isn't valid any more. Open your applications instead.";

async function seed(userId: string) {
  const id = crypto.randomUUID();
  const now = Date.now();
  await (await getDb()).insert(applications).values({
    id,
    userId,
    company: "Stripe",
    appliedAt: now - 8 * DAY,
    statusChangedAt: now,
    followUpAt: now - DAY,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

function signedBody(userId: string, applicationId: string, action: "done" | "snooze") {
  const url = new URL(
    followUpActionUrl(userId, applicationId, action) ?? "https://otto.test/reminder",
  );
  return {
    u: url.searchParams.get("u"),
    a: url.searchParams.get("a"),
    act: url.searchParams.get("do"),
    t: url.searchParams.get("t"),
  };
}

function send(body: unknown, headers: Record<string, string> = {}) {
  return POST(
    new Request("http://localhost/api/notifications/follow-up", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

const followUpOf = async (id: string) =>
  (await (await getDb()).select().from(applications).where(eq(applications.id, id)))[0]?.followUpAt;

async function errorOf(res: Response): Promise<ApiErrorBody["error"]> {
  return ((await res.json()) as ApiErrorBody).error;
}

describe("POST /api/notifications/follow-up", () => {
  beforeEach(async () => {
    await resetDb();
    cookieJar.clear();
    process.env.CRON_SECRET = "test-cron-secret-0123456789";
    process.env.NEXT_PUBLIC_APP_URL = "https://otto.test";
    resetEnvForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.CRON_SECRET;
    delete process.env.NEXT_PUBLIC_APP_URL;
    resetEnvForTests();
  });

  it("refuses another website's request and a body that isn't sent as JSON, changing nothing", async () => {
    const maya = await createUser("maya@example.com");
    const id = await seed(maya.id);
    const body = signedBody(maya.id, id, "done");

    const cross = await send(body, { "sec-fetch-site": "cross-site" });
    expect(cross.status).toBe(403);
    expect((await errorOf(cross)).code).toBe("forbidden");
    expect((await send(body, { origin: "https://elsewhere.example" })).status).toBe(403);
    const plain = await send(body, { "content-type": "text/plain" });
    expect(plain.status).toBe(415);
    expect((await errorOf(plain)).code).toBe("unsupported_type");
    expect(await followUpOf(id)).not.toBeNull();
  });

  it("answers broken JSON, an unknown action or a missing application id with the invalid-link message", async () => {
    const maya = await signInAs("maya@example.com");
    const id = await seed(maya.id);
    for (const body of [
      "{not json",
      { a: id, act: "delete" },
      { act: "done" },
      { a: "not-a-uuid", act: "done" },
    ]) {
      const res = await send(body);
      expect(res.status).toBe(400);
      expect(res.headers.get("cache-control")).toBe("no-store");
      expect(await errorOf(res)).toEqual({ code: "bad_request", message: INVALID });
    }
    expect(await followUpOf(id)).not.toBeNull();
  });

  it("acts for the link's account, not whoever is signed in on this browser", async () => {
    const maya = await createUser("maya@example.com");
    const own = await seed(maya.id);
    const sam = await signInAs("sam@example.com");
    const samsOwn = await seed(sam.id);

    const res = await send(signedBody(maya.id, own, "done"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, company: "Stripe", followUpAt: null });
    expect(await followUpOf(own)).toBeNull();
    expect(await followUpOf(samsOwn)).not.toBeNull();
  });

  it("never lets one account's signed link reach another account's application", async () => {
    const maya = await createUser("maya@example.com");
    const sam = await createUser("sam@example.com");
    const theirs = await seed(maya.id);
    const res = await send(signedBody(sam.id, theirs, "done"));
    expect(res.status).toBe(404);
    expect(await errorOf(res)).toEqual({
      code: "not_found",
      message: "That application isn't in your list any more.",
    });
    expect(await followUpOf(theirs)).not.toBeNull();
  });

  it("snoozes from the bell for the signed-in account", async () => {
    const maya = await signInAs("maya@example.com");
    const id = await seed(maya.id);
    const before = Date.now();
    const res = (await (await send({ a: id, act: "snooze" })).json()) as FollowUpActionResponse;
    expect(res.followUpAt).toBeGreaterThanOrEqual(before + 3 * DAY);
    expect(await followUpOf(id)).toBe(res.followUpAt);
  });

  it("answers 500 when sign-in is down for the bell, without changing the application", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const maya = await signInAs("maya@example.com");
    const id = await seed(maya.id);
    fakeAuth.failNext("getUser", new AuthRetryableFetchError("fetch failed at 10.0.0.7", 0));
    const res = await send({ a: id, act: "done" });
    const text = await res.text();
    expect(res.status).toBe(500);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(JSON.parse(text)).toEqual({
      ok: false,
      error: { code: "server_error", message: "Couldn't save that. Please try again." },
    });
    expect(text).not.toContain("10.0.0.7");
    expect(await followUpOf(id)).not.toBeNull();
  });

  it("answers 500 when the database fails for an email link, and the same link works on retry", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const maya = await createUser("maya@example.com");
    const id = await seed(maya.id);
    const body = signedBody(maya.id, id, "done");
    vi.spyOn(await getDb(), "update").mockImplementationOnce(() => {
      throw new Error("database is down");
    });

    const failed = await send(body);
    expect(failed.status).toBe(500);
    expect((await errorOf(failed)).code).toBe("server_error");
    expect(await followUpOf(id)).not.toBeNull();

    expect((await send(body)).status).toBe(200);
    expect(await followUpOf(id)).toBeNull();
  });
});
