import type { createServerClient } from "@supabase/ssr";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetEnvForTests } from "@/lib/env";
import { config, proxy } from "./proxy";

type ServerClientOptions = Parameters<typeof createServerClient>[2];

// Stands in for Supabase: getClaims() either verifies the token as it is, or refreshes it first
// and writes the new cookies through setAll, as the real client does near expiry.
const supabase = vi.hoisted(() => ({
  created: 0,
  claims: null as { sub: string } | null,
  refreshTo: null as string | null,
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, options: ServerClientOptions) => {
    supabase.created += 1;
    return {
      auth: {
        async getClaims() {
          if (supabase.refreshTo && "getAll" in options.cookies) {
            await options.cookies.setAll?.(
              [{ name: COOKIE, value: supabase.refreshTo, options: { path: "/", httpOnly: true, maxAge: 3600 } }],
              { "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0", Expires: "0" },
            );
          }
          return supabase.claims
            ? { data: { claims: supabase.claims }, error: null }
            : { data: null, error: new Error("invalid JWT") };
        },
      },
    };
  },
}));

const COOKIE = "sb-abcdefgh-auth-token";

function visit(path: string, cookie?: string) {
  return new NextRequest(`https://otto.test${path}`, { headers: cookie ? { cookie } : {} });
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abcdefgh.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  resetEnvForTests();
  supabase.created = 0;
  supabase.claims = { sub: "6f1c1b7e-8a3c-4c39-9a51-8f4c6b0f2d11" };
  supabase.refreshTo = null;
});

afterEach(() => {
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("proxy", () => {
  it("sends a signed-in visitor from the home page to the dashboard", async () => {
    const res = await proxy(visit("/", `${COOKIE}=token`));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://otto.test/dashboard");
  });

  it("lets everyone else see the home page", async () => {
    for (const cookie of [undefined, "otto_did=device"]) {
      const res = await proxy(visit("/", cookie));
      expect(res.headers.get("location")).toBeNull();
    }
    // Signed-out visitors never cost a Supabase client.
    expect(supabase.created).toBe(0);
    supabase.claims = null;
    expect((await proxy(visit("/", `${COOKIE}=expired`))).headers.get("location")).toBeNull();
  });

  it("does nothing while Supabase isn't configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    resetEnvForTests();
    const res = await proxy(visit("/", `${COOKIE}=token`));
    expect(res.headers.get("location")).toBeNull();
    expect(supabase.created).toBe(0);
  });

  it("passes a refreshed session to this request and to the browser, never to a shared cache", async () => {
    supabase.refreshTo = "fresh";
    const res = await proxy(visit("/studio", `${COOKIE}=stale`));
    expect(res.headers.get("location")).toBeNull();
    expect(res.cookies.get(COOKIE)).toMatchObject({ value: "fresh", httpOnly: true });
    expect(res.headers.get("cache-control")).toContain("no-store");
    // What the page and route handlers of this same request will read.
    expect(res.headers.get("x-middleware-request-cookie")).toContain(`${COOKIE}=fresh`);
  });

  it("keeps a refreshed session on the redirect to the dashboard", async () => {
    supabase.refreshTo = "fresh";
    const res = await proxy(visit("/", `${COOKIE}=stale`));
    expect(res.headers.get("location")).toBe("https://otto.test/dashboard");
    expect(res.cookies.get(COOKIE)?.value).toBe("fresh");
    expect(res.headers.get("cache-control")).toContain("no-store");
  });

  it("runs on pages and APIs, but not on assets, the billing webhook or the scheduled jobs", () => {
    const runsOn = (url: string) => unstable_doesMiddlewareMatch({ config, url });
    for (const url of [
      "/",
      "/dashboard",
      "/studio?step=fix",
      "/api/me",
      "/api/resumes/abc",
      "/auth/callback",
      "/api/notifications",
      "/s/abc123def456",
    ]) {
      expect(runsOn(url), url).toBe(true);
    }
    for (const url of [
      "/_next/static/chunks/app.js",
      "/_next/image?url=%2Fformats%2Fclassic.png&w=640&q=75",
      "/api/billing/webhook",
      "/api/cron/cleanup",
      "/api/cron/follow-ups",
      "/formats/classic@2x.png",
      "/icon.svg",
      "/apple-icon",
      "/opengraph-image",
      "/robots.txt",
      "/sitemap.xml",
      "/favicon.ico",
    ]) {
      expect(runsOn(url), url).toBe(false);
    }
  });
});
