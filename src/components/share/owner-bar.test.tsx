import type { ReactNode } from "react";
import { renderToStaticMarkup as renderBare } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { queryKeys } from "@/lib/queries/keys";
import type { SharedLink } from "@/lib/share/types";
import { inEnglish } from "@/components/dashboard/messages-testing";

// The English messages these components read, as the page would pass them.
const renderToStaticMarkup = (node: ReactNode) => renderBare(inEnglish(node));

vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-query")>()),
  isServer: false,
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/s/AbCdEfGhJkLmNp",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
const api = vi.hoisted(() => ({ shares: vi.fn(), me: vi.fn() }));
vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  api,
}));

const { SessionUserProvider } = await import("@/components/account/session-user");
const { getQueryClient } = await import("@/lib/queries/client");
const { ShareOwnerBar } = await import("./owner-bar");

const LINK: SharedLink = {
  id: "share-1",
  resumeId: "resume-1",
  slug: "AbCdEfGhJkLmNp",
  name: "Maya Chen",
  versionAt: 1_000,
  showContact: false,
  allowIndexing: true,
  views: 12,
  lastViewedAt: 2_000,
  createdAt: 1_000,
  updatedAt: 1_000,
};

const draw = (slug: string) =>
  renderToStaticMarkup(
    <SessionUserProvider userId="ada" me={null}>
      <ShareOwnerBar slug={slug} />
    </SessionUserProvider>,
  );

beforeEach(() => {
  getQueryClient().clear();
  vi.clearAllMocks();
});

describe("the owner's bar on a shared resume", () => {
  it("offers Edit and the link's settings, set as the link is", () => {
    getQueryClient().setQueryData(queryKeys.shares("ada"), [LINK]);
    const html = draw(LINK.slug);
    expect(html).toContain("Only you see this bar");
    expect(html).toContain("Edit");
    expect(html).toMatch(/aria-expanded="false"[^>]*>Link settings/);
    expect(html).toMatch(/<div id="[^"]+" hidden=""/);
    expect(html).toMatch(/<input(?![^>]*checked)[^>]*>(?:(?!<input).)*Show email and phone/);
    expect(html).toMatch(/<input[^>]*checked=""[^>]*>(?:(?!<input).)*Let search engines list it/);
  });

  it("draws nothing for a link that isn't among the account's own", () => {
    getQueryClient().setQueryData(queryKeys.shares("ada"), [LINK]);
    expect(draw("ZyXwVuTsRqPoNm")).toBe("");
  });
});
