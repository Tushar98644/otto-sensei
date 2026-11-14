import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookieJar, createUser, fakeAuth, resetDb, signInAs } from "@/lib/auth/test-helpers";
import { emptyResume } from "@/lib/resume/schema";
import { openSharePage } from "@/lib/share/page";
import SharedResumePage from "./page";

const request = vi.hoisted(() => ({ after: [] as unknown[] }));

vi.mock("next/headers", async () => ({
  ...(await import("@/lib/auth/test-helpers")).nextHeadersMock,
  headers: async () =>
    new Headers({
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0 Safari/537.36",
      "x-forwarded-for": "203.0.113.7",
    }),
}));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (task: unknown) => {
    request.after.push(task);
  },
}));
vi.mock("@/lib/share/page", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/share/page")>()),
  openSharePage: vi.fn(),
}));

async function countedViews(ownerId: string): Promise<number> {
  vi.mocked(openSharePage).mockResolvedValue({
    status: "ok",
    share: { id: "share-1", ownerId, resume: emptyResume(), allowIndexing: false },
  });
  request.after = [];
  await SharedResumePage({ params: Promise.resolve({ slug: "abcdefghjk" }) });
  return request.after.length;
}

beforeEach(async () => {
  await resetDb();
  cookieJar.clear();
});

describe("the share page", () => {
  it("skips the owner's own view without asking Supabase before it renders", async () => {
    const owner = await signInAs("ada@example.com");
    const getUser = vi.spyOn(fakeAuth.server, "getUser");
    expect(await countedViews(owner.id)).toBe(0);
    expect(getUser).not.toHaveBeenCalled();
    getUser.mockRestore();
  });

  it("counts everyone else, signed in or not", async () => {
    const owner = await createUser("ada@example.com");
    expect(await countedViews(owner.id)).toBe(1);
    await signInAs("grace@example.com");
    expect(await countedViews(owner.id)).toBe(1);
  });
});
