import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { usePathname } from "next/navigation";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HeaderActions } from "@/components/site/account-link";
import { HERO_CTA_ID } from "@/components/site/hero-cta-in-view";
import { applicationLimit, PLAN_ORDER, PLANS, resumeLimit } from "@/config/plans";
import { trialOffered } from "@/lib/billing/intervals";
import { extensionAccess } from "@/lib/extension/plan";
import { JOB_COUNTS_FALLBACK } from "@/lib/job-feed/counts";
import { PORTFOLIO_PICKS, PORTFOLIO_TEMPLATE_INFO } from "@/lib/portfolio/templates";
import { PORTFOLIO_TEMPLATE_IDS } from "@/lib/portfolio/types";
import { suggestedFileName } from "@/lib/resume/ops";
import { CAREER_LOG_ROUTE } from "@/lib/career-log/links";
import { createSampleResume } from "@/lib/resume/sample";
import { TEMPLATE_IDS } from "@/lib/resume/schema";
import { EmailTrackingShowcase } from "./email-tracking-showcase";
import { ExtensionShowcase } from "./extension-showcase";
import { Faq } from "./faq";
import { FEATURES, FeaturesOverview } from "./features-overview";
import { FEATURE_PREVIEWS } from "./features-previews";
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
const extensionStore = vi.hoisted(() => ({ url: null as string | null }));
vi.mock("@/lib/extension/store", () => ({
  get CHROME_STORE_URL() {
    return extensionStore.url;
  },
}));

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

const realStore =
  await vi.importActual<typeof import("@/lib/extension/store")>("@/lib/extension/store");

beforeEach(() => {
  vi.mocked(usePathname).mockReturnValue("/");
  vi.mocked(trialOffered).mockReturnValue(true);
  extensionStore.url = realStore.CHROME_STORE_URL;
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
    expect(text(html)).toContain("Try 7 days for $1.");
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

  it("lists the career log in What's inside, free on every plan, with its preview", () => {
    const html = renderToStaticMarkup(<FeaturesOverview />);
    expect(text(html)).toContain("Career log");
    expect(FEATURES[CAREER_LOG_ROUTE]?.text).toBe(
      "A one-minute note on your work each month, free on every plan, so your next resume starts from facts. On Pro, Otto turns the notes into resume lines with your own numbers.",
    );
    expect(FEATURE_PREVIEWS[CAREER_LOG_ROUTE]).toBeTypeOf("function");
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

  it("never advertises email reminders, and Otto for Chrome only as coming soon until it's in the store", () => {
    const hero = text(renderToStaticMarkup(<Hero jobCounts={JOB_COUNTS_FALLBACK} />));
    const others = [
      <HowItWorks key="how" />,
      <FeaturesOverview key="features" />,
      <JobsShowcase key="jobs" jobCounts={JOB_COUNTS_FALLBACK} />,
      <EmailTrackingShowcase key="email" />,
      <PortfolioShowcase key="portfolio" />,
      <WontDo key="wont" />,
      <PricingTeaser key="pricing" />,
      <Faq key="faq" />,
      <FinalCta key="cta" />,
    ]
      .map((section) => text(renderToStaticMarkup(section)))
      .join(" ");
    expect(others).not.toMatch(/chrome|extension/i);
    const extension = text(renderToStaticMarkup(<ExtensionShowcase />));
    const comingSoon = realStore.CHROME_STORE_URL === null;
    expect(/coming soon/i.test(extension)).toBe(comingSoon);
    expect(/add to chrome/i.test(extension)).toBe(!comingSoon);
    expect(hero).toMatch(/chrome extension/i);
    expect(/chrome extension, soon/i.test(hero)).toBe(comingSoon);
    const page = `${hero} ${others} ${extension}`;
    expect(page).not.toMatch(/we('ll| will) email|by email|email (you|reminders?)/i);
  });
});

const STORE_URL =
  "https://chromewebstore.google.com/detail/otto-for-chrome/abcdefghijklmnopabcdefghijklmnop";
const plansWith = (tool: "tailor" | "fill") =>
  new Intl.ListFormat("en-US", { type: "conjunction" }).format(
    PLAN_ORDER.filter((plan) => extensionAccess(plan)[tool]).map((plan) => PLANS[plan].name),
  );

describe("Otto for Chrome on the home page", () => {
  it("sits after the Jobs section and email tracking, before the portfolio", () => {
    const page = readFileSync(fileURLToPath(new URL("../page.tsx", import.meta.url)), "utf8");
    expect(page).toMatch(
      /<JobsShowcase [^>]*\/>\s*<EmailTrackingShowcase \/>\s*<ExtensionShowcase \/>\s*<PortfolioShowcase \/>/,
    );
  });

  it("says what it does, with the plans for each tool taken from its own rules", () => {
    const html = renderToStaticMarkup(<ExtensionShowcase />);
    const copy = text(html);
    expect(html).toContain('aria-labelledby="extension-showcase-title"');
    expect(html).toMatch(
      /<h2 id="extension-showcase-title"[^>]*>Apply faster, right from the job post<\/h2>/,
    );
    expect(html.match(/<h3 /g)).toHaveLength(4);
    expect(copy).toContain(
      "See how well you match before you read the whole post, save it to your board in one click, and let Otto fill long application forms from your resume. You check every answer and press Submit.",
    );
    expect(copy).toContain(
      "On LinkedIn, Naukri and company career pages, Otto's badge shows which of the post's skills your resume has and which it's missing. The check runs in your browser and never sends the post anywhere.",
    );
    expect(copy).toContain(
      "Save puts the job in To apply on your Applications board, with a copy of the post in case it's taken down.",
    );
    expect(plansWith("tailor")).toBe("Pro and Max");
    expect(copy).toContain(
      `On ${plansWith("tailor")}, Tailor opens Otto with your resume tailored to that job, and Letter with a cover letter for it.`,
    );
    expect(copy).toContain(
      `On ${plansWith("fill")}, Otto fills Greenhouse, Lever, Ashby and Workday forms from your resume and saved answers. You check it and press Submit. Otto never fills self-identification or consent questions.`,
    );
    expect([...html.matchAll(/role="img" aria-label="([^"]+)"/g)].map((match) => match[1])).toEqual(
      [
        "Example: Otto&#x27;s badge in the corner of a Senior Product Designer post, with 3 of 4 skills found and accessibility missing.",
        "Example: Fill with Otto on Northwind&#x27;s application form, with 6 fields filled, the resume attached, a drafted answer to &quot;Why Northwind?&quot; and the gender question left blank for you.",
      ],
    );
    expect(copy).toContain("On the job post");
    expect(copy).toContain("On the application form");
  });

  it("draws Fill with Otto as the extension does it, with the sample person and the panel's own words", () => {
    const html = renderToStaticMarkup(<ExtensionShowcase />);
    const copy = text(html).replace(/ \./g, ".");
    const sample = createSampleResume();
    const [first, last] = sample.basics.name.split(" ");
    for (const value of [first, last, sample.basics.email, sample.experience[0]?.company]) {
      expect(copy).toContain(`${value}`);
    }
    expect(copy).toContain(sample.basics.links[0]?.url ?? "missing link");
    const file = suggestedFileName(sample);
    expect(copy).toContain(`Resume/CV ${file}`);
    expect(copy).toContain("Why Northwind? Draft with Otto");
    expect(copy).toContain("Gender Select…");
    expect(copy).toContain("Submit application");
    // Six filled fields and the attached file are tinted; the self-identification question isn't.
    expect(html.match(/bg-lavender\/50/g)).toHaveLength(7);
    expect(html).not.toMatch(/bg-lavender\/50[^>]*>Select…/);
    expect(copy).toContain(`Otto · Greenhouse Filled 6 fields and attached ${file}.`);
    expect(copy).toContain(
      "Left for you: 1 self-identification or consent question. Otto never answers those.",
    );
    expect(copy).toContain(
      "Check every answer, then press Submit yourself. Otto never sends a form.",
    );
  });

  it("says it's coming soon, with no install button or store link, while the store listing isn't set", () => {
    extensionStore.url = null;
    const html = renderToStaticMarkup(<ExtensionShowcase />);
    const copy = text(html);
    expect(copy).toContain("Otto for Chrome · coming soon");
    expect(copy).toContain("Coming soon Not in the Chrome Web Store yet.");
    expect(copy).not.toMatch(/add to chrome|install/i);
    expect(html).not.toContain("<a ");
    expect(html).not.toMatch(/chromewebstore|chrome\.google\.com/);
  });

  it("offers Add to Chrome, linking to the store, once the listing is set", () => {
    extensionStore.url = STORE_URL;
    const html = renderToStaticMarkup(<ExtensionShowcase />);
    const copy = text(html);
    expect(html).toContain(`href="${STORE_URL}" target="_blank" rel="noopener noreferrer"`);
    expect(copy).toContain("Add to Chrome (opens in a new tab)");
    expect(copy).not.toMatch(/coming soon|Chrome Web Store yet/i);
    expect(html.match(/<a /g)).toHaveLength(1);
  });
});
