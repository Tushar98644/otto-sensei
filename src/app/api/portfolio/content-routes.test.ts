import { existsSync } from "node:fs";
import { join } from "node:path";
import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { portfolios } from "@/db/schema";
import type { ApiErrorBody } from "@/lib/api/types";
import { cookieJar, jsonRequest, resetDb, setPlan, signInAs } from "@/lib/auth/test-helpers";
import { clearGitHubCache } from "@/lib/github/cache";
import { installFakeGitHub, json, rawRepo, type FakeGitHub } from "@/lib/github/testing";
import { emptyContent, type ContentResponse } from "@/lib/portfolio/content";
import { findPublicPortfolio, getPortfolio } from "@/lib/portfolio/records";
import { sampleResume } from "@/lib/portfolio/testing";
import { GET as getContent, PUT as putContent } from "./content/route";
import { DELETE as deletePortfolio, PATCH, POST } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);
vi.mock("next/cache", () => ({
  revalidateTag: () => {},
  revalidatePath: () => {},
  unstable_cache: <T>(load: () => Promise<T>) => load,
}));

let github: FakeGitHub;

const put = (content: unknown) =>
  putContent(
    new Request("http://localhost/api/portfolio/content", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content }),
    }),
  );

async function errorOf(res: Response) {
  return ((await res.json()) as ApiErrorBody).error;
}

async function proWithPortfolio(email = "maya@example.com") {
  const user = await setPlan(await signInAs(email), "pro");
  const made = await POST(jsonRequest("/api/portfolio", { resume: sampleResume() }));
  expect(made.status).toBe(201);
  return user;
}

beforeEach(async () => {
  await resetDb();
  cookieJar.clear();
  clearGitHubCache();
  // sampleResume's repo link names "mayachen": the editor fetches her numbers without a token.
  github = installFakeGitHub((url) => {
    if (url.pathname === "/users/mayachen")
      return json({ login: "mayachen", followers: 5, public_repos: 1 });
    if (url.pathname === "/users/mayachen/repos")
      return json([rawRepo("mayachen/otto-resume", { stargazers_count: 42 })]);
    if (url.pathname === "/users/mayachen/events/public") return json([]);
    return undefined;
  });
});

afterEach(() => {
  github.restore();
});

describe("/api/portfolio/content", () => {
  it("needs a signed-in account with a portfolio plan", async () => {
    expect((await getContent()).status).toBe(401);
    expect((await put({})).status).toBe(401);
    await signInAs("free@example.com");
    expect((await getContent()).status).toBe(404);
    const res = await put({ pitch: "Hi" });
    expect(res.status).toBe(402);
    expect((await errorOf(res)).code).toBe("upgrade_required");
  });

  it("saves the owner's document, fetches GitHub, and the public page draws it", async () => {
    await proWithPortfolio();
    const loaded = (await (await getContent()).json()) as ContentResponse;
    expect(loaded.content).toEqual(emptyContent());
    expect(loaded.github).toMatchObject({ username: "mayachen", totalStars: 42 });
    expect(loaded).not.toHaveProperty("media");

    const saved = await put({
      pitch: "I build calm software.",
      stats: [{ id: "s1", value: "40%", label: "faster loads" }],
    });
    expect(saved.status).toBe(200);
    expect(
      (
        await PATCH(
          new Request("http://localhost/api/portfolio", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ published: true }),
          }),
        )
      ).status,
    ).toBe(200);
    const page = await findPublicPortfolio("maya-chen");
    if (page.status !== "ok") throw new Error("page missing");
    expect(page.portfolio.content.pitch).toBe("I build calm software.");
    expect(page.portfolio.content.stats).toEqual([{ value: "40%", label: "faster loads" }]);
    expect(page.portfolio.content.github?.totalStars).toBe(42);
    // Email stays off the page by default, in the rich content too.
    expect(page.portfolio.content.email).toBeNull();
  });

  it("refuses a bad document without storing any of it", async () => {
    await proWithPortfolio();
    expect((await put({ jobs: { e1: { website: "javascript:alert(1)" } } })).status).toBe(400);
    expect((await put({ pitch: "x".repeat(500) })).status).toBe(400);
    expect((await getPortfolio((await signInAs("maya@example.com")).id))?.content.pitch).toBeNull();
  });
});

// Owner decision 2026-11-10: portfolios are text only. Nothing uploads, stores or links a picture.
describe("a portfolio without pictures", () => {
  it("has no upload routes any more", () => {
    expect(existsSync(join(process.cwd(), "src", "app", "api", "portfolio", "media"))).toBe(false);
  });

  it("saves a document from an older editor without its pictures", async () => {
    const maya = await proWithPortfolio();
    const picture = {
      kind: "upload",
      id: "00000000-0000-4000-8000-000000000001",
      key: `${maya.id}/00000000-0000-4000-8000-000000000001.webp`,
      width: 800,
      height: 600,
    };
    const res = await put({
      pitch: "Hi",
      photo: picture,
      photos: [{ id: "ph1", image: picture, caption: "Sintra" }],
      projects: [{ id: "c:1", name: "Side thing", images: [picture], logo: picture }],
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as ContentResponse;
    expect(body.content.pitch).toBe("Hi");
    expect(JSON.stringify(body)).not.toMatch(/\.webp|"photo|"images"|"logo"/);
    const stored = await (
      await getDb()
    )
      .select({ content: portfolios.content })
      .from(portfolios)
      .where(eq(portfolios.userId, maya.id));
    expect(JSON.stringify(stored)).not.toContain(".webp");
  });

  it("deletes the page and its address in one go", async () => {
    const maya = await proWithPortfolio();
    const res = await deletePortfolio(
      new Request("http://localhost/api/portfolio", { method: "DELETE" }),
    );
    expect(res.status).toBe(200);
    const db = await getDb();
    expect(await db.select().from(portfolios).where(eq(portfolios.userId, maya.id))).toEqual([]);
    expect(
      (await deletePortfolio(new Request("http://localhost/api/portfolio", { method: "DELETE" })))
        .status,
    ).toBe(404);
  });
});

describe("20261108005000_portfolio_content.sql", () => {
  // portfolio_media is unused since 2026-11-10 but stays, locked, so the schema matches.
  it("keeps row level security on and the document an object", async () => {
    const db = await getDb();
    const rls = await db.execute(
      sql`select relrowsecurity from pg_class where relname = 'portfolio_media'`,
    );
    expect(
      (rls as unknown as { rows: { relrowsecurity: boolean }[] }).rows[0]?.relrowsecurity,
    ).toBe(true);
    const maya = await proWithPortfolio();
    await expect(
      db.execute(
        sql`update public.portfolios set content = '[]'::jsonb where user_id = ${maya.id}`,
      ),
    ).rejects.toThrow();
  });
});
