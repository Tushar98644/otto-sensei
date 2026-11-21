import { usePathname } from "next/navigation";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HeaderActions } from "@/components/site/account-link";
import { HERO_CTA_ID } from "@/components/site/page-cta";
import { trialOffered } from "@/lib/billing/intervals";
import { FeaturesOverview } from "./features-overview";
import { HeroCta } from "./hero-cta";
import { HeroDemo } from "./hero-demo";
import { HowItWorks } from "./how-it-works";
import { PricingTeaser } from "./pricing-teaser";
import { PrimaryCta } from "./primary-cta";
import { SectionLink } from "./section";

vi.mock("next/font/google", () => ({
  EB_Garamond: () => ({ className: "face-italic", variable: "", style: {} }),
}));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: vi.fn(() => "/"),
}));
vi.mock("@/lib/billing/intervals", () => ({ trialOffered: vi.fn(() => true) }));

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

beforeEach(() => {
  vi.mocked(usePathname).mockReturnValue("/");
  vi.mocked(trialOffered).mockReturnValue(true);
});

describe("the hero's call to action", () => {
  it("asks for the file, says what happens to it and offers the job match check", () => {
    const html = renderToStaticMarkup(<HeroCta />);
    expect(html).toContain(`id="${HERO_CTA_ID}"`);
    expect(html).toContain('href="/studio"');
    expect(text(html)).toContain("Check my resume");
    expect(text(html)).toContain("No signup needed. Your file is read, then deleted.");
    expect(html).toContain('href="/job-match"');
    expect(text(html)).toContain("Have a job post? Check your match");
  });

  it("goes back to the resume this browser already holds", () => {
    const html = renderToStaticMarkup(<PrimaryCta savedTitle="Design lead" />);
    expect(html).toContain('href="/studio"');
    expect(text(html)).toBe("Continue with Design lead");
  });
});

describe("the hero's example", () => {
  it("lets phones switch between the two windows, starting on what software reads", () => {
    const html = renderToStaticMarkup(<HeroDemo />);
    expect(html).toContain('<button type="button" aria-pressed="false"');
    expect(text(html)).toContain("What you see What software reads");
    expect(html.match(/aria-pressed="true"[^>]*>What software reads/)).not.toBeNull();
    expect(html.match(/class="max-sm:hidden"/g)).toHaveLength(1);
  });
});

describe("the header's button", () => {
  it("waits on the home page until the hero's own button scrolls away", () => {
    const html = renderToStaticMarkup(<HeaderActions />);
    expect(html).toMatch(/class="[^"]*\binvisible\b[^"]*"[^>]*>Check my resume/);
    expect(html).toContain("max-md:h-10");
  });

  it("waits on the job match page too, which opens on its own tool", () => {
    vi.mocked(usePathname).mockReturnValue("/job-match");
    expect(renderToStaticMarkup(<HeaderActions />)).toMatch(/\binvisible\b/);
  });

  it("shows straight away on every other page", () => {
    vi.mocked(usePathname).mockReturnValue("/pricing");
    const html = renderToStaticMarkup(<HeaderActions />);
    expect(html).toContain("Check my resume");
    expect(html).not.toMatch(/\binvisible\b/);
  });
});

describe("the pricing teaser", () => {
  it("is two plans side by side and a link, with the trial when it's on sale", () => {
    const html = renderToStaticMarkup(<PricingTeaser />);
    expect(html.match(/<li/g)).toHaveLength(2);
    expect(text(html)).toContain(
      "Free $0 Check, fix and download one resume as a PDF, with 3 line fixes a month from Otto.",
    );
    expect(text(html)).toContain("Pro $15 /month Tailoring, cover letters");
    expect(text(html)).toContain("Try 3 days for $1.");
    expect(html).toContain('href="/pricing"');
    expect(text(html)).toContain("See pricing");
  });

  it("drops the trial when it isn't offered", () => {
    vi.mocked(trialOffered).mockReturnValue(false);
    const html = renderToStaticMarkup(<PricingTeaser />);
    expect(text(html)).not.toMatch(/\$1\b|Try \d+ days/);
    expect(text(html)).toContain("Cancel anytime.");
  });
});

describe("the home page's sections", () => {
  it("line up each ghost link's label with the text above it", () => {
    const html = renderToStaticMarkup(<SectionLink href="/pricing">See pricing</SectionLink>);
    expect(html).toContain("-ml-4.25");
    expect(html).not.toContain("-ml-5");
  });

  it("tell in step 5 that every format reads top to bottom", () => {
    expect(text(renderToStaticMarkup(<HowItWorks />))).toContain(
      "Every format reads top to bottom, with headings on their own lines, on Letter or A4.",
    );
  });

  it("keep the features lead about the features", () => {
    expect(renderToStaticMarkup(<FeaturesOverview />)).not.toMatch(/microphone/i);
  });
});
