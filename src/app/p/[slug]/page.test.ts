import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUser, resetDb, setPlan } from "@/lib/auth/test-helpers";
import { createPortfolio, findPublicPortfolio, updatePortfolio } from "@/lib/portfolio/records";
import { sampleResume } from "@/lib/portfolio/testing";
import PublicPortfolioPage, { generateMetadata, generateViewport } from "./page";

const render = vi.hoisted(() => ({ caches: [] as Map<string, unknown>[] }));

// Outside a server render React's cache() remembers nothing, so this plays one render's cache.
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  cache: (load: (...args: unknown[]) => unknown) => {
    const memo = new Map<string, unknown>();
    render.caches.push(memo);
    return (...args: unknown[]) => {
      const key = JSON.stringify(args);
      if (!memo.has(key)) memo.set(key, load(...args));
      return memo.get(key);
    };
  },
}));

vi.mock("next/cache", () => ({
  revalidateTag: () => {},
  unstable_cache: <T>(load: () => Promise<T>) => load,
}));

vi.mock("@/lib/portfolio/records", async (importOriginal) => {
  const records = await importOriginal<typeof import("@/lib/portfolio/records")>();
  return { ...records, findPublicPortfolio: vi.fn(records.findPublicPortfolio) };
});

beforeEach(async () => {
  await resetDb();
  for (const memo of render.caches) memo.clear();
  vi.mocked(findPublicPortfolio).mockClear();
});

describe("/p/[slug]", () => {
  it("reads the page once for its viewport, metadata and body", async () => {
    const user = await setPlan(await createUser("maya@example.com"), "pro");
    await createPortfolio(user.id, { resume: sampleResume() });
    await updatePortfolio(user.id, { published: true }, { plan: "pro" });
    vi.mocked(findPublicPortfolio).mockClear();

    const props = { params: Promise.resolve({ slug: "maya-chen" }) };
    const [viewport, metadata, page] = await Promise.all([
      generateViewport(props),
      generateMetadata(props),
      PublicPortfolioPage(props),
    ]);
    expect(viewport.themeColor).toBeTruthy();
    expect(metadata.title).toEqual({ absolute: "Maya Chen - Portfolio" });
    expect(page).toBeTruthy();
    expect(findPublicPortfolio).toHaveBeenCalledTimes(1);
  });
});
