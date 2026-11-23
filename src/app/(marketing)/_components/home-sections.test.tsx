import { usePathname } from "next/navigation";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HeaderActions } from "@/components/site/account-link";
import { HERO_CTA_ID } from "@/components/site/hero-cta-in-view";
import { applicationLimit, resumeLimit } from "@/config/plans";
import { trialOffered } from "@/lib/billing/intervals";
import { JOB_COUNTS_FALLBACK } from "@/lib/job-feed/counts";
import { PORTFOLIO_PICKS, PORTFOLIO_TEMPLATE_INFO } from "@/lib/portfolio/templates";
import { PORTFOLIO_TEMPLATE_IDS } from "@/lib/portfolio/types";
import { TEMPLATE_IDS } from "@/lib/resume/schema";
import { Faq } from "./faq";
import { FEATURES, FeaturesOverview } from "./features-overview";
import { FinalCta } from "./final-cta";
import { Hero } from "./hero";
import { HeroCta } from "./hero-cta";
import { HeroDemo } from "./hero-demo";
import { HowItWorks } from "./how-it-works";
import { JobsShowcase } from "./jobs-showcase";
import { PortfolioShowcase } from "./portfolio-showcase";
import { PricingTeaser } from "./pricing-teaser";
import { PrimaryCta } from "./primary-cta";
import { SectionLink } from "./section";
import { WontDo } from "./wont-do";

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

  it("shows straight away on every other page", () => {
    vi.mocked(usePathname).mockReturnValue("/pricing");
    const html = renderToStaticMarkup(<HeaderActions />);
    expect(html).toContain("Check my resume");
    expect(html).not.toMatch(/\binvisible\b/);
  });
});

describe("the pricing teaser", () => {
  it("is two lines and a link, with the trial when it's on sale", () => {
    const html = renderToStaticMarkup(<PricingTeaser />);
    expect(html.match(/<li/g)).toHaveLength(2);
    expect(text(html)).toContain(
      "Free: check, fix and download 1 resume as a PDF, with 3 line fixes a month from Otto.",
    );
    expect(text(html)).toContain(
      "Pro, $15 a month: tailoring, cover letters, every job match, up to 25 resumes and 1,000 tracked applications.",
    );
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

const count = new Intl.NumberFormat("en-US");

describe("the home page's copy", () => {
  it("takes Free's and Pro's resume and application numbers from the plans", () => {
    const teaser = text(renderToStaticMarkup(<PricingTeaser />));
    expect(teaser).toContain(`download ${resumeLimit("free")} resume as a PDF`);
    expect(teaser).toContain(
      `up to ${count.format(resumeLimit("pro"))} resumes and ${count.format(applicationLimit("pro"))} tracked applications`,
    );
    expect(teaser).not.toMatch(/full tracker|unlimited/i);
  });

  it("shows Our picks in the portfolio showcase, in order, and counts every design", () => {
    const html = renderToStaticMarkup(<PortfolioShowcase />);
    const shown = [...html.matchAll(/alt="A portfolio page in the ([^"]+) design"/g)].map(
      (match) => match[1],
    );
    expect(shown).toEqual(PORTFOLIO_PICKS.map((id) => PORTFOLIO_TEMPLATE_INFO[id].name));
    for (const id of PORTFOLIO_PICKS) expect(html).toContain(`/portfolio-shots/${id}-`);
    expect(text(html)).toContain(`Pick one of ${PORTFOLIO_TEMPLATE_IDS.length} designs`);
  });

  it("describes what the app does today in What's inside", () => {
    const features = [
      text(renderToStaticMarkup(<FeaturesOverview />)),
      ...Object.values(FEATURES).map((feature) => feature.text),
    ].join(" ");
    expect(features).toContain(`in ${TEMPLATE_IDS.length} clean formats hiring software reads`);
    expect(features).toContain("Cover letters, outreach messages and answers");
    expect(features).toContain(
      "Open jobs in your line of work from company boards around the world",
    );
    expect(features).toContain(
      "Technical roles also get a technical round on your projects, core concepts and system design, and a practice mode.",
    );
    expect(features).not.toMatch(/every application|every job you apply/i);
  });

  it("says jobs are of the person's own kind of work, read for meaning, from boards worldwide", () => {
    const jobs = text(renderToStaticMarkup(<JobsShowcase jobCounts={JOB_COUNTS_FALLBACK} />));
    expect(jobs).toContain("shows only jobs in your line of work, best fit first");
    expect(jobs).toContain(
      "so a Software Engineer sees Backend Developer posts but not support or sales ones",
    );
    expect(jobs).toContain("and one switch hides them");
    expect(jobs).toContain("in the US, the UK, Australia, Latin America, Europe and more");
  });

  it("never advertises email tracking, the Chrome extension or email reminders", () => {
    const page = [
      <Hero key="hero" />,
      <HowItWorks key="how" />,
      <FeaturesOverview key="features" />,
      <JobsShowcase key="jobs" jobCounts={JOB_COUNTS_FALLBACK} />,
      <PortfolioShowcase key="portfolio" />,
      <WontDo key="wont" />,
      <PricingTeaser key="pricing" />,
      <Faq key="faq" />,
      <FinalCta key="cta" />,
    ]
      .map((section) => text(renderToStaticMarkup(section)))
      .join(" ");
    expect(page).not.toMatch(/track\w* (your )?email|forward|inbox|chrome|extension/i);
    expect(page).not.toMatch(/we('ll| will) email|by email|email (you|reminders?)/i);
  });
});
