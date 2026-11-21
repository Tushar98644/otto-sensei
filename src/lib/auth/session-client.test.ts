import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { resetEnvForTests } from "@/lib/env";
import { AUTH_DEADLINE_MS } from "@/lib/supabase/deadline";
import { getCurrentUser } from "./session";
import { cookieJar, createUser, fakeAccessToken, resetDb } from "./test-helpers";
import type { SessionUser } from "./types";

vi.unmock("@/lib/supabase/server");
vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

const deadline = vi.hoisted(() => ({ ms: undefined as number | undefined }));
vi.mock("@/lib/supabase/deadline", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase/deadline")>();
  return { ...actual, fetchWithDeadline: () => actual.fetchWithDeadline(deadline.ms) };
});

const SUPABASE_URL = "https://abcdefgh.supabase.co";
const SESSION_COOKIE = "sb-abcdefgh-auth-token";

function sessionCookie(user: SessionUser, expiresAt: number): string {
  const session = {
    access_token: fakeAccessToken(user.id),
    refresh_token: "refresh-1",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(expiresAt / 1000),
    user: { id: user.id, email: user.email, aud: "authenticated" },
  };
  return `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
}

// Supabase Auth over HTTP, as the real client sees it.
function supabaseAuth(user: SessionUser) {
  const account = { id: user.id, email: user.email, aud: "authenticated", identities: [] };
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const { pathname } = new URL(String(input));
    if (pathname === "/auth/v1/user") return Response.json(account);
    if (pathname === "/auth/v1/token") {
      return Response.json({
        access_token: fakeAccessToken(user.id),
        refresh_token: "refresh-2",
        token_type: "bearer",
        expires_in: 3600,
        user: account,
      });
    }
    return Response.json({ message: "Not found" }, { status: 404 });
  });
}

const calledPaths = (fetch: ReturnType<typeof supabaseAuth>) =>
  fetch.mock.calls.map(([input]) => new URL(String(input)).pathname);

beforeEach(async () => {
  deadline.ms = undefined;
  await resetDb();
  cookieJar.clear();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  resetEnvForTests();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("getCurrentUser with the real Supabase client", () => {
  it("asks Supabase once and reads our row beside it, with no insecure-session warning", async () => {
    const user = await createUser("ada@example.com");
    cookieJar.set(SESSION_COOKIE, sessionCookie(user, Date.now() + 60 * 60 * 1000));
    const fetch = supabaseAuth(user);
    const warn = vi.spyOn(console, "warn");
    const reads = vi.spyOn(await getDb(), "select");

    await expect(getCurrentUser()).resolves.toMatchObject({
      id: user.id,
      email: "ada@example.com",
    });
    expect(calledPaths(fetch)).toEqual(["/auth/v1/user"]);
    expect(reads).toHaveBeenCalledOnce();
    expect(warn).not.toHaveBeenCalled();
  });

  it("refreshes an expired token once, though both lookups load the session", async () => {
    const user = await createUser("ada@example.com");
    const expired = sessionCookie(user, Date.now() - 60_000);
    cookieJar.set(SESSION_COOKIE, expired);
    const fetch = supabaseAuth(user);

    await expect(getCurrentUser()).resolves.toMatchObject({ id: user.id });
    expect(calledPaths(fetch).sort()).toEqual(["/auth/v1/token", "/auth/v1/user"]);
    expect(cookieJar.get(SESSION_COOKIE)?.value).not.toBe(expired);
  });

  it("fails fast when Supabase takes the call and goes quiet, and signs nobody out", async () => {
    deadline.ms = 50;
    const user = await createUser("ada@example.com");
    const cookie = sessionCookie(user, Date.now() + 60 * 60 * 1000);
    cookieJar.set(SESSION_COOKIE, cookie);
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), {
            once: true,
          });
        }),
    );
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const startedAt = Date.now();
    await expect(getCurrentUser()).rejects.toThrow("Supabase Auth is unavailable");
    expect(Date.now() - startedAt).toBeLessThan(AUTH_DEADLINE_MS);
    expect(warn).toHaveBeenCalledWith(
      "[warn] auth.get_user_failed",
      expect.objectContaining({ reason: "AuthRetryableFetchError", status: 0 }),
    );
    expect(cookieJar.get(SESSION_COOKIE)?.value).toBe(cookie);
  });
});
