import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyContent } from "@/lib/portfolio/content";
import { jordanV2Resume } from "@/lib/portfolio/fixtures/jordan";
import type { Portfolio, PortfolioSaveResponse } from "@/lib/portfolio/types";
import { queryKeys } from "@/lib/queries/keys";
import { portfolioQuery } from "@/lib/queries/options";

vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-query")>()),
  isServer: false,
}));
const api = vi.hoisted(() => ({ updatePortfolio: vi.fn(), createPortfolio: vi.fn() }));
vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  api,
}));
vi.mock("@/components/account/use-me", () => ({
  signedInUserId: () => "ada",
  subscribeToMe: () => () => {},
  useMe: () => ({ user: null, me: null }),
}));
const toast = vi.hoisted(() => vi.fn());
vi.mock("@/components/ui/toast", () => ({ toast, dismissToast: vi.fn() }));

const { QueryObserver } = await import("@tanstack/react-query");
const { ApiClientError } = await import("@/lib/api/client");
const { getQueryClient } = await import("@/lib/queries/client");
const store = await import("./portfolio-store");
const { usePortfolioStore } = store;
const { default: en } = await import("@/i18n/messages/en");
const WORDS = en.portfolio.store;
const savePortfolio = (patch: Parameters<typeof store.savePortfolio>[0]) =>
  store.savePortfolio(patch, WORDS);
const setPublished = (published: boolean) => store.setPublished(published, WORDS);
const makePortfolio = (
  resume: Parameters<typeof store.makePortfolio>[0],
  template?: Portfolio["template"],
) => store.makePortfolio(resume, WORDS, template);

const KEY = queryKeys.portfolio("ada");

function portfolio(change: Partial<Portfolio> = {}): Portfolio {
  return {
    id: "portfolio-1",
    resumeId: "resume-1",
    slug: "ada-lovelace",
    snapshot: jordanV2Resume(),
    versionAt: 1_000,
    content: emptyContent(),
    github: null,
    views: 0,
    createdAt: 1_000,
    updatedAt: 1_000,
    publishedAt: null,
    template: "navy",
    showEmail: false,
    showPhone: false,
    hiddenSections: [],
    sync: true,
    published: false,
    allowIndexing: false,
    ...change,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}

const saved = (change: Partial<Portfolio>): PortfolioSaveResponse => ({
  ok: true,
  portfolio: portfolio(change),
  created: false,
});
const shown = () => getQueryClient().getQueryData<Portfolio | null>(KEY);
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  getQueryClient().clear();
  getQueryClient().setQueryData(KEY, portfolio());
  usePortfolioStore.setState({ saving: false });
  vi.clearAllMocks();
});

describe("savePortfolio", () => {
  it("sends a quick Take down only after the publish it follows, so the page ends up down", async () => {
    const publish = deferred<PortfolioSaveResponse>();
    api.updatePortfolio
      .mockReturnValueOnce(publish.promise)
      .mockResolvedValueOnce(saved({ published: false }));
    const up = setPublished(true);
    expect(shown()?.published).toBe(true);
    const down = setPublished(false);
    expect(shown()?.published).toBe(false);
    await settle();
    expect(api.updatePortfolio).toHaveBeenCalledTimes(1);

    publish.resolve(saved({ published: true }));
    await Promise.all([up, down]);
    expect(api.updatePortfolio.mock.calls).toEqual([[{ published: true }], [{ published: false }]]);
    expect(shown()?.published).toBe(false);
    expect(usePortfolioStore.getState().saving).toBe(false);
    expect(toast.mock.calls.map(([options]) => options.title)).toEqual([
      "Your page is live",
      "Your page is down",
    ]);
  });

  it("keeps the newest choice on screen while older answers come back", async () => {
    const first = deferred<PortfolioSaveResponse>();
    api.updatePortfolio
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(saved({ template: "reel" }));
    const a = savePortfolio({ template: "dock" });
    const b = savePortfolio({ template: "reel" });
    expect(shown()?.template).toBe("reel");

    first.resolve(saved({ template: "dock" }));
    await a;
    expect(shown()?.template).toBe("reel");
    expect(usePortfolioStore.getState().saving).toBe(true);
    await b;
    expect(api.updatePortfolio.mock.calls).toEqual([
      [{ template: "dock" }],
      [{ template: "reel" }],
    ]);
    expect(shown()?.template).toBe("reel");
    expect(usePortfolioStore.getState().saving).toBe(false);
  });

  it("still sends the next change after one fails, and puts back what the failed one showed", async () => {
    api.updatePortfolio
      .mockResolvedValueOnce(saved({ template: "dock" }))
      .mockRejectedValueOnce(new ApiClientError("server_error", "No", 500))
      .mockResolvedValueOnce(saved({ template: "dock", showEmail: true }));
    expect(await savePortfolio({ template: "dock" })).toBe(true);
    expect(await savePortfolio({ template: "reel" })).toBe(false);
    expect(shown()?.template).toBe("dock");
    expect(await savePortfolio({ showEmail: true })).toBe(true);
    expect(shown()).toMatchObject({ template: "dock", showEmail: true });
  });
});

describe("savePortfolio after a full page load", () => {
  it("publishes when the first render asked for the portfolio before the user was known", async () => {
    const client = getQueryClient();
    client.clear();
    // What usePortfolio's first render leaves: a disabled query under an empty user id.
    const early = new QueryObserver(client, { ...portfolioQuery(""), enabled: false });
    const stop = early.subscribe(() => {});
    client.setQueryData(KEY, portfolio());
    api.updatePortfolio.mockResolvedValueOnce(saved({ published: true }));

    await setPublished(true);
    stop();
    expect(api.updatePortfolio.mock.calls).toEqual([[{ published: true }]]);
    expect(shown()?.published).toBe(true);
    expect(toast.mock.calls.map(([options]) => options.title)).toEqual(["Your page is live"]);
  });

  it("says so when there is no portfolio to save to yet", async () => {
    getQueryClient().clear();
    expect(await savePortfolio({ published: true })).toBe(false);
    expect(api.updatePortfolio).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Couldn't save that", variant: "error" }),
    );
    expect(usePortfolioStore.getState().saving).toBe(false);
  });
});

describe("makePortfolio", () => {
  it("makes the page in the design picked from the gallery, or the default without one", async () => {
    getQueryClient().setQueryData(KEY, null);
    api.createPortfolio.mockResolvedValue({ ...saved({ template: "reel" }), created: true });
    const resume = jordanV2Resume();
    expect(await makePortfolio(resume, "reel")).toMatchObject({ template: "reel" });
    expect(shown()?.template).toBe("reel");
    await makePortfolio(resume);
    expect(api.createPortfolio.mock.calls).toEqual([[{ resume, template: "reel" }], [{ resume }]]);
    expect(usePortfolioStore.getState().saving).toBe(false);
  });
});
