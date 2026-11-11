import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { execSql } from "@/db/testing";
import { getCurrentUser } from "@/lib/auth/session";
import {
  AUTH_COOKIE,
  cookieJar,
  createUser,
  fakeAuth,
  jsonRequest,
  resetDb,
} from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import { POST as logout } from "./logout/route";
import { POST as requestCode } from "./request-code/route";
import { POST as verify } from "./verify/route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

const ask = (email: string, ip?: string) =>
  requestCode(jsonRequest("/api/auth/request-code", { email }, ip ? { ip } : undefined));
const check = (email: string, code: string, ip?: string) =>
  verify(jsonRequest("/api/auth/verify", { email, code }, ip ? { ip } : undefined));

function wrong(code: string): string {
  return String((Number(code) + 1) % 1_000_000).padStart(6, "0");
}

beforeEach(async () => {
  await resetDb();
  cookieJar.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  resetEnvForTests();
});

describe("POST /api/auth/request-code", () => {
  it("has Supabase email a code and answers the same for known and new addresses", async () => {
    await createUser("known@example.com");
    const known = await ask("known@example.com");
    const fresh = await ask("New@Example.com");

    expect(known.status).toBe(200);
    expect(fresh.status).toBe(200);
    expect(await known.json()).toEqual({ ok: true });
    expect(await fresh.json()).toEqual({ ok: true });
    expect(fakeAuth.sent).toEqual([
      { email: "known@example.com", code: expect.stringMatching(/^\d{6}$/), shouldCreateUser: true },
      { email: "new@example.com", code: expect.stringMatching(/^\d{6}$/), shouldCreateUser: true },
    ]);
  });

  it("rejects a bad address with a plain message", async () => {
    const res = await ask("not-an-email");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      ok: false,
      error: { code: "bad_request", message: "Enter a valid email address." },
    });
  });

  it("refuses non-JSON bodies, which is what a cross-site form would send", async () => {
    const req = jsonRequest("/api/auth/request-code", { email: "ada@example.com" }, { contentType: "text/plain" });
    const res = await requestCode(req);
    expect(res.status).toBe(415);
    expect(fakeAuth.sent).toHaveLength(0);
  });

  it("says sign-in isn't set up when Supabase isn't configured", async () => {
    fakeAuth.setConfigured(false);
    const res = await ask("ada@example.com");
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({
      ok: false,
      error: { code: "auth_unavailable", message: "Sign-in isn't set up yet. Please try again later." },
    });
  });

  it.each([
    ["Supabase's own per-address limit", new AuthApiError("wait", 429, "over_email_send_rate_limit"), 429, "rate_limited"],
    ["an SMTP failure", new AuthApiError("Error sending magic link email", 500, "unexpected_failure"), 502, "email_unavailable"],
    ["the built-in mailer refusing outside addresses", new AuthApiError("not authorized", 400, "email_address_not_authorized"), 502, "email_unavailable"],
    ["Supabase being unreachable", new AuthRetryableFetchError("fetch failed", 0), 502, "email_unavailable"],
    ["email sign-in switched off", new AuthApiError("disabled", 422, "otp_disabled"), 503, "auth_unavailable"],
  ] as const)("answers %s with %i %s", async (_case, error, status, code) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    fakeAuth.failNext("signInWithOtp", error);
    const res = await ask("ada@example.com");
    expect(res.status).toBe(status);
    expect(await res.json()).toMatchObject({ ok: false, error: { code } });
  });

  it("keeps the address and IP out of the log when the database fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await execSql("alter table public.rate_limits rename to rate_limits_away");
    try {
      const sent = await ask("ada@example.com");
      const checked = await check("ada@example.com", "123456");
      expect(sent.status).toBe(500);
      expect(checked.status).toBe(500);
    } finally {
      await execSql("alter table public.rate_limits_away rename to rate_limits");
    }
    const output = JSON.stringify(error.mock.calls);
    expect(output).toContain("auth.request_code_failed");
    expect(output).toContain("auth.verify_failed");
    expect(output).toContain("does not exist");
    expect(output).not.toContain("ada@example.com");
    expect(output).not.toContain("203.0.113.7");
  });

  it("answers 429 with Retry-After once the address is over its hourly limit", async () => {
    for (let i = 0; i < 5; i++) expect((await ask("ada@example.com", `10.0.0.${i}`)).status).toBe(200);
    const res = await ask("ada@example.com", "10.0.0.99");
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(await res.json()).toMatchObject({ ok: false, error: { code: "rate_limited" } });
    expect(fakeAuth.sent).toHaveLength(5);
  });

  it("limits codes per IP across addresses", async () => {
    for (let i = 0; i < 10; i++) expect((await ask(`user${i}@example.com`, "10.1.1.1")).status).toBe(200);
    expect((await ask("one-more@example.com", "10.1.1.1")).status).toBe(429);
  });
});

describe("POST /api/auth/verify", () => {
  it("signs in, sets the session cookie and returns the user, never cached", async () => {
    await ask("Ada@Example.com");
    const res = await check("ada@example.com", fakeAuth.lastCode());

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toMatchObject({ ok: true, user: { email: "ada@example.com", plan: "free" } });
    expect(cookieJar.get(AUTH_COOKIE)?.value).not.toBe("");
    await expect(getCurrentUser()).resolves.toMatchObject({ email: "ada@example.com" });
  });

  it("reuses the account on later sign-ins", async () => {
    await ask("ada@example.com");
    const first = (await (await check("ada@example.com", fakeAuth.lastCode())).json()) as { user: { id: string } };
    cookieJar.clear();
    await ask("ADA@example.com");
    const second = (await (await check("ada@example.com", fakeAuth.lastCode())).json()) as { user: { id: string } };
    expect(second.user.id).toBe(first.user.id);
  });

  it("answers a wrong or used code with 400 and a plain message, and sets no cookie", async () => {
    await ask("ada@example.com");
    const code = fakeAuth.lastCode();
    const res = await check("ada@example.com", wrong(code));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      ok: false,
      error: {
        code: "bad_request",
        message: "That code didn't work or has expired. Check the email or ask for a new one.",
      },
    });
    expect(cookieJar.get(AUTH_COOKIE)).toBeUndefined();

    expect((await check("ada@example.com", code)).status).toBe(200);
    cookieJar.clear();
    expect((await check("ada@example.com", code)).status).toBe(400);
  });

  it("asks for the 6-digit code when the body is malformed", async () => {
    const res = await check("ada@example.com", "12a");
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      error: { code: "bad_request", message: "Enter the 6-digit code from the email." },
    });
  });

  it("refuses non-JSON bodies", async () => {
    const req = jsonRequest(
      "/api/auth/verify",
      { email: "ada@example.com", code: "123456" },
      { contentType: "application/x-www-form-urlencoded" },
    );
    expect((await verify(req)).status).toBe(415);
  });

  it("limits guesses per IP", async () => {
    for (let i = 0; i < 30; i++) {
      expect((await check(`user${i % 3}@example.com`, "123456", "192.0.2.9")).status).toBe(400);
    }
    const res = await check("ada@example.com", "123456", "192.0.2.9");
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
  });

  it("limits guesses per address, from any IP", async () => {
    await ask("ada@example.com");
    for (let i = 0; i < 10; i++) {
      expect((await check("ada@example.com", "000000", `198.51.100.${i}`)).status).toBe(400);
    }
    expect((await check("ada@example.com", fakeAuth.lastCode(), "198.51.100.200")).status).toBe(429);
  });

  it("answers 500 when Supabase can't check the code", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fakeAuth.failNext("verifyOtp", new AuthRetryableFetchError("fetch failed", 0));
    const res = await check("ada@example.com", "123456");
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: { code: "server_error" } });
  });

  it("says sign-in isn't set up when Supabase isn't configured", async () => {
    fakeAuth.setConfigured(false);
    const res = await check("ada@example.com", "123456");
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: { code: "auth_unavailable" } });
  });
});

describe("POST /api/auth/logout", () => {
  const logoutRequest = (headers: Record<string, string> = {}) =>
    new Request("http://localhost/api/auth/logout", { method: "POST", headers });

  async function signedIn(): Promise<string> {
    await ask("ada@example.com");
    await check("ada@example.com", fakeAuth.lastCode());
    await expect(getCurrentUser()).resolves.toMatchObject({ email: "ada@example.com" });
    return cookieJar.get(AUTH_COOKIE)?.value ?? "";
  }

  it("expires the session cookie and ends the session behind it", async () => {
    const token = await signedIn();

    const res = await logout(logoutRequest({ "sec-fetch-site": "same-origin" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(cookieJar.get(AUTH_COOKIE)).toMatchObject({ value: "", maxAge: 0, path: "/", httpOnly: true });

    cookieJar.set(AUTH_COOKIE, token);
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("still clears the cookie when Supabase can't be reached", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await signedIn();
    fakeAuth.failNext("signOut", new AuthRetryableFetchError("fetch failed", 0));
    const res = await logout(logoutRequest());
    expect(res.status).toBe(200);
    expect(cookieJar.get(AUTH_COOKIE)).toMatchObject({ value: "", maxAge: 0 });
  });

  it("succeeds without a session, and without Supabase", async () => {
    expect((await logout(logoutRequest())).status).toBe(200);
    fakeAuth.setConfigured(false);
    const res = await logout(logoutRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("ignores a sign-out another website's page sent", async () => {
    const token = await signedIn();

    const fromElsewhere: Record<string, string>[] = [
      { "sec-fetch-site": "cross-site" },
      { origin: "https://evil.example" },
    ];
    for (const headers of fromElsewhere) {
      const res = await logout(logoutRequest(headers));
      expect(res.status).toBe(403);
      expect(await res.json()).toMatchObject({ ok: false, error: { code: "forbidden" } });
    }
    expect(cookieJar.get(AUTH_COOKIE)?.value).toBe(token);
    await expect(getCurrentUser()).resolves.toMatchObject({ email: "ada@example.com" });
  });
});
