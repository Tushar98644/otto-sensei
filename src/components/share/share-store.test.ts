import { beforeEach, describe, expect, it, vi } from "vitest";
import { queryKeys } from "@/lib/queries/keys";
import type { SharedLink } from "@/lib/share/types";

vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-query")>()),
  isServer: false,
}));
const api = vi.hoisted(() => ({ shares: vi.fn() }));
vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  api,
}));
vi.mock("@/components/account/use-me", () => ({
  signedInUserId: () => "ada",
  subscribeToMe: () => () => {},
}));

const { ApiClientError } = await import("@/lib/api/client");
const { getQueryClient } = await import("@/lib/queries/client");
const { dropShare, ensureShares, putShare } = await import("./share-store");

const link = (id: string, createdAt: number, resumeId = `resume-${id}`) =>
  ({ id, resumeId, createdAt }) as SharedLink;
const shown = () => getQueryClient().getQueryData<SharedLink[]>(queryKeys.shares("ada"));

beforeEach(() => {
  getQueryClient().clear();
  vi.clearAllMocks();
});

describe("the share links cache", () => {
  it("loads the account's links once, then hands back the same list", async () => {
    api.shares.mockResolvedValue({ ok: true, links: [link("a", 1)] });
    expect(await ensureShares("ada")).toEqual([link("a", 1)]);
    expect(await ensureShares("ada")).toEqual([link("a", 1)]);
    expect(api.shares).toHaveBeenCalledTimes(1);
  });

  it("rejects when the links can't be read, and asks again next time", async () => {
    api.shares.mockRejectedValueOnce(new ApiClientError("server_error", "No", 500));
    api.shares.mockRejectedValueOnce(new ApiClientError("server_error", "No", 500));
    await expect(ensureShares("ada")).rejects.toThrow("No");
    api.shares.mockResolvedValue({ ok: true, links: [] });
    expect(await ensureShares("ada")).toEqual([]);
  });

  it("puts a new or changed link in place, newest first, and drops a turned-off one", async () => {
    api.shares.mockResolvedValue({ ok: true, links: [link("a", 1)] });
    await ensureShares("ada");
    putShare(link("b", 2));
    putShare({ ...link("a", 1), showContact: true });
    expect(shown()?.map((item) => item.id)).toEqual(["b", "a"]);
    expect(shown()?.[1]?.showContact).toBe(true);
    dropShare("b");
    expect(shown()?.map((item) => item.id)).toEqual(["a"]);
  });
});
