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

  it("serves /login's heading for where the visitor was going from that heading's static page", async () => {
    const rewrite = "x-middleware-rewrite";
    const jobs = await proxy(visit("/login?next=%2Fdashboard%2Fjobs"));
    expect(jobs.headers.get(rewrite)).toBe(
      "https://otto.test/en/login/jobs?next=%2Fdashboard%2Fjobs",
    );
    expect(jobs.headers.get("location")).toBeNull();
    const upgrade = await proxy(
      visit(`/login?next=${encodeURIComponent("/account?upgrade=1&plan=max")}`),
    );
    expect(upgrade.headers.get(rewrite)).toMatch(/^https:\/\/otto\.test\/en\/login\/upgrade\?/);
    for (const path of [
      "/login",
      "/login?next=%2Fdashboard",
      "/login?next=https%3A%2F%2Fevil.example%2Fdashboard%2Fjobs",
    ]) {
      expect((await proxy(visit(path))).headers.get(rewrite), path).toBe(
        `https://otto.test/en${path}`,
      );
    }
    expect((await proxy(visit("/pricing?next=%2Fdashboard%2Fjobs"))).headers.get(rewrite)).toBe(
      "https://otto.test/en/pricing?next=%2Fdashboard%2Fjobs",
    );
  });

  it("keeps a refreshed session on /login's heading page", async () => {
    supabase.refreshTo = "fresh";
    const res = await proxy(visit("/login?next=%2Fdashboard%2Fportfolio", `${COOKIE}=stale`));
    expect(res.headers.get("x-middleware-rewrite")).toBe(
      "https://otto.test/en/login/portfolio?next=%2Fdashboard%2Fportfolio",
    );
    expect(res.cookies.get(COOKIE)?.value).toBe("fresh");
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(res.headers.get("x-middleware-request-cookie")).toContain(`${COOKIE}=fresh`);
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
      "/en/pricing",
      "/es/pricing",
      "/guides/jobs-board.mp4",
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

  describe("languages", () => {
    const rewrite = (res: Response) => res.headers.get("x-middleware-rewrite");

    it("serves every unprefixed page from the English tree, at the same address", async () => {
      for (const [path, target] of [
        ["/", "/en"],
        ["/pricing?plan=pro", "/en/pricing?plan=pro"],
        ["/ats/workday", "/en/ats/workday"],
        ["/studio?step=fix", "/en/studio?step=fix"],
        ["/s/abc123def456", "/en/s/abc123def456"],
        ["/nope", "/en/nope"],
      ] as const) {
        const res = await proxy(visit(path));
        expect(rewrite(res), path).toBe(`https://otto.test${target}`);
        expect(res.headers.get("location"), path).toBeNull();
      }
    });

    it("moves /en and /en/* to the unprefixed address for good, before any session work", async () => {
      for (const [path, target] of [
        ["/en", "/"],
        ["/en/pricing?plan=pro", "/pricing?plan=pro"],
        ["/en/ats/workday", "/ats/workday"],
      ] as const) {
        const res = await proxy(visit(path, `${COOKIE}=token`));
        expect(res.status, path).toBe(308);
        expect(res.headers.get("location"), path).toBe(`https://otto.test${target}`);
        expect(res.cookies.get("otto_lang"), path).toBeUndefined();
      }
      expect(supabase.created).toBe(0);
    });

    it("keeps that redirect on this site whatever follows the prefix", async () => {
      const res = await proxy(visit("/en//evil.example/x"));
      expect(new URL(res.headers.get("location") ?? "").origin).toBe("https://otto.test");
    });

    it("sets the app's language from a prefixed app link, then drops the prefix", async () => {
      const res = await proxy(visit("/en/dashboard/jobs?resume=r1"));
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("https://otto.test/dashboard/jobs?resume=r1");
      expect(res.cookies.get("otto_lang")).toMatchObject({
        value: "en",
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 365 * 24 * 60 * 60,
      });
      expect(supabase.created).toBe(0);
    });

    it("still sends a signed-out visitor from the dashboard to sign in, whatever the language", async () => {
      for (const cookie of [undefined, "otto_lang=en", "otto_lang=es"]) {
        const res = await proxy(visit("/dashboard/jobs", cookie));
        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toBe(
          "https://otto.test/login?next=%2Fdashboard%2Fjobs",
        );
      }
    });

    it("serves the app in the cookie's language, and English for anything that isn't one", async () => {
      for (const [lang, segment] of [
        ["en", "en"],
        ["es", "es"],
        ["pt-BR", "pt-br"],
        ["de", "de"],
        ["pt-br", "en"],
        ["garbage", "en"],
      ] as const) {
        const res = await proxy(visit("/dashboard/jobs", `${COOKIE}=token; otto_lang=${lang}`));
        expect(rewrite(res), lang).toBe(`https://otto.test/${segment}/dashboard/jobs`);
      }
    });

    it("serves a language's public pages at their own address, without setting the app's language", async () => {
      for (const path of ["/es", "/es/pricing", "/pt-br/job-match", "/de/compare/rezi"]) {
        const res = await proxy(visit(path));
        expect(rewrite(res), path).toBeNull();
        expect(res.headers.get("location"), path).toBeNull();
        expect(res.cookies.get("otto_lang"), path).toBeUndefined();
      }
    });

    it("sets the app's language only from a prefixed app link, and sends an unknown prefix to the English 404", async () => {
      const res = await proxy(visit("/fr/studio"));
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("https://otto.test/studio");
      expect(res.cookies.get("otto_lang")?.value).toBe("fr");
      for (const path of ["/xx/pricing", "/pt-pt", "/ES/pricing"]) {
        const unknown = await proxy(visit(path));
        expect(rewrite(unknown), path).toBe(`https://otto.test/en${path}`);
        expect(unknown.cookies.get("otto_lang"), path).toBeUndefined();
      }
    });

    it("leaves routes outside [lang] and public files where they are", async () => {
      for (const path of [
        "/auth/callback?code=x",
        "/guides/jobs-board.mp4",
        "/portfolio-templates/reel/draco/LICENSE",
      ]) {
        const res = await proxy(visit(path));
        expect(rewrite(res), path).toBeNull();
        expect(res.headers.get("location"), path).toBeNull();
      }
    });
  });
});
