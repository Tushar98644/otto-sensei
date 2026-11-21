import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

type PublicPage = { name: string; path: string; heading: string | RegExp };

const HOME: PublicPage = {
  name: "home",
  path: "/",
  heading: /^See your resume the way recruiters do\.$/,
};
const PRICING: PublicPage = {
  name: "pricing",
  path: "/pricing",
  heading: /^Free for the basics\. More when the hunt gets busy\.$/,
};
const TERMS: PublicPage = { name: "terms", path: "/terms", heading: "Terms of service" };
const PRIVACY: PublicPage = { name: "privacy", path: "/privacy", heading: "Privacy policy" };
const REFUNDS: PublicPage = { name: "refunds", path: "/refunds", heading: "Refund policy" };
const ACCEPTABLE_USE: PublicPage = {
  name: "acceptable use",
  path: "/acceptable-use",
  heading: "Acceptable use policy",
};
const TEMPLATES: PublicPage = {
  name: "resume templates",
  path: "/resume-templates",
  heading: /^\d+ resume formats, each one column of real text\.$/,
};
const ATS_INDEX: PublicPage = {
  name: "ATS guides",
  path: "/ats",
  heading: "How hiring software reads your resume",
};
const ATS_GUIDE: PublicPage = {
  name: "Workday ATS guide",
  path: "/ats/workday",
  heading: "How Workday reads your resume",
};
const COMPARE_INDEX: PublicPage = {
  name: "comparisons",
  path: "/compare",
  heading: "How Otto Sensei compares",
};
const COMPARISON: PublicPage = {
  name: "Jobscan comparison",
  path: "/compare/jobscan",
  heading: "Otto Sensei vs Jobscan",
};
const JOB_MATCH: PublicPage = {
  name: "job match check",
  path: "/job-match",
  heading: "Does your resume match this job?",
};

const PUBLIC_PAGES: readonly PublicPage[] = [
  HOME,
  PRICING,
  TERMS,
  PRIVACY,
  REFUNDS,
  ACCEPTABLE_USE,
  TEMPLATES,
  ATS_INDEX,
  ATS_GUIDE,
  COMPARE_INDEX,
  COMPARISON,
  JOB_MATCH,
];

const FOOTER_LINKS: readonly { label: string; page: PublicPage }[] = [
  { label: "Job match check", page: JOB_MATCH },
  { label: "Pricing", page: PRICING },
  { label: "Resume templates", page: TEMPLATES },
  { label: "ATS guides", page: ATS_INDEX },
  { label: "Comparisons", page: COMPARE_INDEX },
  { label: "Privacy", page: PRIVACY },
  { label: "Terms", page: TERMS },
  { label: "Refunds", page: REFUNDS },
  { label: "Acceptable use", page: ACCEPTABLE_USE },
];

const PHONE = { width: 390, height: 844 };

// Console errors, uncaught errors, failed requests and error responses the page runs into.
function watchForProblems(page: Page, { navigates = false } = {}): string[] {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`console error: ${message.text()}`);
  });
  page.on("pageerror", (error) => problems.push(`uncaught error: ${error.message}`));
  page.on("requestfailed", (request) => {
    const reason = request.failure()?.errorText ?? "unknown";
    // Leaving a page cancels what it was still fetching; nothing went wrong.
    if (navigates && reason === "net::ERR_ABORTED") return;
    problems.push(`failed request: ${request.method()} ${request.url()} (${reason})`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      problems.push(`HTTP ${response.status()}: ${response.request().method()} ${response.url()}`);
    }
  });
  return problems;
}

function pageHeading(page: Page, { heading }: PublicPage) {
  return page.getByRole("heading", { level: 1, name: heading });
}

async function expectOn(page: Page, target: PublicPage) {
  await expect(page).toHaveURL((url) => url.pathname === target.path);
  await expect(pageHeading(page, target)).toBeVisible();
}

function header(page: Page) {
  return page.getByRole("banner");
}

function mainNav(page: Page) {
  return page.getByRole("navigation", { name: "Main" });
}

function footerNav(page: Page) {
  return page.getByRole("contentinfo").getByRole("navigation", { name: "Footer" });
}

function sectionHeading(page: Page, name: string | RegExp) {
  return page.getByRole("heading", { level: 2, name });
}

const HOW_IT_WORKS = "From old file to clean PDF";
const JOBS_SECTION = /^(\d[\d,+]* )?open jobs, ranked for your resume$/i;

// A screen at a time, so every lazy image on the way starts loading.
async function scrollToEnd(page: Page) {
  await page.evaluate(async () => {
    const nextFrame = () =>
      new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    let last = -1;
    while (window.scrollY !== last) {
      last = window.scrollY;
      window.scrollBy({ top: window.innerHeight, behavior: "instant" });
      await nextFrame();
    }
  });
}

// How far the page reaches past the screen's right edge, and the outermost elements that stick out.
async function sidewaysOverflow(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate(() => {
    const root = document.documentElement;
    const width = root.clientWidth;
    const clipsX = (element: Element) => {
      const { overflowX } = getComputedStyle(element);
      return overflowX !== "visible";
    };
    const culprits: string[] = [];
    for (const element of document.body.querySelectorAll("*")) {
      if (element.getBoundingClientRect().right <= width + 0.5) continue;
      let parent = element.parentElement;
      let shown = true;
      while (parent && parent !== document.body) {
        if (clipsX(parent) || parent.getBoundingClientRect().right > width + 0.5) {
          shown = false;
          break;
        }
        parent = parent.parentElement;
      }
      if (shown) {
        const label = element.id ? `#${element.id}` : (element.getAttribute("class") ?? "");
        culprits.push(`<${element.tagName.toLowerCase()}> ${label.slice(0, 100)}`);
      }
    }
    return { extra: root.scrollWidth - width, culprits: culprits.slice(0, 5) };
  });
}

test.describe("each public page loads cleanly", () => {
  for (const target of PUBLIC_PAGES) {
    test(`the ${target.name} page loads with no console errors or failed requests`, async ({
      page,
    }) => {
      const problems = watchForProblems(page);
      await page.goto(target.path);
      await expect(pageHeading(page, target)).toBeVisible();
      await expect(header(page).getByRole("link", { name: "Otto Sensei" })).toBeVisible();
      await scrollToEnd(page);
      await expect(page.getByRole("contentinfo")).toBeInViewport();
      await page.waitForLoadState("networkidle");
      expect(problems, `problems on ${target.path}`).toEqual([]);
    });
  }
});

test.describe("navigation", () => {
  test("the main navigation reaches each section of the home page and each page", async ({
    page,
  }) => {
    const problems = watchForProblems(page, { navigates: true });
    await page.goto(TERMS.path);
    await expect(pageHeading(page, TERMS)).toBeVisible();
    await expect(mainNav(page).getByRole("link")).toHaveText(["How it works", "Jobs", "Pricing"]);

    await mainNav(page).getByRole("link", { name: "Pricing", exact: true }).click();
    await expectOn(page, PRICING);

    await mainNav(page).getByRole("link", { name: "How it works", exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/" && url.hash === "#how");
    await expect(sectionHeading(page, HOW_IT_WORKS)).toBeInViewport();

    await mainNav(page).getByRole("link", { name: "Jobs", exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/" && url.hash === "#jobs");
    await expect(sectionHeading(page, JOBS_SECTION)).toBeInViewport();

    await header(page).getByRole("link", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/login");
    await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();

    await header(page).getByRole("link", { name: "Otto Sensei" }).click();
    await expectOn(page, HOME);
    expect(problems).toEqual([]);
  });

  test("the header's Check my resume opens the studio", async ({ page }) => {
    const problems = watchForProblems(page, { navigates: true });
    await page.goto(PRICING.path);
    await expect(pageHeading(page, PRICING)).toBeVisible();
    await header(page).getByRole("link", { name: "Check my resume" }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/studio");
    await expect(
      page.getByRole("button", { name: "Upload your resume, a PDF or Word file" }),
    ).toBeVisible({ timeout: 45_000 });
    expect(problems).toEqual([]);
  });

  test("every footer link opens its page", async ({ page }) => {
    const problems = watchForProblems(page, { navigates: true });
    await page.goto(HOME.path);
    await expect(pageHeading(page, HOME)).toBeVisible();
    await expect(footerNav(page).getByRole("link")).toHaveText(
      FOOTER_LINKS.map(({ label }) => label),
    );
    for (const { label, page: target } of FOOTER_LINKS) {
      await footerNav(page).getByRole("link", { name: label, exact: true }).click();
      await expectOn(page, target);
    }
    expect(problems).toEqual([]);
  });

  test("the guide and comparison lists open each page and lead back", async ({ page }) => {
    const problems = watchForProblems(page, { navigates: true });
    await page.goto(ATS_INDEX.path);
    const guides = page.getByRole("region", { name: "Hiring systems" }).getByRole("link");
    await expect(guides.first()).toBeVisible();
    for (const href of await guides.evaluateAll((links) =>
      links.map((link) => link.getAttribute("href") ?? ""),
    )) {
      expect(href).toMatch(/^\/ats\/[a-z]+$/);
      expect((await page.request.get(href)).status(), href).toBe(200);
    }
    await guides.filter({ hasText: /^Workday/ }).click();
    await expectOn(page, ATS_GUIDE);
    await page
      .getByRole("navigation", { name: "Breadcrumb" })
      .getByRole("link", { name: "ATS guides" })
      .click();
    await expectOn(page, ATS_INDEX);

    await page.goto(COMPARE_INDEX.path);
    const comparisons = page.getByRole("region", { name: "Comparisons" }).getByRole("link");
    await expect(comparisons.first()).toBeVisible();
    for (const href of await comparisons.evaluateAll((links) =>
      links.map((link) => link.getAttribute("href") ?? ""),
    )) {
      expect(href).toMatch(/^\/compare\/[a-z]+$/);
      expect((await page.request.get(href)).status(), href).toBe(200);
    }
    await comparisons.filter({ hasText: /^Otto Sensei vs Jobscan/ }).click();
    await expectOn(page, COMPARISON);
    await page
      .getByRole("region", { name: "The short answer" })
      .getByRole("link", { name: "Run the free match check" })
      .click();
    await expectOn(page, JOB_MATCH);
    expect(problems).toEqual([]);
  });

  test("signed in, the header offers the dashboard instead of the sales links", async ({
    page,
    user,
  }) => {
    expect(user.plan).toBe("free");
    const problems = watchForProblems(page, { navigates: true });
    await page.goto(TEMPLATES.path);
    await expect(pageHeading(page, TEMPLATES)).toBeVisible();
    const dashboard = header(page).getByRole("link", { name: "Dashboard", exact: true });
    await expect(dashboard).toBeVisible();
    await expect(mainNav(page)).toHaveCount(0);
    await expect(header(page).getByRole("link", { name: "Sign in", exact: true })).toHaveCount(0);
    await expect(footerNav(page).getByRole("link")).toHaveCount(FOOTER_LINKS.length);

    await dashboard.click();
    await expect(page).toHaveURL((url) => url.pathname === "/dashboard");

    // Home is the signed-out sales page, so the logo takes a signed-in visitor to the dashboard.
    await page.goto(PRICING.path);
    await expect(header(page).getByRole("link", { name: "Dashboard", exact: true })).toBeVisible();
    await header(page).getByRole("link", { name: "Otto Sensei" }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/dashboard");
    expect(problems).toEqual([]);
  });
});

test.describe("on a 390px phone", () => {
  test.use({ viewport: PHONE });

  for (const target of PUBLIC_PAGES) {
    test(`the ${target.name} page has no sideways scroll @mobile`, async ({ page }) => {
      await page.goto(target.path);
      await expect(pageHeading(page, target)).toBeVisible();
      await expect(page.getByRole("button", { name: "Menu" })).toBeVisible();
      // Measured once the page has hydrated and its images are in.
      await page.waitForLoadState("networkidle");
      const { extra, culprits } = await sidewaysOverflow(page);
      expect(extra, `${target.path} is wider than the screen: ${culprits.join(", ")}`).toBe(0);
      const scrolledX = await page.evaluate(() => {
        window.scrollTo({ left: 400, behavior: "instant" });
        return window.scrollX;
      });
      expect(scrolledX, `${target.path} scrolls sideways`).toBe(0);
    });
  }

  test("the menu opens, navigates and closes @mobile", async ({ page }) => {
    const problems = watchForProblems(page, { navigates: true });
    await page.goto(PRIVACY.path);
    await expect(pageHeading(page, PRIVACY)).toBeVisible();
    await expect(mainNav(page)).toBeHidden();
    const menu = page.getByRole("button", { name: "Menu" });
    // The menu button only toggles once the page has hydrated.
    await page.waitForLoadState("networkidle");

    await menu.click();
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    await expect(mainNav(page).getByRole("link")).toHaveText([
      "How it works",
      "Jobs",
      "Pricing",
      "Sign in",
    ]);
    await mainNav(page).getByRole("link", { name: "Pricing", exact: true }).click();
    await expectOn(page, PRICING);
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await expect(mainNav(page)).toBeHidden();

    await menu.click();
    await mainNav(page).getByRole("link", { name: "How it works", exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/" && url.hash === "#how");
    await expect(sectionHeading(page, HOW_IT_WORKS)).toBeInViewport();
    await expect(mainNav(page)).toBeHidden();

    // A link to a section of the page already open doesn't navigate, so the menu has to close itself.
    await menu.click();
    await mainNav(page).getByRole("link", { name: "Jobs", exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/" && url.hash === "#jobs");
    await expect(sectionHeading(page, JOBS_SECTION)).toBeInViewport();
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await expect(mainNav(page)).toBeHidden();

    await menu.click();
    await mainNav(page).getByRole("link", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/login");
    await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
    expect(problems).toEqual([]);
  });
});
