import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/lib/auth/types";
import { emptyContent } from "@/lib/portfolio/content";
import { jordanV2Resume } from "@/lib/portfolio/fixtures/jordan";
import type { Portfolio } from "@/lib/portfolio/types";
import { queryKeys } from "@/lib/queries/keys";

const { PortfolioEditor, PortfolioUpgrade } = vi.hoisted(() => ({
  PortfolioEditor: () => null,
  PortfolioUpgrade: () => null,
}));
vi.mock("./portfolio-editor", () => ({ PortfolioEditor }));
vi.mock("./portfolio-upgrade", () => ({ PortfolioUpgrade }));
const loadTemplate = vi.hoisted(() => vi.fn(async () => () => null));
vi.mock("./templates/lazy", () => ({ loadTemplate }));
const api = vi.hoisted(() => ({ portfolio: vi.fn() }));
vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  api,
}));

const { editorLoader, preloadPortfolio, upgradeLoader } = await import("./screens");

const user = (plan: SessionUser["plan"]) =>
  ({ id: "ada", email: "ada@example.com", plan }) as SessionUser;

const page: Portfolio = {
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
  template: "reel",
  showEmail: false,
  showPhone: false,
  hiddenSections: [],
  sync: true,
  published: false,
  allowIndexing: false,
};

let client: QueryClient;

beforeEach(() => {
  client = new QueryClient();
  vi.clearAllMocks();
});

describe("preloadPortfolio, on the sidebar link's hover", () => {
  it("fetches only the upgrade screen on Free", async () => {
    client.setQueryData(queryKeys.portfolio("ada"), page);
    await preloadPortfolio(client, user("free"));
    expect(upgradeLoader.getState()).toEqual({ status: "ready", value: PortfolioUpgrade });
    expect(editorLoader.getState().status).toBe("idle");
    expect(loadTemplate).not.toHaveBeenCalled();
  });

  it("fetches the editor and the design in use, reading the page from the cache", async () => {
    client.setQueryData(queryKeys.portfolio("ada"), page);
    await preloadPortfolio(client, user("pro"));
    expect(editorLoader.getState()).toEqual({ status: "ready", value: PortfolioEditor });
    expect(loadTemplate).toHaveBeenCalledExactlyOnceWith("reel");
    expect(api.portfolio).not.toHaveBeenCalled();
  });

  it("asks for the page when it isn't cached, and loads no design before there is one", async () => {
    api.portfolio.mockResolvedValue({ ok: true, portfolio: null });
    await preloadPortfolio(client, user("pro"));
    expect(api.portfolio).toHaveBeenCalledTimes(1);
    expect(loadTemplate).not.toHaveBeenCalled();
  });
});
