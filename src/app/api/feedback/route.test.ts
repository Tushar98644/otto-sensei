import { desc } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { feedback } from "@/db/schema";
import type { ApiErrorBody } from "@/lib/api/types";
import { cookieJar, fakeAuth, jsonRequest, resetDb, signInAs } from "@/lib/auth/test-helpers";
import { freezeClock } from "@/lib/timing-testing";
import { AuthRetryableFetchError } from "@supabase/supabase-js";
import { POST } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

const NOTE = {
  kind: "bug",
  message: "The download button does nothing on my phone.",
  pagePath: "/studio",
};

async function saved() {
  const db = await getDb();
  return db.select().from(feedback).orderBy(desc(feedback.createdAt));
}

async function errorCode(res: Response): Promise<string> {
  return ((await res.json()) as ApiErrorBody).error.code;
}

beforeEach(async () => {
  await resetDb();
  cookieJar.clear();
});

describe("POST /api/feedback", () => {
  it("takes a note signed out, with no account on it", async () => {
    const res = await POST(jsonRequest("/api/feedback", NOTE));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(await saved()).toMatchObject([
      { userId: null, kind: "bug", message: NOTE.message, pagePath: "/studio" },
    ]);
  });

  it("ties a signed-in note to the account", async () => {
    const user = await signInAs("ines@example.com");
    await POST(jsonRequest("/api/feedback", { ...NOTE, kind: "idea" }));
    expect(await saved()).toMatchObject([{ userId: user.id, kind: "idea" }]);
  });

  it("still takes the note when sign-in can't be checked", async () => {
    await signInAs("ines@example.com");
    fakeAuth.failNext("getUser", new AuthRetryableFetchError("fetch failed", 503));
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect((await POST(jsonRequest("/api/feedback", NOTE))).status).toBe(200);
    expect(await saved()).toMatchObject([{ userId: null }]);
    vi.restoreAllMocks();
  });

  it("keeps a path on this site only, and the note without a bad one", async () => {
    for (const pagePath of [
      "https://evil.example/x",
      "//evil.example",
      "/studio?id=1",
      "/ space",
    ]) {
      expect((await POST(jsonRequest("/api/feedback", { ...NOTE, pagePath }))).status).toBe(200);
    }
    expect((await saved()).map((row) => row.pagePath)).toEqual([null, null, null, null]);
  });

  it("refuses empty or oversized notes and non-JSON bodies", async () => {
    for (const body of [
      { ...NOTE, message: "  hi  " },
      { ...NOTE, message: "x".repeat(2_001) },
      { ...NOTE, kind: "rant" },
    ]) {
      const res = await POST(jsonRequest("/api/feedback", body));
      expect(res.status).toBe(400);
      expect(await errorCode(res)).toBe("bad_request");
    }
    expect(
      (await POST(jsonRequest("/api/feedback", NOTE, { contentType: "text/plain" }))).status,
    ).toBe(415);
    expect(await saved()).toEqual([]);
  });

  it("limits one browser to 10 notes an hour", async () => {
    freezeClock();
    for (let i = 0; i < 10; i++) {
      expect((await POST(jsonRequest("/api/feedback", NOTE))).status).toBe(200);
    }
    const res = await POST(jsonRequest("/api/feedback", NOTE));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).not.toBeNull();
    expect(await saved()).toHaveLength(10);
  });
});
