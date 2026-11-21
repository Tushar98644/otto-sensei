import { readFile } from "node:fs/promises";
import type { Locator, Page } from "@playwright/test";
import type { CheckResponse } from "@/lib/api/types";
import { expect, test } from "./fixtures";
import { jsonResume, resumeDocx, scannedPdf, type ResumeFile } from "./fixtures/resume-files";
import { resumePdf, subscribe } from "./helpers";

const DROPZONE = "Upload your resume, a PDF or Word file";
// The first visit to each studio step compiles it under next dev.
const STEP_TIMEOUT = 45_000;

test.beforeEach(async ({ page }) => {
  // Otto's first-run tips can float over the studio at any time; a user would wave them off.
  const tip = page
    .getByRole("dialog")
    .filter({ has: page.getByRole("button", { name: /^(Skip tips|Got it)$/ }) });
  await page.addLocatorHandler(tip, async () => {
    const skip = tip.getByRole("button", { name: "Skip tips" });
    await ((await skip.isVisible()) ? skip : tip.getByRole("button", { name: "Got it" })).click();
  });
});

async function openStudio(page: Page) {
  await page.goto("/studio");
  await expect(page.getByRole("button", { name: DROPZONE })).toBeVisible({ timeout: STEP_TIMEOUT });
}

async function pickFile(page: Page, opener: Locator, file: ResumeFile) {
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), opener.click()]);
  await chooser.setFiles(file);
}

function uploadFile(page: Page, file: ResumeFile) {
  return pickFile(page, page.getByRole("button", { name: DROPZONE }), file);
}

// The imports sit behind the "Other ways to start" disclosure.
async function otherWayToStart(page: Page, name: string | RegExp): Promise<Locator> {
  const option = page.getByRole("button", { name, exact: true });
  if (!(await option.isVisible())) {
    await page.getByText("Other ways to start", { exact: true }).click();
  }
  await expect(option).toBeVisible();
  return option;
}

function section(page: Page, name: string): Locator {
  return page.getByRole("region", { name, exact: true });
}

function basicsToggle(page: Page): Locator {
  return section(page, "Name and contact").getByRole("button", { name: /^Name and contact/ });
}

async function openBasics(page: Page) {
  const toggle = basicsToggle(page);
  if ((await toggle.getAttribute("aria-expanded")) === "false") await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
}

function summaryBox(page: Page): Locator {
  return page.getByRole("textbox", { name: "Summary", exact: true });
}

// Below 1024 px the recruiter view puts the read text behind a tab.
async function readText(page: Page): Promise<Locator> {
  if ((page.viewportSize()?.width ?? 0) < 1024) {
    await page.getByRole("tab", { name: "What software reads" }).click();
  }
  return page.getByRole("region", { name: "Text pulled from your file" });
}

async function trySample(page: Page) {
  await page.getByRole("button", { name: /^Try a sample/ }).click();
  await expect(summaryBox(page)).toHaveValue(/^Results-driven product marketer/, {
    timeout: STEP_TIMEOUT,
  });
}

// Resolves once the account has a copy of the resume that includes `text`.
function savedToAccount(page: Page, text: string) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === "PUT" &&
      new URL(response.url()).pathname.startsWith("/api/resumes/") &&
      (response.request().postData() ?? "").includes(text),
    { timeout: 45_000 },
  );
}

function stamp(): string {
  return Math.random().toString(36).slice(2, 8);
}

test("a PDF upload shows what hiring software reads, then opens sorted in the editor @mobile", async ({
  page,
  user,
}) => {
  expect(user.plan).toBe("free");
  await openStudio(page);
  await uploadFile(page, await resumePdf());

  const next = page.getByRole("button", { name: "Next: Fix my lines" });
  await expect(next).toBeVisible({ timeout: STEP_TIMEOUT });
  await expect(page.getByText(/read 1 page, \d+ words/)).toBeVisible();
  await expect(page.getByRole("list", { name: "Check results" })).toContainText(
    /file checks? passed/,
  );
  const text = await readText(page);
  await expect(text).toContainText("Jane Doe");
  await expect(text).toContainText("Senior Software Engineer, Acme Corp");
  await expect(text).toContainText("Python, TypeScript, Go, PostgreSQL");

  await next.click();
  await expect(basicsToggle(page)).toContainText("Jane Doe", { timeout: STEP_TIMEOUT });
  await openBasics(page);
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue("jane.doe@example.com");
  await expect(summaryBox(page)).toHaveValue(/^Backend engineer with eight years/);
  const experience = section(page, "Experience");
  await expect(experience).toContainText("Acme Corp");
  await expect(experience).toContainText("Beta Labs");
  await expect(experience.getByRole("textbox").first()).toHaveValue(/payment API in Go/);
  await expect(section(page, "Education")).toContainText("University of Somewhere");
});

test("a Word upload is read the same way", async ({ page, user }) => {
  expect(user.plan).toBe("free");
  await openStudio(page);
  await uploadFile(page, await resumeDocx());

  const next = page.getByRole("button", { name: "Next: Fix my lines" });
  await expect(next).toBeVisible({ timeout: STEP_TIMEOUT });
  await expect(page.getByText(/^Word · 1 page · \d+ words$/)).toBeVisible();
  const text = await readText(page);
  await expect(text).toContainText("Morgan Lee");
  await expect(text).toContainText("Data Analyst, Northwind Traders");

  await next.click();
  await expect(basicsToggle(page)).toContainText("Morgan Lee", { timeout: STEP_TIMEOUT });
  await expect(section(page, "Experience")).toContainText("Northwind Traders");
  await expect(summaryBox(page)).toHaveValue(/turning messy sales data into clear weekly reports/);
});

test("a JSON Resume import opens straight in the editor", async ({ page, user }) => {
  expect(user.plan).toBe("free");
  await openStudio(page);
  await pickFile(page, await otherWayToStart(page, /^Import a JSON Resume/), jsonResume());

  await expect(basicsToggle(page)).toContainText("Riley Chen", { timeout: STEP_TIMEOUT });
  await expect(summaryBox(page)).toHaveValue(
    "Frontend engineer who builds fast, accessible checkout flows.",
  );
  const experience = section(page, "Experience");
  await expect(experience).toContainText("Fabrikam");
  await expect(experience.getByRole("textbox").first()).toHaveValue(/lifting completed orders/);
  await expect(section(page, "Skills")).toBeVisible();
});

async function uploadScan(page: Page) {
  await openStudio(page);
  await uploadFile(page, await scannedPdf());
  await expect(
    page.getByText(/This PDF is only a picture, so hiring software sees a blank page/),
  ).toBeVisible({ timeout: STEP_TIMEOUT });
}

test("a PDF with no text reads as a blank page", async ({ page, user }) => {
  expect(user.plan).toBe("free");
  await uploadScan(page);
  await expect(page.getByRole("list", { name: "Check results" })).toContainText("1 problem");
  await readText(page);
  await expect(
    page.getByText("Nothing at all. To hiring software, this file is a blank page."),
  ).toBeVisible();
});

// Product bug: the blank resume from the scan fills Free's one-resume slot, so "Start from scratch" opens the plan picker.
test.fixme("a Free user can start from scratch after a PDF with no text", async ({
  page,
  user,
}) => {
  expect(user.plan).toBe("free");
  await uploadScan(page);
  await page.getByRole("button", { name: "Start from scratch", exact: true }).click();
  await expect(page.getByLabel("Full name")).toHaveValue("", { timeout: STEP_TIMEOUT });
});

test("a file that isn't PDF or Word is turned away with the reason", async ({ page }) => {
  await openStudio(page);
  await uploadFile(page, {
    name: "resume.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Jane Doe\nSenior Software Engineer\n"),
  });
  await expect(
    page.getByText(/That file type isn't supported\. Choose a PDF or DOCX file/),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: DROPZONE })).toBeEnabled();
});

test("a Pro read that went well offers an AI re-read, and keeps the resume when AI is off", async ({
  page,
  user,
}) => {
  expect(user.plan).toBe("free");
  await subscribe(page, "pro");
  await openStudio(page);
  await uploadFile(page, await resumePdf());

  await expect(page.getByText(/Sorted in a second, no AI read used/)).toBeVisible({
    timeout: STEP_TIMEOUT,
  });
  await page.getByRole("button", { name: "Let Otto re-read it" }).click();
  await expect(page.getByText("Otto couldn't re-read it this time")).toBeVisible();
  await page.getByRole("button", { name: "Next: Fix my lines" }).click();
  await expect(basicsToggle(page)).toContainText("Jane Doe", { timeout: STEP_TIMEOUT });
});

test("an edit in the editor survives a reload and reaches the account", async ({ page, user }) => {
  expect(user.plan).toBe("free");
  await openStudio(page);
  await trySample(page);

  const summary = `Product marketer who turns launches into revenue, ref ${stamp()}.`;
  const name = "Avery Quinlan";
  await openBasics(page);
  await page.getByLabel("Full name").fill(name);
  const saved = savedToAccount(page, summary);
  await summaryBox(page).fill(summary);
  expect((await saved).ok()).toBe(true);

  await page.reload();
  await expect(summaryBox(page)).toHaveValue(summary, { timeout: STEP_TIMEOUT });
  await expect(basicsToggle(page)).toContainText(name);

  // Same account with empty browser storage, as on another device: the copy comes from the account.
  await page.goto("/api/health");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await openStudio(page);
  const recent = page.getByRole("region", { name: "Pick up where you left off" });
  await recent.getByRole("button", { name: /Sample resume/ }).click();
  await expect(summaryBox(page)).toHaveValue(summary, { timeout: STEP_TIMEOUT });
  await expect(basicsToggle(page)).toContainText(name);
});

test("the download step hands over a PDF of the edited resume", async ({ page, user }) => {
  expect(user.plan).toBe("free");
  await openStudio(page);
  await trySample(page);

  const name = `Avery Quinlan ${stamp().toUpperCase()}`;
  await openBasics(page);
  await page.getByLabel("Full name").fill(name);
  await page.getByRole("button", { name: "Skip to download" }).click();

  const link = page.getByRole("link", { name: "Download PDF, free" });
  await expect(link).toBeVisible({ timeout: STEP_TIMEOUT });
  const [download] = await Promise.all([page.waitForEvent("download"), link.click()]);
  expect(download.suggestedFilename()).toBe(`${name.replaceAll(" ", "-")}-Resume.pdf`);
  const pdf = await readFile(await download.path());
  expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");

  // The file itself, read the way hiring software reads it.
  const response = await page.request.post("/api/check", {
    multipart: {
      file: { name: download.suggestedFilename(), mimeType: "application/pdf", buffer: pdf },
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const { report } = (await response.json()) as CheckResponse;
  expect(report.pageCount).toBe(1);
  expect(report.readText).toContain(name);
  expect(report.readText).toContain("Brightloop");

  // The page runs the same check on its own once the PDF settles, with no click.
  await expect(page.getByRole("region", { name: "What hiring software reads" })).toContainText(
    /Hiring software reads every line\. All \d+ checks passed/,
    { timeout: STEP_TIMEOUT },
  );
});
