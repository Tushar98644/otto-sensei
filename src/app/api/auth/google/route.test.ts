import { AuthRetryableFetchError } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cookieJar, fakeAuth, jsonRequest, resetDb } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import { POST } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

const start = (body: unknown, contentType?: string) =>
  POST(jsonRequest("/api/auth/google", body, contentType ? { contentType } : undefined));

beforeEach(async () => {
  await resetDb();
  cookieJar.clear();
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://otto.example");
  resetEnvForTests();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  resetEnvForTests();
});

describe("POST /api/auth/google", () => {
  it("returns Google's URL, coming back to the callback on the public domain", async () => {
    const res = await start({ next: "/studio?step=fix" });
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const body = (await res.json()) as { ok: boolean; url: string };
    expect(body.url).toMatch(/^https:\/\/project\.supabase\.test\/auth\/v1\/authorize\?provider=google/);
    expect(fakeAuth.oauthStarts).toMatchObject([
      {
        provider: "google",
        options: {
          redirectTo: "https://otto.example/auth/callback?next=%2Fstudio%3Fstep%3Dfix",
          skipBrowserRedirect: true,
          queryParams: { prompt: "select_account" },
        },
      },
    ]);
  });

  it("never comes back to another website", async () => {
    for (const next of ["https://evil.example", "//evil.example", undefined]) {
      await start(next === undefined ? {} : { next });
    }
    expect(fakeAuth.oauthStarts.map((call) => call.options?.redirectTo)).toEqual([
      "https://otto.example/auth/callback?next=%2Fdashboard",
      "https://otto.example/auth/callback?next=%2Fdashboard",
      "https://otto.example/auth/callback?next=%2Fdashboard",
    ]);
  });

  it("refuses non-JSON bodies, so another site can't start a sign-in with a form", async () => {
    expect((await start({ next: "/" }, "application/x-www-form-urlencoded")).status).toBe(415);
    expect(fakeAuth.oauthStarts).toHaveLength(0);
  });

  it("says sign-in isn't set up when Supabase isn't configured", async () => {
    fakeAuth.setConfigured(false);
    const res = await start({});
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: { code: "auth_unavailable" } });
  });

  it("answers 500 when Supabase refuses", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    fakeAuth.failNext("signInWithOAuth", new AuthRetryableFetchError("fetch failed", 0));
    const res = await start({});
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: { code: "server_error" } });
  });
});
