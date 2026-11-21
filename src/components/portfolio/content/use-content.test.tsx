import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyContent, type PortfolioContent } from "@/lib/portfolio/content";
import { jordanV2Resume } from "@/lib/portfolio/fixtures/jordan";
import type { Portfolio } from "@/lib/portfolio/types";

type StoreState = { status: string; owner: string | null; content: PortfolioContent; github: null };
const store = vi.hoisted(() => ({ state: {} as StoreState }));
vi.mock("./content-store", () => ({
  loadContent: vi.fn(),
  useContentStore: <T,>(select: (state: StoreState) => T) => select(store.state),
}));
vi.mock("@/components/account/use-me", () => ({ useMe: () => ({ user: { id: "ada" } }) }));

const { usePortfolioContent } = await import("./use-content");

const portfolio = {
  content: { ...emptyContent(), pitch: "Saved pitch" },
  github: null,
  showEmail: false,
  showPhone: false,
  hiddenSections: [],
} as unknown as Portfolio;

function Pitch() {
  const { content } = usePortfolioContent(portfolio, jordanV2Resume());
  return <p>{content.pitch}</p>;
}

describe("usePortfolioContent", () => {
  beforeEach(() => {
    store.state = { status: "idle", owner: null, content: emptyContent(), github: null };
  });

  it("shows the portfolio's copy before the content starts loading", () => {
    expect(renderToStaticMarkup(<Pitch />)).toBe("<p>Saved pitch</p>");
  });

  it("shows an edit typed while the saved content is still loading", () => {
    store.state = {
      ...store.state,
      status: "loading",
      owner: "ada",
      content: { ...emptyContent(), pitch: "Typed early" },
    };
    expect(renderToStaticMarkup(<Pitch />)).toBe("<p>Typed early</p>");
  });

  it("shows the portfolio's copy while another account's content is in the store", () => {
    store.state = {
      ...store.state,
      status: "ready",
      owner: "grace",
      content: { ...emptyContent(), pitch: "Not yours" },
    };
    expect(renderToStaticMarkup(<Pitch />)).toBe("<p>Saved pitch</p>");
  });
});
