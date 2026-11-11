import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateMetadata } from "@/app/p/[slug]/page";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import type { ApiErrorBody } from "@/lib/api/types";
import {
  cookieJar,
  jsonRequest,
  resetDb,
  setPlan,
  signInAs as signInFree,
} from "@/lib/auth/test-helpers";
import { getPortfolio } from "@/lib/portfolio/records";
import { sampleResume } from "@/lib/portfolio/testing";
import { PORTFOLIO_LIMITS, type PortfolioSaveResponse } from "@/lib/portfolio/types";
import { PUT as putResume } from "../resumes/[id]/route";
import { GET, PATCH, POST } from "./route";
import { GET as checkSlug } from "./slug/route";
import { POST as countView } from "./views/route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

const dropped = vi.hoisted(() => ({ tags: [] as string[], paths: [] as string[] }));
vi.mock("next/cache", () => ({
  revalidateTag: (tag: string) => void dropped.tags.push(tag),
  revalidatePath: (path: string) => void dropped.paths.push(path),
  unstable_cache: <T>(load: () => Promise<T>) => load,
}));

const BROWSER = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Safari/605.1.15";

const create = (body: unknown) => POST(jsonRequest("/api/portfolio", body));

function patch(body: unknown, headers: Record<string, string> = {}) {
  return PATCH(
    new Request("http://localhost/api/portfolio", {
      method: "PATCH",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );
}

function view(slug: string, userAgent = BROWSER) {
  return countView(
    new Request("http://localhost/api/portfolio/views", {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": userAgent },
      body: JSON.stringify({ slug }),
    }),
  );
}

const slugCheck = (value: string) =>
  checkSlug(new Request(`http://localhost/api/portfolio/slug?value=${encodeURIComponent(value)}`));

async function errorOf(res: Response): Promise<ApiErrorBody["error"]> {
  return ((await res.json()) as ApiErrorBody).error;
}

async function metadataFor(slug: string) {
  return generateMetadata({ params: Promise.resolve({ slug }) });
}

const signInAs = async (email: string) => setPlan(await signInFree(email), "pro");

describe("/api/portfolio", () => {
  beforeEach(async () => {
    await resetDb();
    cookieJar.clear();
    dropped.tags.length = 0;
    dropped.paths.length = 0;
  });

  it("needs a signed-in account", async () => {
    expect((await GET()).status).toBe(401);
    expect((await create({ resume: sampleResume() })).status).toBe(401);
    expect((await patch({ published: true })).status).toBe(401);
    expect((await slugCheck("maya-chen")).status).toBe(401);
  });

  it("makes the portfolio in one call, prefilled and private, then finds it again", async () => {
    await signInAs("maya@example.com");
    const made = await create({ resume: sampleResume() });
    expect(made.status).toBe(201);
    const { portfolio } = (await made.json()) as PortfolioSaveResponse;
    expect(portfolio).toMatchObject({
      slug: "maya-chen",
      published: false,
      showEmail: false,
      showPhone: false,
      allowIndexing: false,
      sync: true,
    });
    const again = await create({ resume: sampleResume({ id: "resume-2" }) });
    expect(again.status).toBe(200);
    const loaded = (await (await GET()).json()) as { portfolio: { id: string; resumeId: string } };
    expect(loaded.portfolio).toMatchObject({ id: portfolio.id, resumeId: "resume-2" });
  });

  it("publishes and takes down, dropping the cached page each time", async () => {
    await signInAs("maya@example.com");
    await create({ resume: sampleResume() });
    dropped.tags.length = 0;
    const live = await patch({ published: true });
    expect(live.status).toBe(200);
    expect(dropped.tags).toContain("portfolio:maya-chen");
    expect(dropped.paths).toContain("/p/maya-chen");

    dropped.tags.length = 0;
    const down = await patch({ published: false });
    expect(((await down.json()) as PortfolioSaveResponse).portfolio.published).toBe(false);
    expect(dropped.tags).toContain("portfolio:maya-chen");
    expect(
      ((await (await patch({ published: true })).json()) as PortfolioSaveResponse).portfolio
        .published,
    ).toBe(true);
  });

  it("asks search engines to stay away until the owner says otherwise", async () => {
    await signInAs("maya@example.com");
    await create({ resume: sampleResume() });
    expect((await metadataFor("maya-chen")).robots).toMatchObject({ index: false });
    await patch({ published: true });
    const noindex = await metadataFor("maya-chen");
    expect(noindex.robots).toMatchObject({ index: false, follow: false });
    expect(noindex.title).toEqual({ absolute: "Maya Chen - Portfolio" });
    await patch({ allowIndexing: true });
    expect((await metadataFor("maya-chen")).robots).toMatchObject({ index: true });
    expect((await metadataFor("nobody-here")).robots).toMatchObject({ index: false });
  });

  it("changes the address, refusing reserved and taken ones", async () => {
    await signInAs("tom@example.com");
    await create({ resume: sampleResume({ basics: { ...sampleResume().basics, name: "Tom" } }) });
    await signInAs("maya@example.com");
    await create({ resume: sampleResume() });
    await patch({ published: true });

    expect(await errorOf(await patch({ slug: "dashboard" }))).toMatchObject({
      code: "bad_request",
    });
    expect((await errorOf(await patch({ slug: "tom" }))).message).toMatch(/already has/);
    dropped.tags.length = 0;
    const moved = await patch({ slug: "Maya Builds" });
    expect(((await moved.json()) as PortfolioSaveResponse).portfolio.slug).toBe("maya-builds");
    expect(dropped.tags).toEqual(
      expect.arrayContaining(["portfolio:maya-chen", "portfolio:maya-builds"]),
    );
  });

  it("checks an address while the owner types, within a limit", async () => {
    await signInAs("maya@example.com");
    const free = (await (await slugCheck("Maya Chen")).json()) as {
      slug: string;
      available: boolean;
    };
    expect(free).toMatchObject({ slug: "maya-chen", available: true });
    const reserved = (await (await slugCheck("api")).json()) as {
      available: boolean;
      message: string;
    };
    expect(reserved.available).toBe(false);
    for (let i = 2; i < PORTFOLIO_LIMITS.slugChecksPerMinute; i++) await slugCheck(`maya-${i}`);
    const limited = await slugCheck("maya-last");
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("keeps portfolios to Pro and Max, the trial included", async () => {
    await signInFree("free@example.com");
    const free = await create({ resume: sampleResume() });
    expect(free.status).toBe(402);
    expect(await errorOf(free)).toMatchObject({ code: "upgrade_required" });

    const trialEnd = Date.UTC(2099, 0, 15, 12);
    const maya = await setPlan(await signInFree("maya@example.com"), "trial", trialEnd);
    expect((await create({ resume: sampleResume() })).status).toBe(201);
    expect((await patch({ allowIndexing: true })).status).toBe(200);
    expect(
      ((await (await patch({ published: true })).json()) as PortfolioSaveResponse).portfolio
        .published,
    ).toBe(true);
    await (await getDb()).update(users).set({ plan: "free" }).where(eq(users.id, maya.id));
    expect((await patch({ published: false })).status).toBe(402);
    expect(
      ((await (await GET()).json()) as { portfolio: { published: boolean } }).portfolio.published,
    ).toBe(true);
    expect((await metadataFor("maya-chen")).robots).toMatchObject({ index: false });
  });

  it("rejects bad bodies, non-JSON and other websites", async () => {
    await signInAs("maya@example.com");
    await create({ resume: sampleResume() });
    expect((await patch({})).status).toBe(400);
    expect((await patch({ hiddenSections: ["secrets"] })).status).toBe(400);
    expect((await patch({ template: "neon" })).status).toBe(400);
    expect((await patch({ template: "minimal" })).status).toBe(400);
    expect((await patch({ projectImages: { p1: "https://cdn.example.com/a.png" } })).status).toBe(
      400,
    );
    const withPictures = await patch({
      template: "bento",
      projectImages: { p1: "https://cdn.example.com/a.png" },
    });
    expect(withPictures.status).toBe(200);
    expect(JSON.stringify(await withPictures.json())).not.toContain("cdn.example.com");
    expect((await patch({ published: true }, { "sec-fetch-site": "cross-site" })).status).toBe(403);
    expect(
      (await POST(jsonRequest("/api/portfolio", {}, { contentType: "text/plain" }))).status,
    ).toBe(415);
  });

  it("counts visits from people, not from bots or the signed-in owner", async () => {
    await signInAs("maya@example.com");
    await create({ resume: sampleResume() });
    await patch({ published: true });
    const own = (await (await view("maya-chen")).json()) as { counted: boolean };
    expect(own.counted).toBe(false);

    cookieJar.clear();
    expect(((await (await view("maya-chen")).json()) as { counted: boolean }).counted).toBe(true);
    expect(
      ((await (await view("maya-chen", "Googlebot/2.1")).json()) as { counted: boolean }).counted,
    ).toBe(false);
    expect(((await (await view("nobody-here")).json()) as { counted: boolean }).counted).toBe(
      false,
    );
    expect((await view("x".repeat(200))).status).toBe(400);

    const maya = await signInAs("maya@example.com");
    expect((await getPortfolio(maya.id))?.views).toBe(1);
  });

  it("follows the resume's cloud backups while in sync", async () => {
    const maya = await signInAs("maya@example.com");
    await create({ resume: sampleResume() });
    dropped.tags.length = 0;
    const edited = sampleResume({ summary: "Edited in the studio.", updatedAt: 9_000 });
    const res = await putResume(
      new Request(`http://localhost/api/resumes/${edited.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(edited),
      }),
      { params: Promise.resolve({ id: edited.id }) },
    );
    expect(res.status).toBe(200);
    expect((await getPortfolio(maya.id))?.snapshot.summary).toBe("Edited in the studio.");
    expect(dropped.tags).toContain("portfolio:maya-chen");
  });
});
