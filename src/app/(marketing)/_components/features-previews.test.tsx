import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PORTFOLIO_ROUTE } from "@/components/portfolio/route";
import { ROUTES } from "@/components/site/routes";
import { FeaturesOverview } from "./features-overview";
import { FEATURE_PREVIEWS } from "./features-previews";

const preloads = vi.hoisted(() => [] as unknown[][]);

vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-dom")>();
  return { ...actual, preload: (...args: unknown[]) => preloads.push(args) };
});

const imgs = (html: string) => html.match(/<img[^>]*>/g) ?? [];

beforeEach(() => {
  preloads.length = 0;
});

describe("the home page's feature previews", () => {
  it("load the Resumes tab's format pictures lazily, so they are never hinted in the page's head", () => {
    const html = renderToStaticMarkup(<>{FEATURE_PREVIEWS[ROUTES.dashboardResumes]!()}</>);
    expect(imgs(html)).toHaveLength(3);
    for (const img of imgs(html)) expect(img).toContain('loading="lazy"');
  });

  it("ask for no image while the server renders, even for the closed Portfolio tab", () => {
    const portfolio = renderToStaticMarkup(<>{FEATURE_PREVIEWS[PORTFOLIO_ROUTE]!()}</>);
    for (const img of imgs(portfolio)) expect(img).toContain('loading="lazy"');
    renderToStaticMarkup(<FeaturesOverview />);
    expect(preloads).toEqual([]);
  });
});
