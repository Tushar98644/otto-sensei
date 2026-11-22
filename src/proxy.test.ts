import type { createServerClient } from "@supabase/ssr";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetEnvForTests } from "@/lib/env";
import { REQUEST_PATH_HEADER } from "@/lib/request-path";
import { config, proxy } from "./proxy";

type ServerClientOptions = Parameters<typeof createServerClient>[2];

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
              [
                {
                  name: COOKIE,
                  value: supabase.refreshTo,
                  options: { path: "/", httpOnly: true, maxAge: 3600 },
                },
              ],
              {
                "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
                Expires: "0",
              },
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
    expect(res.headers.get("x-middleware-request-cookie")).toContain(`${COOKIE}=fresh`);
  });

  it("keeps a refreshed session on the redirect to the dashboard", async () => {
    supabase.refreshTo = "fresh";
    const res = await proxy(visit("/", `${COOKIE}=stale`));
    expect(res.headers.get("location")).toBe("https://otto.test/dashboard");
    expect(res.cookies.get(COOKIE)?.value).toBe("fresh");
    expect(res.headers.get("cache-control")).toContain("no-store");
  });

  it("tells the dashboard layout which page was asked for, whatever the browser sent", async () => {
    const asked = (cookie?: string) => {
      const req = visit("/dashboard/jobs?resume=r1", cookie);
      req.headers.set(REQUEST_PATH_HEADER, "/somewhere-else");
      return proxy(req);
    };
    const header = `x-middleware-request-${REQUEST_PATH_HEADER}`;
    expect((await asked(`${COOKIE}=token`)).headers.get(header)).toBe("/dashboard/jobs?resume=r1");
    supabase.claims = null;
    expect((await asked(`${COOKIE}=expired`)).headers.get(header)).toBe(
      "/dashboard/jobs?resume=r1",
    );
    supabase.refreshTo = "fresh";
    supabase.claims = { sub: "6f1c1b7e-8a3c-4c39-9a51-8f4c6b0f2d11" };
    const refreshed = await asked(`${COOKIE}=stale`);
    expect(refreshed.headers.get(header)).toBe("/dashboard/jobs?resume=r1");
    expect(refreshed.cookies.get(COOKIE)?.value).toBe("fresh");
  });

  it("sends a visitor with no session cookie from the dashboard straight to sign-in", async () => {
    for (const cookie of [undefined, "otto_did=device", `${COOKIE}-code-verifier=v`]) {
      const res = await proxy(visit("/dashboard/jobs?resume=r1", cookie));
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(
        "https://otto.test/login?next=%2Fdashboard%2Fjobs%3Fresume%3Dr1",
      );
    }
    expect(supabase.created).toBe(0);
    const outside = await proxy(visit("/dashboardish"));
    expect(outside.headers.get("location")).toBeNull();
  });

  it("tells the layout the same with dev sign-in", async () => {
    vi.stubEnv("NODE_ENV", "development");
    resetEnvForTests();
    const res = await proxy(visit("/dashboard/portfolio", "otto_dev_session=token"));
    expect(res.headers.get(`x-middleware-request-${REQUEST_PATH_HEADER}`)).toBe(
      "/dashboard/portfolio",
    );
    expect(supabase.created).toBe(0);
  });

  it("runs on pages, but not on assets, API routes or public portfolios, which never need it", () => {
    const runsOn = (url: string) => unstable_doesMiddlewareMatch({ config, url });
    for (const url of [
      "/",
      "/dashboard",
      "/dashboard/jobs",
      "/dashboard/portfolio",
      "/studio?step=fix",
      "/auth/callback",
      "/s/abc123def456",
      "/apiary",
      "/pricing",
      "/privacy",
    ]) {
      expect(runsOn(url), url).toBe(true);
    }
    for (const url of [
      "/api/me",
      "/api/resumes/abc",
      "/api/notifications",
      "/_next/static/chunks/app.js",
      "/_next/image?url=%2Fformats%2Fclassic.png&w=640&q=75",
      "/api/billing/webhook",
      "/api/cron/cleanup",
      "/api/cron/follow-ups",
      "/formats/classic@2x.png",
      "/fonts/pdf/carlito/Carlito-Regular.ttf",
      "/fonts/pdf/tex-gyre-pagella/texgyrepagella-regular.otf",
      "/icon.svg",
      "/apple-icon",
      "/opengraph-image",
      "/robots.txt",
      "/sitemap.xml",
      "/favicon.ico",
      "/p/maya-chen",
      "/p/maya-chen?_rsc=1x2y3",
      "/p/maya-chen/opengraph-image",
      "/p/maya-chen/opengraph-image-abc123",
    ]) {
      expect(runsOn(url), url).toBe(false);
    }
  });
});
