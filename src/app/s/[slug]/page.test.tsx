import { beforeEach, describe, expect, it, vi } from "vitest";
import { SharePageFrame } from "@/components/share/share-page-frame";
import { cookieJar, createUser, fakeAuth, resetDb, signInAs } from "@/lib/auth/test-helpers";
import { emptyResume } from "@/lib/resume/schema";
import { ensureReferralCode } from "@/lib/referrals/records";
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

type Element = { type?: unknown; props?: { href?: string; children?: unknown } };

function linkIn(node: unknown): Element | null {
  if (Array.isArray(node)) return node.map(linkIn).find(Boolean) ?? null;
  const element = node as Element | null;
  if (!element?.props) return null;
  return element.props.href === undefined ? linkIn(element.props.children) : element;
}

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

  it("links home with the owner's invite once they have one, and nothing else about them", async () => {
    const owner = await createUser("ada@example.com");
    vi.mocked(openSharePage).mockResolvedValue({
      status: "ok",
      share: { id: "share-1", ownerId: owner.id, resume: emptyResume(), allowIndexing: false },
    });
    const homeHref = async () => {
      const page = await SharedResumePage({ params: Promise.resolve({ slug: "abcdefghjk" }) });
      return (page.props as { homeHref?: string }).homeHref;
    };
    expect(await homeHref()).toBe("/");
    const code = await ensureReferralCode(owner.id, null);
    expect(await homeHref()).toBe(`/?ref=${code}`);
  });

  it("links home with a plain anchor, so the page loads in full and the invite tracker sees the code", () => {
    const link = linkIn(SharePageFrame({ children: null, homeHref: "/?ref=abcd2345" }));
    expect(link?.type).toBe("a");
    expect(link?.props?.href).toBe("/?ref=abcd2345");
  });
});
