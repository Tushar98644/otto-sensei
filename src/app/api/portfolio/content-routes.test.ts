import sharp from "sharp";
import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { portfolioMedia, portfolios } from "@/db/schema";
import type { ApiErrorBody } from "@/lib/api/types";
import { cookieJar, jsonRequest, resetDb, setPlan, signInAs } from "@/lib/auth/test-helpers";
import { clearGitHubCache } from "@/lib/github/cache";
import { installFakeGitHub, json, rawRepo, type FakeGitHub } from "@/lib/github/testing";
import {
  emptyContent,
  type ContentResponse,
  type MediaUploadResponse,
  type PortfolioContent,
} from "@/lib/portfolio/content";
import { saveContent } from "@/lib/portfolio/content-records";
import { MEDIA_LIMITS } from "@/lib/portfolio/media";
import { storeMedia } from "@/lib/portfolio/media-records";
import { memoryMediaStore, setMediaStoreForTests } from "@/lib/portfolio/media-store";
import { findPublicPortfolio, getPortfolio } from "@/lib/portfolio/records";
import { sampleResume } from "@/lib/portfolio/testing";
import { DELETE as deleteAccount } from "../account/route";
import { GET as getContent, PUT as putContent } from "./content/route";
import { POST as uploadMedia } from "./media/route";
import { DELETE as deletePortfolio, PATCH, POST } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);
vi.mock("next/cache", () => ({
  revalidateTag: () => {},
  revalidatePath: () => {},
  unstable_cache: <T>(load: () => Promise<T>) => load,
}));

let store: ReturnType<typeof memoryMediaStore>;
let github: FakeGitHub;

const put = (content: unknown) =>
  putContent(
    new Request("http://localhost/api/portfolio/content", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content }),
    }),
  );

function upload(bytes: Uint8Array, kind = "screenshot", name = "shot.png") {
  const form = new FormData();
  form.append("file", new Blob([bytes as Uint8Array<ArrayBuffer>]), name);
  form.append("kind", kind);
  return uploadMedia(
    new Request("http://localhost/api/portfolio/media", { method: "POST", body: form }),
  );
}

async function png(width = 1200, height = 800) {
  return new Uint8Array(
    await sharp({ create: { width, height, channels: 3, background: "#e3a857" } })
      .png()
      .toBuffer(),
  );
}

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
  store = memoryMediaStore();
  setMediaStoreForTests(store);
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
  setMediaStoreForTests(null);
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
    expect(loaded.media).toMatchObject({ files: 0, maxFiles: MEDIA_LIMITS.maxFiles });

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

describe("/api/portfolio/media", () => {
  it("is Pro and Max only", async () => {
    await signInAs("free@example.com");
    const res = await upload(await png());
    expect(res.status).toBe(402);
    expect(store.files.size).toBe(0);
  });

  it("decides the type by the bytes, shrinks and re-encodes, and counts the space", async () => {
    const maya = await proWithPortfolio();
    // A real PNG with a .gif name is fine; a GIF named .png is not.
    const ok = await upload(await png(3200, 1600), "screenshot", "shot.gif");
    expect(ok.status).toBe(201);
    const body = (await ok.json()) as MediaUploadResponse;
    expect(body.image).toMatchObject({ kind: "upload", width: 2400, height: 1200 });
    expect(body.image.key.startsWith(`${maya.id}/`)).toBe(true);
    expect(body.src).toBe(`https://media.test/${body.image.key}`);
    expect(store.files.has(body.image.key)).toBe(true);
    expect(body.media.files).toBe(1);

    const gif = new Uint8Array([...new TextEncoder().encode("GIF89a"), ...new Array(64).fill(0)]);
    const refused = await upload(gif, "photo", "me.png");
    expect(refused.status).toBe(415);
    expect((await errorOf(refused)).code).toBe("unsupported_type");
    expect((await upload(await png(), "poster")).status).toBe(400);
  });

  it("turns away files over the size limit before reading them", async () => {
    await proWithPortfolio();
    const big = new Uint8Array(MEDIA_LIMITS.maxUploadBytes + 1);
    big.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const res = await upload(big);
    expect(res.status).toBe(413);
    expect(store.files.size).toBe(0);
  });

  it("stops at the account's total", async () => {
    const maya = await proWithPortfolio();
    const db = await getDb();
    await db.insert(portfolioMedia).values(
      Array.from({ length: MEDIA_LIMITS.maxFiles }, (_, i) => ({
        id: crypto.randomUUID(),
        userId: maya.id,
        key: `${maya.id}/${crypto.randomUUID()}.webp`,
        kind: "screenshot" as const,
        contentType: "image/webp",
        bytes: 1000 + i,
        width: 10,
        height: 10,
        createdAt: Date.now(),
        detachedAt: null,
      })),
    );
    const res = await upload(await png());
    expect(res.status).toBe(409);
    expect((await errorOf(res)).code).toBe("limit_reached");
  });

  it("lets a save point only at the account's own pictures", async () => {
    const other = await setPlan(await signInAs("other@example.com"), "pro");
    const theirs = await storeMedia(
      other.id,
      "photo",
      { bytes: new Uint8Array([1]), width: 1, height: 1, source: "image/png" },
      store,
    );
    if (theirs.status !== "stored") throw new Error("not stored");
    await proWithPortfolio();
    const res = await put({ photo: theirs.image });
    expect(res.status).toBe(400);
    expect((await errorOf(res)).message).toMatch(/isn't in your account/);
  });
});

describe("deleting pictures", () => {
  const image = {
    bytes: new Uint8Array([1, 2, 3]),
    width: 4,
    height: 3,
    source: "image/png" as const,
  };

  it("keeps a removed picture through the Undo window, then deletes it", async () => {
    const maya = await proWithPortfolio();
    const stored = await storeMedia(maya.id, "photo", image, store);
    if (stored.status !== "stored") throw new Error("not stored");
    const t0 = Date.now();
    const withPhoto: PortfolioContent = { ...emptyContent(), photo: stored.image };
    expect((await saveContent(maya.id, withPhoto, t0)).status).toBe("saved");
    // Removed, then put back by Undo within the grace period: still there.
    await saveContent(maya.id, emptyContent(), t0 + 1000);
    await saveContent(maya.id, withPhoto, t0 + 2000);
    await saveContent(maya.id, withPhoto, t0 + MEDIA_LIMITS.detachedGraceMs * 2);
    expect(store.files.has(stored.image.key)).toBe(true);
    // Removed for good: swept on a later save past the grace period.
    await saveContent(maya.id, emptyContent(), t0 + MEDIA_LIMITS.detachedGraceMs * 2 + 1000);
    await saveContent(maya.id, emptyContent(), t0 + MEDIA_LIMITS.detachedGraceMs * 4);
    expect(store.files.has(stored.image.key)).toBe(false);
    const rows = await (
      await getDb()
    )
      .select()
      .from(portfolioMedia)
      .where(eq(portfolioMedia.userId, maya.id));
    expect(rows).toEqual([]);
  });

  it("deletes every picture with the portfolio", async () => {
    const maya = await proWithPortfolio();
    await storeMedia(maya.id, "photo", image, store);
    await storeMedia(maya.id, "screenshot", image, store);
    expect(store.files.size).toBe(2);
    const res = await deletePortfolio(
      new Request("http://localhost/api/portfolio", { method: "DELETE" }),
    );
    expect(res.status).toBe(200);
    expect(store.files.size).toBe(0);
    const db = await getDb();
    expect(await db.select().from(portfolios).where(eq(portfolios.userId, maya.id))).toEqual([]);
    expect(
      await db.select().from(portfolioMedia).where(eq(portfolioMedia.userId, maya.id)),
    ).toEqual([]);
    expect(
      (await deletePortfolio(new Request("http://localhost/api/portfolio", { method: "DELETE" })))
        .status,
    ).toBe(404);
  });

  it("deletes every picture with the account, and leaves other accounts' alone", async () => {
    const other = await signInAs("other@example.com");
    await storeMedia(other.id, "photo", image, store);
    const ada = await signInAs("ada@example.com");
    await storeMedia(ada.id, "photo", image, store);
    await storeMedia(ada.id, "personal", image, store);
    expect(store.files.size).toBe(3);
    const res = await deleteAccount();
    expect(res.status).toBe(200);
    expect([...store.files.keys()].every((key) => key.startsWith(`${other.id}/`))).toBe(true);
    expect(store.files.size).toBe(1);
  });
});

describe("20261108005000_portfolio_content.sql", () => {
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
