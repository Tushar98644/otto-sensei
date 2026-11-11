import { AuthRetryableFetchError } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { execSql } from "@/db/testing";
import { clearSession, getCurrentUser } from "./session";
import { AUTH_COOKIE, cookieJar, fakeAuth, resetDb, signInAs } from "./test-helpers";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

beforeEach(async () => {
  await resetDb();
  cookieJar.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getCurrentUser", () => {
  it("returns the signed-in user", async () => {
    const user = await signInAs("ada@example.com");
    await expect(getCurrentUser()).resolves.toEqual({
      id: user.id,
      email: "ada@example.com",
      plan: "free",
      planInterval: null,
      planRenewsAt: null,
      trialEndsAt: null,
      planPeriodStartsAt: null,
      planPeriodEndsAt: null,
    });
  });

  it("reads the plan from our database, not the session", async () => {
    const user = await signInAs("ada@example.com");
    const db = await getDb();
    await db.update(users).set({ plan: "pro" }).where(eq(users.id, user.id));
    await expect(getCurrentUser()).resolves.toMatchObject({ plan: "pro" });
  });

  it("creates our row on the first request after Supabase signs someone in", async () => {
    const user = await signInAs("ada@example.com");
    const db = await getDb();
    await db.delete(users).where(eq(users.id, user.id));
    await expect(getCurrentUser()).resolves.toMatchObject({ id: user.id, plan: "free" });
    expect(await db.select().from(users).where(eq(users.id, user.id))).toHaveLength(1);
  });

  it("returns null without a session cookie, or for one Supabase doesn't know", async () => {
    await expect(getCurrentUser()).resolves.toBeNull();
    cookieJar.set(AUTH_COOKIE, "garbage");
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("returns null once the auth user is deleted, even with a cookie that looks fine", async () => {
    const user = await signInAs("ada@example.com");
    const token = cookieJar.get(AUTH_COOKIE)?.value ?? "";
    await execSql("delete from auth.users where id = $1", [user.id]);
    fakeAuth.reset();
    cookieJar.set(AUTH_COOKIE, token);
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("returns null when sign-in isn't configured", async () => {
    await signInAs("ada@example.com");
    fakeAuth.setConfigured(false);
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("throws instead of signing anyone out when Supabase can't answer", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await signInAs("ada@example.com");
    fakeAuth.failNext("getUser", new AuthRetryableFetchError("fetch failed", 0));
    await expect(getCurrentUser()).rejects.toThrow("Supabase Auth is unavailable");
    await expect(getCurrentUser()).resolves.toMatchObject({ email: "ada@example.com" });
  });
});

describe("clearSession", () => {
  it("ends this browser's session and expires its cookies, leaving other devices signed in", async () => {
    const user = await signInAs("ada@example.com");
    const laptop = cookieJar.get(AUTH_COOKIE)?.value ?? "";
    await signInAs("ada@example.com");
    expect(fakeAuth.activeSessions(user.id)).toBe(2);

    await clearSession();
    expect(cookieJar.get(AUTH_COOKIE)).toMatchObject({ value: "", maxAge: 0, path: "/", httpOnly: true, sameSite: "lax" });
    expect(fakeAuth.activeSessions(user.id)).toBe(1);
    cookieJar.set(AUTH_COOKIE, laptop);
    await expect(getCurrentUser()).resolves.toMatchObject({ id: user.id });
  });

  it("expires stray Supabase cookies but leaves the app's own alone", async () => {
    cookieJar.set(`${AUTH_COOKIE}.0`, "chunk");
    cookieJar.set(`${AUTH_COOKIE}-code-verifier`, "verifier");
    cookieJar.set("otto_did", "device");
    await clearSession();
    expect(cookieJar.get(`${AUTH_COOKIE}.0`)).toMatchObject({ value: "", maxAge: 0 });
    expect(cookieJar.get(`${AUTH_COOKIE}-code-verifier`)).toMatchObject({ value: "", maxAge: 0 });
    expect(cookieJar.get("otto_did")?.value).toBe("device");
  });
});
