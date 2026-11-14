import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { emptyContent } from "@/lib/portfolio/content";
import { jordanV2Resume } from "@/lib/portfolio/fixtures/jordan";
import type { Portfolio } from "@/lib/portfolio/types";

// The real store hook reads its first state on the server renderer, so the test sets it here.
const store = vi.hoisted(() => ({ saving: false }));
vi.mock("./portfolio-store", () => ({
  setPublished: vi.fn(),
  usePortfolioStore: (pick: (state: { saving: boolean }) => unknown) => pick(store),
}));
// A closed Menu renders no items, so the test reads the items the bar hands it.
const menus = vi.hoisted(() => ({ items: [] as unknown[] }));
vi.mock("@/components/ui/menu", () => ({
  Menu: (props: { items: unknown[] }) => {
    menus.items.push(...props.items);
    return null;
  },
}));
vi.mock("@/components/account/use-me", () => ({
  useMe: () => ({ user: { id: "ada", plan: "pro" }, me: null }),
}));

const { EditorBar } = await import("./editor-bar");

const live: Portfolio = {
  id: "portfolio-1",
  resumeId: "resume-1",
  slug: "ada-lovelace",
  snapshot: jordanV2Resume(),
  versionAt: 1_000,
  content: emptyContent(),
  github: null,
  views: 12,
  createdAt: 1_000,
  updatedAt: 1_000,
  publishedAt: 1_000,
  template: "navy",
  showEmail: false,
  showPhone: false,
  hiddenSections: [],
  sync: true,
  published: true,
  allowIndexing: false,
};

function takeDown(): { label: string; disabled?: boolean } | undefined {
  menus.items = [];
  renderToStaticMarkup(<EditorBar portfolio={live} onPreview={() => {}} />);
  return menus.items.find(
    (item): item is { label: string; disabled?: boolean } =>
      typeof item === "object" && item !== null && "label" in item && item.label === "Take down",
  );
}

describe("the editor bar on a live page", () => {
  it("won't take the page down while a change is still on its way", () => {
    store.saving = true;
    expect(takeDown()?.disabled).toBe(true);
    store.saving = false;
    expect(takeDown()).toBeDefined();
    expect(takeDown()?.disabled).toBe(false);
  });
});
