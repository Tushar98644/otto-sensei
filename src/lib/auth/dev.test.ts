import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE as deleteAccount } from "@/app/api/account/route";
import { POST as requestCodeRoute } from "@/app/api/auth/request-code/route";
import { getDb } from "@/db/client";
import { devSessions } from "@/db/local-schema";
import { users } from "@/db/schema";
import { resetEnvForTests } from "@/lib/env";
import { AuthError, requestLoginCode, verifyLoginCode } from "./codes";
import { DEV_SESSION_COOKIE } from "./dev-mode";
import { authMode, clearSession, getCurrentUser } from "./session";
import { cookieJar, fakeAuth, jsonRequest, resetDb } from "./test-helpers";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

const IP = "198.51.100.7";
const T0 = Date.UTC(2026, 10, 7, 12);

function setMode(nodeEnv: "development" | "production", devAuth?: string) {
  vi.stubEnv("NODE_ENV", nodeEnv);
  vi.stubEnv("DEV_AUTH", devAuth);
  resetEnvForTests();
}

async function signInDev(email = "ada@example.com") {
  const { devCode } = await requestLoginCode(email, IP);
  if (!devCode) throw new Error("no dev code");
  return verifyLoginCode(email, devCode);
}

beforeEach(async () => {
  await resetDb();
  cookieJar.clear();
  vi.spyOn(console, "info").mockImplementation(() => {});
  setMode("development");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  resetEnvForTests();
});

describe("dev sign-in", () => {
  it("hands the code back instead of emailing it, and needs no Supabase", async () => {
    fakeAuth.setConfigured(false);
    const { devCode } = await requestLoginCode("Ada@Example.com", IP);
    expect(devCode).toMatch(/^\d{6}$/);
    expect(fakeAuth.sent).toHaveLength(0);
    expect(authMode()).toBe("dev");
  });

  it("returns devCode from the route, for the sign-in form to show", async () => {
    const res = await requestCodeRoute(jsonRequest("/api/auth/request-code", { email: "ada@example.com" }));
    expect(await res.json()).toEqual({ ok: true, devCode: expect.stringMatching(/^\d{6}$/) });
  });

  it("signs in with the code, sets an httpOnly session cookie, and makes an ordinary account", async () => {
    const user = await signInDev("Ada@Example.com");
    expect(user).toMatchObject({ email: "ada@example.com", plan: "free" });
    expect(cookieJar.get(DEV_SESSION_COOKIE)).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
    await expect(getCurrentUser()).resolves.toEqual(user);

    const db = await getDb();
    await db.update(users).set({ plan: "pro" }).where(eq(users.id, user.id));
    await expect(getCurrentUser()).resolves.toMatchObject({ plan: "pro" });
  });

  it("keeps the same account for the same address", async () => {
    const first = await signInDev("ada@example.com");
    cookieJar.clear();
    const again = await signInDev("ADA@example.com");
    expect(again.id).toBe(first.id);
  });

  it("accepts each code once, and only the newest one", async () => {
    const { devCode: old } = await requestLoginCode("ada@example.com", IP);
    const { devCode: fresh } = await requestLoginCode("ada@example.com", IP);
    if (!old || !fresh) throw new Error("no dev code");
    if (old !== fresh) await expect(verifyLoginCode("ada@example.com", old)).rejects.toBeInstanceOf(AuthError);
    await expect(verifyLoginCode("ada@example.com", fresh)).resolves.toMatchObject({ email: "ada@example.com" });
    await expect(verifyLoginCode("ada@example.com", fresh)).rejects.toMatchObject({ code: "invalid_code" });
  });

  it("locks a code after 5 wrong tries and expires it after 10 minutes", async () => {
    vi.useFakeTimers({ now: T0, toFake: ["Date"] });
    const { devCode } = await requestLoginCode("ada@example.com", IP);
    const wrong = devCode === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) await expect(verifyLoginCode("ada@example.com", wrong)).rejects.toBeInstanceOf(AuthError);
    await expect(verifyLoginCode("ada@example.com", devCode ?? "")).rejects.toMatchObject({ code: "invalid_code" });

    const { devCode: later } = await requestLoginCode("ada@example.com", IP);
    vi.setSystemTime(T0 + 10 * 60 * 1000 + 1);
    await expect(verifyLoginCode("ada@example.com", later ?? "")).rejects.toMatchObject({ code: "invalid_code" });
  });

  it("still applies the per-address code limit", async () => {
    for (let i = 0; i < 5; i++) await requestLoginCode("ada@example.com", `10.0.0.${i}`);
    await expect(requestLoginCode("ada@example.com", "10.0.0.99")).rejects.toMatchObject({ code: "rate_limited" });
  });

  it("signs out for real: a copy of the cookie stops working", async () => {
    await signInDev();
    const copy = cookieJar.get(DEV_SESSION_COOKIE)?.value ?? "";
    await clearSession();
    expect(cookieJar.get(DEV_SESSION_COOKIE)).toMatchObject({ value: "", maxAge: 0 });
    cookieJar.set(DEV_SESSION_COOKIE, copy);
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("rejects a cookie whose signature doesn't match", async () => {
    await signInDev();
    const [id] = (cookieJar.get(DEV_SESSION_COOKIE)?.value ?? "").split(".");
    cookieJar.set(DEV_SESSION_COOKIE, `${id}.forged`);
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("deletes the account and every dev session without Supabase", async () => {
    fakeAuth.setConfigured(false, { admin: false });
    const user = await signInDev();
    const res = await deleteAccount();
    expect(res.status).toBe(200);
    const db = await getDb();
    expect(await db.select().from(users).where(eq(users.id, user.id))).toEqual([]);
    expect(await db.select().from(devSessions).where(eq(devSessions.userId, user.id))).toEqual([]);
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("is off with DEV_AUTH=supabase: codes go through Supabase", async () => {
    setMode("development", "supabase");
    expect(await requestLoginCode("ada@example.com", IP)).toEqual({});
    expect(fakeAuth.sent).toHaveLength(1);
    expect(authMode()).toBe("supabase");
  });
});

describe("dev sign-in in production", () => {
  it("never accepts a dev session cookie, even a valid one", async () => {
    await signInDev();
    expect(cookieJar.get(DEV_SESSION_COOKIE)?.value).toBeTruthy();
    setMode("production");
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("never hands out a code: it goes through Supabase, whatever DEV_AUTH says", async () => {
    for (const devAuth of [undefined, "dev", "anything"]) {
      setMode("production", devAuth);
      expect(await requestLoginCode("ada@example.com", `203.0.113.${fakeAuth.sent.length}`)).toEqual({});
      expect(authMode()).toBe("supabase");
    }
    expect(fakeAuth.sent).toHaveLength(3);
  });

  it("answers the route without devCode", async () => {
    setMode("production");
    const res = await requestCodeRoute(jsonRequest("/api/auth/request-code", { email: "ada@example.com" }));
    expect(await res.json()).toEqual({ ok: true });
  });
});
