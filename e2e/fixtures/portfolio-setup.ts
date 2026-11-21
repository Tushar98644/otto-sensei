import { expect, type APIResponse, type Page } from "@playwright/test";
import type { PortfolioSaveResponse, PortfolioTemplateId } from "@/lib/portfolio/types";
import type { Resume } from "@/lib/resume/schema";
import { sampleResume, seedResume, subscribe } from "../helpers";

export type PortfolioPerson = {
  resume: Resume;
  name: string;
  first: string;
  // The address the app suggests from the name.
  slug: string;
};

function letters(count: number): string {
  return Array.from({ length: count }, () =>
    String.fromCharCode(97 + Math.floor(Math.random() * 26)),
  ).join("");
}

export function uniqueSlug(label: string): string {
  return `${label}-${letters(8)}`;
}

// The sample resume under a name and title no other test uses, so addresses and headings never clash.
export function portfolioResume(title = "Portfolio resume"): PortfolioPerson {
  const last = letters(7);
  const name = `Robin ${last.charAt(0).toUpperCase()}${last.slice(1)}`;
  const base = sampleResume();
  return {
    resume: {
      ...base,
      title: `${title} ${letters(5)}`,
      basics: { ...base.basics, name },
    },
    name,
    first: "Robin",
    slug: `robin-${last}`,
  };
}

async function okJson<T>(response: APIResponse, what: string): Promise<T> {
  expect(response.ok(), `${what}: ${response.status()} ${await response.text()}`).toBe(true);
  return (await response.json()) as T;
}

// Portfolios come with Pro, so each owner starts the Pro trial and saves a resume first.
export async function proOwner(page: Page, title?: string): Promise<PortfolioPerson> {
  await subscribe(page, "pro", "month");
  const person = portfolioResume(title);
  await seedResume(page, person.resume);
  return person;
}

export async function createPortfolio(
  page: Page,
  resume: Resume,
  options: { slug?: string; template?: PortfolioTemplateId } = {},
): Promise<PortfolioSaveResponse["portfolio"]> {
  const { portfolio } = await okJson<PortfolioSaveResponse>(
    await page.request.post("/api/portfolio", { data: { resume, ...options } }),
    "make the portfolio",
  );
  return portfolio;
}

export async function publishPortfolio(page: Page): Promise<void> {
  await okJson(
    await page.request.patch("/api/portfolio", { data: { published: true } }),
    "publish the portfolio",
  );
}

// Keeps the first-run setup dialog and the dashboard tour from covering the resume cards.
export async function skipDashboardIntro(page: Page): Promise<void> {
  await okJson(
    await page.request.put("/api/setup", { data: { step: "skipped" } }),
    "skip the setup step",
  );
  await page.addInitScript(() => {
    window.localStorage.setItem("otto.tour.dashboard", new Date().toISOString());
  });
}

// Drops the session cookie, so the next page load is a signed-out visitor's.
export async function signOut(page: Page): Promise<void> {
  await page.context().clearCookies();
}
