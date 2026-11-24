import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { JOB_COUNTS_FALLBACK } from "@/lib/job-feed/counts";
import { ExtensionShowcase } from "./extension-showcase";
import { Faq } from "./faq";
import { FeaturesOverview } from "./features-overview";
import { FinalCta } from "./final-cta";
import { Hero } from "./hero";
import { HowItWorks } from "./how-it-works";
import { JobsShowcase } from "./jobs-showcase";
import { PortfolioShowcase } from "./portfolio-showcase";
import { PricingTeaser } from "./pricing-teaser";
import { Section } from "./section";
import { WontDo } from "./wont-do";

vi.mock("next/font/google", () => ({
  EB_Garamond: () => ({ className: "face-italic", variable: "", style: {} }),
}));

const openTag = (html: string) => /<section[^>]*>/.exec(html)?.[0] ?? "";
const classes = (tag: string) => (/class="([^"]*)"/.exec(tag)?.[1] ?? "").split(" ");

describe("home sections below the fold", () => {
  const lazy = [
    <HowItWorks key="how" />,
    <FeaturesOverview key="features" />,
    <JobsShowcase key="jobs" jobCounts={JOB_COUNTS_FALLBACK} />,
    <ExtensionShowcase key="extension" />,
    <PortfolioShowcase key="portfolio" />,
    <WontDo key="wont-do" />,
    <PricingTeaser key="pricing" />,
    <Faq key="faq" />,
    <FinalCta key="final" />,
  ];

  it("skip rendering until near the screen, holding a guessed height until then", () => {
    for (const section of lazy) {
      const tag = openTag(renderToStaticMarkup(section));
      expect(tag).toContain('data-lazy=""');
      expect(classes(tag)).toContain("[content-visibility:auto]");
      expect(classes(tag)).toContain("data-rendered:[content-visibility:visible]");
      expect(classes(tag).some((name) => name.startsWith("[contain-intrinsic-size:auto_"))).toBe(
        true,
      );
    }
  });

  it("keep their spacing: edge room nets to zero, and the closing panel keeps its padding", () => {
    const how = classes(openTag(renderToStaticMarkup(<HowItWorks />)));
    expect(how).toEqual(expect.arrayContaining(["pt-24", "sm:pt-32", "pb-2", "-mb-2"]));
    const final = classes(openTag(renderToStaticMarkup(<FinalCta />)));
    expect(final).toEqual(expect.arrayContaining(["py-24", "sm:py-32"]));
    expect(final).not.toContain("pb-2");
    expect(final).not.toContain("-mb-2");
  });

  it("pause Otto's loops off screen only where Otto loops", () => {
    for (const section of [
      <Hero key="hero" jobCounts={JOB_COUNTS_FALLBACK} />,
      <HowItWorks key="how" />,
      <FinalCta key="final" />,
    ]) {
      const tag = openTag(renderToStaticMarkup(section));
      expect(tag).toContain('data-pause=""');
      expect(classes(tag)).toContain("data-offscreen:[&amp;_svg_*]:[animation-play-state:paused]!");
    }
    expect(openTag(renderToStaticMarkup(<WontDo />))).not.toContain("data-pause");
  });

  it("leave a plain section as it was", () => {
    const tag = openTag(
      renderToStaticMarkup(
        <Section labelledBy="title">
          <h2 id="title">Title</h2>
        </Section>,
      ),
    );
    expect(tag).not.toContain("data-lazy");
    expect(tag).not.toContain("data-pause");
    expect(classes(tag)).toEqual(["scroll-mt-16", "pt-24", "sm:pt-32"]);
  });
});
