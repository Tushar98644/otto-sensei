import { AuthRetryableFetchError } from "@supabase/supabase-js";
import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { portfolios, rateLimits, users } from "@/db/schema";
import type { ApiErrorBody } from "@/lib/api/types";
import {
  cookieJar,
  fakeAuth,
  jsonRequest,
  linkGitHub,
  resetDb,
  setPlan,
  signInAs,
} from "@/lib/auth/test-helpers";
import { clearGitHubCache } from "@/lib/github/cache";
import { installFakeGitHub, json, rawRepo, type FakeGitHub } from "@/lib/github/testing";
import type { ContentResponse, GitHubRefreshResponse } from "@/lib/portfolio/content";
import {
  checkSlug as checkSlugRecord,
  findPublicPortfolio,
  findViewTarget,
  getPortfolio,
} from "@/lib/portfolio/records";
import { SLUG_MESSAGES } from "@/lib/portfolio/slug";
import { sampleResume } from "@/lib/portfolio/testing";
import { PORTFOLIO_LIMITS, type PortfolioSaveResponse } from "@/lib/portfolio/types";
import { HOUR_MS } from "@/lib/time";
import { PAGE_BLOCKED } from "../public-pages";
import { GET as getContent, PUT as putContent } from "./content/route";
import { POST as refreshGitHub } from "./github/route";
import { NEEDS_PLAN, NO_PORTFOLIO, SIGN_IN } from "./limits";
import { DELETE, GET, PATCH, POST } from "./route";
import { GET as slugRoute } from "./slug/route";
import { POST as viewRoute } from "./views/route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

const purged = vi.hoisted(() => [] as string[]);
vi.mock("next/cache", () => ({
  revalidateTag: (tag: string) => void purged.push(tag),
  unstable_cache: <T>(load: () => Promise<T>) => load,
}));

const later = vi.hoisted(() => [] as (() => unknown)[]);
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (task: () => unknown) => void later.push(task),
}));

vi.mock("@/lib/portfolio/records", async (importOriginal) => {
  const records = await importOriginal<typeof import("@/lib/portfolio/records")>();
  return {
    ...records,
    getPortfolio: vi.fn(records.getPortfolio),
    checkSlug: vi.fn(records.checkSlug),
    findViewTarget: vi.fn(records.findViewTarget),
  };
});

type Verdict = { allowed: boolean; categories: string[] };
// Null lets the real check run, which allows everything without a safety-model key.
const safety = vi.hoisted(() => ({
  verdict: null as null | (() => Promise<Verdict>),
  calls: 0,
}));
vi.mock("@/lib/ai/moderation", async (importOriginal) => {
  const moderation = await importOriginal<typeof import("@/lib/ai/moderation")>();
  return {
    ...moderation,
    checkContent: (...args: Parameters<typeof moderation.checkContent>) => {
      safety.calls += 1;
      return safety.verdict ? safety.verdict() : moderation.checkContent(...args);
    },
  };
});

const NOW = Date.UTC(2026, 10, 21, 12, 30, 15);
const HOUR_START = Math.floor(NOW / HOUR_MS) * HOUR_MS;
const RETRY_AFTER = String((HOUR_START + HOUR_MS - NOW) / 1000);
const CHANGED = "Your page changed while it was saving. Try again.";
const BROWSER = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Safari/605.1.15";

let github: FakeGitHub;
let stars = 42;

function mayaOnGitHub(url: URL) {
  if (url.pathname === "/users/mayachen")
    return json({ login: "mayachen", followers: 5, public_repos: 1 });
  if (url.pathname === "/users/mayachen/repos")
    return json([rawRepo("mayachen/otto-resume", { stargazers_count: stars })]);
  if (url.pathname === "/users/mayachen/events/public") return json([]);
  return undefined;
}

type Handler = (req: Request) => Promise<Response>;

function send(
  handler: Handler,
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<Response> {
  return handler(
    new Request(`http://localhost${path}`, {
      method,
      headers: { "content-type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

const create = (body: unknown) => POST(jsonRequest("/api/portfolio", body));
const patch = (body: unknown, headers?: Record<string, string>) =>
  send(PATCH, "PATCH", "/api/portfolio", body, headers);
const remove = (headers?: Record<string, string>) =>
  send(DELETE, "DELETE", "/api/portfolio", undefined, headers);
const saveContent = (content: unknown, headers?: Record<string, string>) =>
  send(putContent, "PUT", "/api/portfolio/content", { content }, headers);
const refresh = (headers?: Record<string, string>) =>
  send(refreshGitHub, "POST", "/api/portfolio/github", undefined, headers);
const slugCheck = (value: string) =>
  slugRoute(new Request(`http://localhost/api/portfolio/slug?value=${encodeURIComponent(value)}`));
const view = (slug: string, headers: Record<string, string> = {}) =>
  send(viewRoute, "POST", "/api/portfolio/views", { slug }, { "user-agent": BROWSER, ...headers });

async function errorOf(res: Response): Promise<ApiErrorBody["error"]> {
  return ((await res.json()) as ApiErrorBody).error;
}

async function counted(res: Response): Promise<boolean> {
  expect(res.status).toBe(200);
  return ((await res.json()) as { counted: boolean }).counted;
}

async function proWithPortfolio(email = "maya@example.com") {
  const user = await setPlan(await signInAs(email), "pro");
  expect((await create({ resume: sampleResume() })).status).toBe(201);
  return user;
}

async function livePortfolio(email = "maya@example.com") {
  const user = await proWithPortfolio(email);
  expect((await patch({ published: true })).status).toBe(200);
  return user;
}

function supabaseDown(): void {
  fakeAuth.failNext("getUser", new AuthRetryableFetchError("fetch failed", 503));
}

async function storedRow(userId: string) {
  const [row] = await (
    await getDb()
  )
    .select()
    .from(portfolios)
    .where(eq(portfolios.userId, userId));
  return row;
}

async function fillLimit(key: string, count: number): Promise<void> {
  await (
    await getDb()
  )
    .insert(rateLimits)
    .values({ key, windowStart: HOUR_START, count })
    .onConflictDoUpdate({ target: [rateLimits.key, rateLimits.windowStart], set: { count } });
}

// Stands in for the account being deleted after sign-in was checked but before the write.
function deletesAccountWhenRead(
  handler: Handler,
  method: string,
  path: string,
  body: unknown,
  userId: string,
): Promise<Response> {
  const bytes = new TextEncoder().encode(JSON.stringify(body));
  const stream = new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        await (await getDb()).delete(users).where(eq(users.id, userId));
        controller.enqueue(bytes);
        controller.close();
      },
    },
    { highWaterMark: 0 },
  );
  const init = {
    method,
    headers: { "content-type": "application/json" },
    body: stream,
    duplex: "half",
  };
  return handler(new Request(`http://localhost${path}`, init as RequestInit));
}

function errorEvents(): unknown[] {
  return vi.mocked(console.error).mock.calls.map((call) => call[0]);
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  await resetDb();
  cookieJar.clear();
  clearGitHubCache();
  purged.length = 0;
  later.length = 0;
  stars = 42;
  safety.verdict = null;
  safety.calls = 0;
  vi.mocked(getPortfolio).mockReset();
  vi.mocked(checkSlugRecord).mockReset();
  vi.mocked(findViewTarget).mockReset();
  github = installFakeGitHub(mayaOnGitHub);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  github.restore();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("/api/portfolio when something fails", () => {
  it("answers a sign-in outage with a 500 on every method and leaves the page as it was", async () => {
    const maya = await proWithPortfolio();
    const before = await storedRow(maya.id);
    purged.length = 0;

    supabaseDown();
    const load = await GET();
    expect(load.status).toBe(500);
    expect(load.headers.get("cache-control")).toBe("no-store");
    expect(await errorOf(load)).toEqual({
      code: "server_error",
      message: "Couldn't load your portfolio. Please try again.",
    });
    supabaseDown();
    const made = await create({ resume: sampleResume({ id: "resume-2" }) });
    expect(made.status).toBe(500);
    expect((await errorOf(made)).message).toBe("Couldn't make your portfolio. Please try again.");
    supabaseDown();
    const changed = await patch({ published: true });
    expect(changed.status).toBe(500);
    expect((await errorOf(changed)).message).toBe("Couldn't save that change. Please try again.");
    supabaseDown();
    const deleted = await remove();
    expect(deleted.status).toBe(500);
    expect((await errorOf(deleted)).message).toBe(
      "Couldn't delete your portfolio. Please try again.",
    );

    expect(await storedRow(maya.id)).toEqual(before);
    expect(purged).toEqual([]);
    expect(errorEvents()).toEqual([
      "[error] portfolio.load_failed",
      "[error] portfolio.create_failed",
      "[error] portfolio.update_failed",
      "[error] portfolio.delete_failed",
    ]);
    expect((await GET()).status).toBe(200);
  });

  it("keeps what broke in the database out of the answer", async () => {
    await proWithPortfolio();
    vi.mocked(getPortfolio).mockRejectedValueOnce(
      new Error("connection reset reading /srv/otto/pg.sock"),
    );
    const res = await GET();
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).toContain("Couldn't load your portfolio.");
    expect(text).not.toMatch(/connection reset|pg\.sock/);
  });

  it("answers a sign-in outage on content and GitHub without saving or calling GitHub", async () => {
    const maya = await proWithPortfolio();
    linkGitHub(maya, "mayachen");

    supabaseDown();
    const load = await getContent();
    expect(load.status).toBe(500);
    expect(load.headers.get("cache-control")).toBe("no-store");
    expect((await errorOf(load)).message).toBe(
      "Couldn't load your page's content. Please try again.",
    );
    supabaseDown();
    const saved = await saveContent({ pitch: "Lost" });
    expect(saved.status).toBe(500);
    expect((await errorOf(saved)).message).toBe("Couldn't save that change. Please try again.");
    supabaseDown();
    const refreshed = await refresh();
    expect(refreshed.status).toBe(502);
    expect(await errorOf(refreshed)).toEqual({
      code: "server_error",
      message: "Couldn't reach GitHub. Please try again in a minute.",
    });

    expect((await getPortfolio(maya.id))?.content.pitch).toBeNull();
    expect(github.calls).toHaveLength(0);
  });
});

describe("/api/portfolio for the wrong caller", () => {
  it("never shows, changes or deletes another account's page", async () => {
    const maya = await livePortfolio();
    linkGitHub(maya, "mayachen");
    await setPlan(await signInAs("tom@example.com"), "pro");
    purged.length = 0;

    expect(((await (await GET()).json()) as { portfolio: unknown }).portfolio).toBeNull();
    for (const res of [
      await patch({ published: false }),
      await remove(),
      await getContent(),
      await saveContent({ pitch: "Tom was here" }),
      await refresh(),
    ]) {
      expect(res.status).toBe(404);
      expect(await errorOf(res)).toEqual({ code: "not_found", message: NO_PORTFOLIO });
    }

    const page = await getPortfolio(maya.id);
    expect(page).toMatchObject({ published: true, slug: "maya-chen" });
    expect(page?.content.pitch).toBeNull();
    expect(github.calls).toHaveLength(0);
    expect(purged).toEqual([]);
  });

  it("needs a sign-in to delete the page or refresh its GitHub numbers", async () => {
    const maya = await proWithPortfolio();
    cookieJar.clear();
    for (const res of [await remove(), await refresh()]) {
      expect(res.status).toBe(401);
      expect(await errorOf(res)).toEqual({ code: "unauthorized", message: SIGN_IN });
    }
    expect(await storedRow(maya.id)).toBeDefined();
  });

  it("refuses other websites and non-JSON bodies, changing nothing", async () => {
    const maya = await livePortfolio();
    linkGitHub(maya, "mayachen");
    const before = await storedRow(maya.id);
    const crossSite = { "sec-fetch-site": "cross-site" };

    for (const res of [
      await remove(crossSite),
      await remove({ origin: "https://evil.example" }),
      await refresh(crossSite),
      await saveContent({ pitch: "From elsewhere" }, crossSite),
      await view("maya-chen", crossSite),
    ]) {
      expect(res.status).toBe(403);
      expect((await errorOf(res)).code).toBe("forbidden");
    }
    for (const res of [
      await patch({ published: false }, { "content-type": "text/plain" }),
      await saveContent({ pitch: "Plain" }, { "content-type": "text/plain" }),
      await view("maya-chen", { "content-type": "text/plain" }),
    ]) {
      expect(res.status).toBe(415);
      expect((await errorOf(res)).code).toBe("unsupported_type");
    }

    expect(await storedRow(maya.id)).toEqual(before);
    expect(github.calls).toHaveLength(0);
  });

  it("answers 401 when the account is deleted while a write is under way, writing nothing", async () => {
    const ada = await setPlan(await signInAs("ada@example.com"), "pro");
    const made = await deletesAccountWhenRead(
      POST,
      "POST",
      "/api/portfolio",
      { resume: sampleResume() },
      ada.id,
    );
    expect(made.status).toBe(401);
    expect(await errorOf(made)).toEqual({ code: "unauthorized", message: SIGN_IN });
    expect(await (await getDb()).select().from(portfolios)).toEqual([]);

    const maya = await proWithPortfolio();
    const changed = await deletesAccountWhenRead(
      PATCH,
      "PATCH",
      "/api/portfolio",
      { published: true },
      maya.id,
    );
    expect(changed.status).toBe(401);

    const grace = await proWithPortfolio("grace@example.com");
    const content = await deletesAccountWhenRead(
      putContent,
      "PUT",
      "/api/portfolio/content",
      { content: { pitch: "Gone" } },
      grace.id,
    );
    expect(content.status).toBe(401);
    expect((await errorOf(content)).message).toBe(SIGN_IN);
    expect(await (await getDb()).select().from(portfolios)).toEqual([]);
  });
});

describe("making a portfolio", () => {
  it("takes a chosen address and look, and refuses reserved, taken or broken ones", async () => {
    await setPlan(await signInAs("tom@example.com"), "pro");
    const tom = await create({ resume: sampleResume(), slug: "Tom Builds", template: "bento" });
    expect(tom.status).toBe(201);
    expect(((await tom.json()) as PortfolioSaveResponse).portfolio).toMatchObject({
      slug: "tom-builds",
      template: "bento",
      published: false,
    });

    const maya = await setPlan(await signInAs("maya@example.com"), "pro");
    const reserved = await create({ resume: sampleResume(), slug: "dashboard" });
    expect(reserved.status).toBe(400);
    expect(await errorOf(reserved)).toEqual({
      code: "bad_request",
      message: SLUG_MESSAGES.reserved,
    });
    const taken = await create({ resume: sampleResume(), slug: "tom-builds" });
    expect(taken.status).toBe(400);
    expect((await errorOf(taken)).message).toBe(SLUG_MESSAGES.taken);
    const broken = await create({ resume: "not a resume" });
    expect(broken.status).toBe(400);
    expect((await errorOf(broken)).message).toBe(
      "That resume couldn't be made into a portfolio. Reload the page and try again.",
    );
    expect(await getPortfolio(maya.id)).toBeNull();
  });

  it(`stops at ${PORTFOLIO_LIMITS.writesPerHour} changes an hour, and takes them again the next hour`, async () => {
    const maya = await proWithPortfolio();
    await fillLimit(`portfolio:write:user:${maya.id}`, PORTFOLIO_LIMITS.writesPerHour);

    const published = await patch({ published: true });
    expect(published.status).toBe(429);
    expect(published.headers.get("retry-after")).toBe(RETRY_AFTER);
    expect(await errorOf(published)).toEqual({
      code: "rate_limited",
      message: "That's a lot of portfolio changes in one hour. Try again in 30 minutes.",
    });
    const remade = await create({ resume: sampleResume({ id: "resume-2" }) });
    expect(remade.status).toBe(429);
    expect(await getPortfolio(maya.id)).toMatchObject({ published: false, resumeId: "resume-1" });

    vi.setSystemTime(HOUR_START + HOUR_MS);
    expect((await patch({ published: true })).status).toBe(200);
    expect((await getPortfolio(maya.id))?.published).toBe(true);
  });

  it("checks a live page re-made from a resume, keeping the live copy when the check fails", async () => {
    const maya = await proWithPortfolio();
    safety.verdict = async () => ({ allowed: false, categories: ["S12"] });
    const draft = await create({ resume: sampleResume({ id: "resume-2" }) });
    expect(draft.status).toBe(200);
    expect(safety.calls).toBe(0);

    safety.verdict = null;
    expect((await patch({ published: true })).status).toBe(200);
    safety.verdict = async () => ({ allowed: false, categories: ["S12"] });
    purged.length = 0;
    const res = await create({ resume: sampleResume({ id: "resume-3", summary: "Other words." }) });
    expect(res.status).toBe(422);
    expect(await errorOf(res)).toEqual({ code: "content_blocked", message: PAGE_BLOCKED });
    expect(await getPortfolio(maya.id)).toMatchObject({ resumeId: "resume-2", published: true });
    expect((await getPortfolio(maya.id))?.snapshot.summary).toBe(sampleResume().summary);
    expect(purged).toEqual([]);
  });

  it("gives up re-syncing a live page from a resume with a 409 when it keeps changing while it's checked", async () => {
    const maya = await livePortfolio();
    safety.calls = 0;
    const db = await getDb();
    // Another tab saves while each check runs, so every try finds the page moved on.
    safety.verdict = async () => {
      await db
        .update(portfolios)
        .set({ updatedAt: sql`${portfolios.updatedAt} + 1` })
        .where(eq(portfolios.userId, maya.id));
      return { allowed: true, categories: [] };
    };

    const resynced = await patch({ resume: sampleResume({ summary: "Never saved." }) });
    expect(resynced.status).toBe(409);
    expect(await errorOf(resynced)).toEqual({ code: "bad_request", message: CHANGED });
    expect(safety.calls).toBe(3);
    expect((await getPortfolio(maya.id))?.snapshot.summary).toBe(sampleResume().summary);
  });

  it("keeps Free off the content editor even with a page left from Pro", async () => {
    const maya = await proWithPortfolio();
    await (await getDb()).update(users).set({ plan: "free" }).where(eq(users.id, maya.id));
    const res = await saveContent({ pitch: "On Free" });
    expect(res.status).toBe(402);
    expect(await errorOf(res)).toEqual({ code: "upgrade_required", message: NEEDS_PLAN });
    expect((await getPortfolio(maya.id))?.content.pitch).toBeNull();
    expect((await getContent()).status).toBe(200);
  });
});

describe("saving a page's content", () => {
  it("keeps the last copy of a live page when the safety check blocks an edit", async () => {
    const maya = await livePortfolio();
    expect((await saveContent({ pitch: "Kept" })).status).toBe(200);
    safety.verdict = async () => ({ allowed: false, categories: ["S12"] });
    purged.length = 0;
    const res = await saveContent({ pitch: "Blocked words" });
    expect(res.status).toBe(422);
    expect(await errorOf(res)).toEqual({ code: "content_blocked", message: PAGE_BLOCKED });
    expect((await getPortfolio(maya.id))?.content.pitch).toBe("Kept");
    expect(purged).toEqual([]);
  });

  it("stops at 900 saves an hour, keeping the last saved copy", async () => {
    const maya = await proWithPortfolio();
    expect((await saveContent({ pitch: "Kept" })).status).toBe(200);
    await fillLimit(`portfolio:content:user:${maya.id}`, 900);

    const res = await saveContent({ pitch: "One too many" });
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe(RETRY_AFTER);
    expect(await errorOf(res)).toEqual({
      code: "rate_limited",
      message:
        "That's a lot of changes in one hour. Your last ones are kept; try again in 30 minutes.",
    });
    expect((await getPortfolio(maya.id))?.content.pitch).toBe("Kept");
  });
});

describe("refreshing a portfolio's GitHub numbers", () => {
  it("fetches new numbers on request and redraws the live page", async () => {
    const maya = await livePortfolio();
    linkGitHub(maya, "mayachen");
    expect(((await (await getContent()).json()) as ContentResponse).github?.totalStars).toBe(42);
    stars = 50;
    clearGitHubCache();
    purged.length = 0;

    const res = await refresh();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(((await res.json()) as GitHubRefreshResponse).github?.totalStars).toBe(50);
    expect(purged).toEqual(["portfolio:maya-chen"]);
    const page = await findPublicPortfolio("maya-chen");
    expect(page.status === "ok" && page.portfolio.content.github?.totalStars).toBe(50);
  });

  it("keeps the last numbers while GitHub is down", async () => {
    const maya = await livePortfolio();
    linkGitHub(maya, "mayachen");
    await getContent();
    github.restore();
    github = installFakeGitHub(() => json({ message: "Service unavailable" }, { status: 503 }));
    clearGitHubCache();
    purged.length = 0;

    const res = await refresh();
    expect(res.status).toBe(200);
    expect(((await res.json()) as GitHubRefreshResponse).github).toMatchObject({
      username: "mayachen",
      totalStars: 42,
    });
    expect(github.calls.length).toBeGreaterThan(0);
    expect(purged).toEqual([]);
  });

  it("refreshes 6 times an hour, then asks the owner to wait without calling GitHub", async () => {
    const maya = await proWithPortfolio();
    linkGitHub(maya, "mayachen");
    for (let i = 0; i < 6; i++) {
      clearGitHubCache();
      expect((await refresh()).status).toBe(200);
    }
    const calls = github.calls.length;
    clearGitHubCache();
    const res = await refresh();
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe(RETRY_AFTER);
    expect(await errorOf(res)).toEqual({
      code: "rate_limited",
      message: "Your GitHub numbers were just updated. Try again in 30 minutes.",
    });
    expect(github.calls).toHaveLength(calls);
  });
});

describe("checking an address", () => {
  it("counts the owner's own address as free and someone else's as taken", async () => {
    await proWithPortfolio();
    const own = (await (await slugCheck("maya-chen")).json()) as { available: boolean };
    expect(own.available).toBe(true);

    await setPlan(await signInAs("tom@example.com"), "pro");
    const res = await slugCheck("Maya Chen");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({
      ok: true,
      slug: "maya-chen",
      available: false,
      message: SLUG_MESSAGES.taken,
    });
  });

  it("reads a missing value as an empty address", async () => {
    await signInAs("maya@example.com");
    const res = await slugRoute(new Request("http://localhost/api/portfolio/slug"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      slug: "",
      available: false,
      message: SLUG_MESSAGES.too_short,
    });
  });

  it("refuses more than 80 characters before looking anything up", async () => {
    await signInAs("maya@example.com");
    const res = await slugCheck("a".repeat(81));
    expect(res.status).toBe(400);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await errorOf(res)).toEqual({
      code: "bad_request",
      message: "Keep it to 40 characters or fewer.",
    });
    expect(checkSlugRecord).not.toHaveBeenCalled();
    expect((await slugCheck("a".repeat(80))).status).toBe(200);
  });

  it("answers 500 when the lookup fails", async () => {
    await signInAs("maya@example.com");
    vi.mocked(checkSlugRecord).mockRejectedValueOnce(new Error("statement timeout"));
    const res = await slugCheck("maya-chen");
    expect(res.status).toBe(500);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await errorOf(res)).toEqual({
      code: "server_error",
      message: "Couldn't check that address. Please try again.",
    });
  });
});

describe("counting a portfolio's visits", () => {
  it("counts a signed-in visitor who isn't the owner", async () => {
    const maya = await livePortfolio();
    await signInAs("tom@example.com");
    expect(await counted(await view("maya-chen"))).toBe(true);
    expect((await getPortfolio(maya.id))?.views).toBe(1);
  });

  it("still counts a visit when the visitor's sign-in can't be checked", async () => {
    const maya = await livePortfolio();
    supabaseDown();
    expect(await counted(await view("maya-chen"))).toBe(true);
    expect((await getPortfolio(maya.id))?.views).toBe(1);
  });

  it("leaves private pages uncounted", async () => {
    const maya = await proWithPortfolio();
    cookieJar.clear();
    expect(await counted(await view("maya-chen"))).toBe(false);
    expect((await getPortfolio(maya.id))?.views).toBe(0);
  });

  it(`stops counting a page at ${PORTFOLIO_LIMITS.viewsPerHour} visits an hour`, async () => {
    const maya = await livePortfolio();
    const page = await getPortfolio(maya.id);
    await fillLimit(`portfolio:views:${page!.id}`, PORTFOLIO_LIMITS.viewsPerHour);
    cookieJar.clear();
    expect(await counted(await view("maya-chen"))).toBe(false);
    expect((await getPortfolio(maya.id))?.views).toBe(0);
  });

  it("answers a visitor with 200 even when the count fails", async () => {
    const maya = await livePortfolio();
    cookieJar.clear();
    vi.mocked(findViewTarget).mockRejectedValueOnce(new Error("too many connections"));
    const res = await view("maya-chen");
    expect(await res.json()).toEqual({ ok: true, counted: false });
    expect((await getPortfolio(maya.id))?.views).toBe(0);
    expect(vi.mocked(console.warn).mock.calls.map((call) => call[0])).toContain(
      "[warn] portfolio.view_not_counted",
    );
  });
});
