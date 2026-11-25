import type { ReactNode } from "react";
import { renderToStaticMarkup as renderBare } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { jordanV2Resume } from "@/lib/portfolio/fixtures/jordan";
import { PORTFOLIO_TEMPLATE_INFO } from "@/lib/portfolio/templates";
import { PORTFOLIO_TEMPLATE_IDS } from "@/lib/portfolio/types";
import { inEnglish } from "@/components/dashboard/messages-testing";

// The English messages these components read, as the page would pass them.
const renderToStaticMarkup = (node: ReactNode) => renderBare(inEnglish(node));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/portfolio",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

const { PortfolioStart } = await import("./portfolio-start");

describe("the portfolio start screen on a paid plan", () => {
  it("opens on the design gallery, each design one click from a page, with no plan pitch", () => {
    const html = renderToStaticMarkup(<PortfolioStart candidates={[jordanV2Resume()]} />);
    expect(html).toContain("Pick a design");
    expect(html.match(/>Use this design</g)).toHaveLength(PORTFOLIO_TEMPLATE_IDS.length);
    for (const id of PORTFOLIO_TEMPLATE_IDS) {
      expect(html).toContain(`aria-label="Use this design: ${PORTFOLIO_TEMPLATE_INFO[id].name}"`);
    }
    expect(html).not.toMatch(/Pro and Max|Try Pro|web page/);
    expect(html).not.toContain("Make it from");
  });

  it("asks which resume to use only when there are several", () => {
    const second = { ...jordanV2Resume(), id: "resume-2", title: "Second" };
    const html = renderToStaticMarkup(<PortfolioStart candidates={[jordanV2Resume(), second]} />);
    expect(html).toContain("Make it from");
  });
});
