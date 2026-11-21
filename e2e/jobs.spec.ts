import type { Locator, Page } from "@playwright/test";
import type { Application, ApplicationResponse } from "@/lib/api/types";
import { expect, test } from "./fixtures";
import { FEED_JOBS, fakeJobFeed } from "./fixtures/jobs-feed";
import { sampleResume, seedResume, signIn, subscribe } from "./helpers";

const DAY_MS = 24 * 60 * 60 * 1000;
// A page's first visit compiles it and the routes it calls, which can take a while on a cold build.
const FIRST_LOAD = { timeout: 45_000 };

const sameYear = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const otherYear = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

// Dates as the tracker writes them: "Nov 28", with the year only when it isn't the current one.
function day(at: number, now = Date.now()): string {
  const format = new Date(at).getFullYear() === new Date(now).getFullYear() ? sameYear : otherYear;
  return format.format(at);
}

function dateInput(at: number): string {
  const date = new Date(at);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// A new account that has already passed the first-run "What are you looking for?" step.
async function signedIn(page: Page): Promise<void> {
  await signIn(page);
  const response = await page.request.put("/api/setup", { data: { step: "skipped" } });
  expect(response.ok(), await response.text()).toBe(true);
}

async function withResume(page: Page): Promise<string> {
  const title = `Marketing resume ${Math.random().toString(36).slice(2, 7)}`;
  await seedResume(page, { ...sampleResume(), title });
  return title;
}

async function logApplication(page: Page, company: string, role: string): Promise<Application> {
  const response = await page.request.post("/api/applications", {
    data: { company, role, appliedAt: Date.now(), status: "applied" },
  });
  expect(response.status(), await response.text()).toBe(201);
  return ((await response.json()) as ApplicationResponse).application;
}

function jobCard(page: Page, title: string): Locator {
  return page.getByRole("article", { name: title, exact: true });
}

function toasts(page: Page): Locator {
  return page.getByRole("region", { name: "Notifications" });
}

function column(page: Page, name: string): Locator {
  return page.getByRole("region", { name, exact: true });
}

function listRow(page: Page, company: string): Locator {
  return page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: company, exact: true }) });
}

async function showList(page: Page): Promise<void> {
  const view = page.getByRole("group", { name: "View" });
  await view.getByRole("button", { name: "List" }).click();
  await expect(view.getByRole("button", { name: "List" })).toHaveAttribute("aria-pressed", "true");
}

// The button flips at once; the save itself is waited for, so leaving the page can't cut it off.
async function saveJob(page: Page, card: Locator, options?: { timeout: number }): Promise<void> {
  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === "PUT" && response.url().includes("/api/jobs/saved/"),
  );
  await card.getByRole("button", { name: "Save", exact: true }).click(options);
  expect((await saved).ok()).toBe(true);
}

// Runs the action and waits for the tracker write it starts, so a reload right after can't cut the write off.
async function andSaved(page: Page, act: () => Promise<unknown>): Promise<void> {
  const answered = page.waitForResponse(
    (response) =>
      ["POST", "PATCH"].includes(response.request().method()) &&
      new URL(response.url()).pathname.startsWith("/api/applications"),
  );
  await act();
  const response = await answered;
  expect(response.ok(), `${response.request().method()} ${response.url()}`).toBe(true);
}

function upgradeDialog(page: Page, line: RegExp): Locator {
  return page.getByRole("dialog").filter({ hasText: line });
}

const TRACKER_LIMIT = /Free tracks 1 application\. Pro tracks every one\./;
// Chrome puts a space before the link's visually hidden ": open this application".
const APPLIED_LINK = /^Applied ?: open this application$/;
// On Free the Save button carries a quiet Pro mark, read out as ", comes with Pro".
const FREE_SAVE = /^Save ?, comes with Pro$/;

// A background refresh can still be inside the fake feed's handler when a test ends.
test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test.describe("Jobs tab", () => {
  test("with no resume yet, Jobs asks for one first", async ({ page }) => {
    await signedIn(page);
    await page.goto("/dashboard/jobs");
    await expect(page.getByRole("heading", { level: 1, name: "Jobs" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Jobs that fit your resume will show up here" }),
    ).toBeVisible(FIRST_LOAD);
    await expect(page.getByText("Add a resume and I'll find open jobs that fit it.")).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(0);
  });

  test("with a resume and nothing read from the boards yet, Jobs says so", async ({ page }) => {
    await signedIn(page);
    await withResume(page);
    await page.goto("/dashboard/jobs");
    await expect(page.getByText("No jobs here yet. The boards are read once a day.")).toBeVisible(
      FIRST_LOAD,
    );
    await expect(page.getByText(/· 0 open jobs$/)).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(0);
  });

  test("Free sees its closest five matches, and saving one offers Pro", async ({ page }) => {
    await signedIn(page);
    await withResume(page);
    await fakeJobFeed(page);
    await page.goto("/dashboard/jobs");

    await expect(page.getByText("I found 7 matching jobs. Here are the closest 5.")).toBeVisible(
      FIRST_LOAD,
    );
    await expect(page.getByText(/1,250 open jobs · checked 2 hours ago/)).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(5);
    for (const job of FEED_JOBS.slice(0, 5)) await expect(jobCard(page, job.title)).toBeVisible();
    for (const job of FEED_JOBS.slice(5)) await expect(jobCard(page, job.title)).toHaveCount(0);

    const top = FEED_JOBS[0]!;
    const card = jobCard(page, top.title);
    await expect(card.getByText(top.company, { exact: true })).toBeVisible();
    await expect(card.getByText("via Greenhouse")).toBeVisible();
    await expect(card.getByText("Strong match")).toBeVisible();
    await expect(card.getByText(top.match.reason)).toBeVisible();
    await expect(card.getByRole("link", { name: /Open job/ })).toHaveAttribute("href", top.url);

    await expect(page.getByRole("heading", { name: "Your top 5 of 7 matches" })).toBeVisible();
    await expect(page.getByText(/^Pro shows every match from 1,000\+ open jobs/)).toBeVisible();
    await expect(page.getByRole("group", { name: "Show" })).toHaveCount(0);

    const save = card.getByRole("button", { name: FREE_SAVE });
    await save.click();
    const upgrade = upgradeDialog(page, /Filters, saved jobs and every match come with Pro\./);
    await expect(upgrade).toBeVisible();
    await upgrade.getByRole("button", { name: "Not now" }).click();
    await expect(upgrade).toBeHidden();
    await expect(save).toHaveAttribute("aria-pressed", "false");
  });

  test("Pro saves a job, finds it under Saved, and removes it again", async ({ page }) => {
    await signedIn(page);
    await withResume(page);
    await subscribe(page, "pro", "month");
    await fakeJobFeed(page);
    await page.goto("/dashboard/jobs");

    await expect(
      page.getByText("I found 7 jobs that match your resume. 2 look strong."),
    ).toBeVisible(FIRST_LOAD);
    await expect(page.getByRole("article")).toHaveCount(7);

    const show = page.getByRole("group", { name: "Show" });
    const savedView = show.getByRole("button", { name: /^Saved/ });
    await expect(show.getByRole("button", { name: "Best matches" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(savedView).toHaveText(/Saved\s*0/);

    const job = FEED_JOBS[2]!;
    const card = jobCard(page, job.title);
    await saveJob(page, card);
    await expect(card.getByRole("button", { name: "Saved", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(savedView).toHaveText(/Saved\s*1/);

    await savedView.click();
    await expect(savedView).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("1 saved job. Closed ones stay here for 30 days.")).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(1);
    await expect(card).toBeVisible();

    const removed = page.waitForResponse(
      (response) =>
        response.request().method() === "DELETE" && response.url().includes("/api/jobs/saved/"),
    );
    await card.getByRole("button", { name: "Saved", exact: true }).click();
    await expect(page.getByRole("article")).toHaveCount(0);
    await expect(
      page.getByText("Nothing saved yet. Save a job and it waits for you here."),
    ).toBeVisible();
    await expect(savedView).toHaveText(/Saved\s*0/);
    expect((await removed).ok()).toBe(true);
  });

  test("a saved job waits under To apply until it moves to Applied", async ({ page }) => {
    await signedIn(page);
    await withResume(page);
    await subscribe(page, "pro", "month");
    await fakeJobFeed(page);
    const job = FEED_JOBS[1]!;

    await page.goto("/dashboard/jobs");
    const card = jobCard(page, job.title);
    await saveJob(page, card, FIRST_LOAD);
    await expect(card.getByRole("button", { name: "Saved", exact: true })).toBeVisible();

    await page.goto("/dashboard/applications");
    const toApply = column(page, "To apply");
    const waiting = toApply.getByRole("article", { name: job.title });
    await expect(waiting).toBeVisible(FIRST_LOAD);
    await expect(waiting.getByText(job.company)).toBeVisible();

    await andSaved(page, () => waiting.getByRole("button", { name: "Move on to Applied" }).click());
    await expect(toasts(page)).toContainText(`Marked as applied at ${job.company}`);
    const applied = column(page, "Applied");
    await expect(applied.getByRole("article", { name: job.title })).toBeVisible();
    await expect(toApply.getByRole("article")).toHaveCount(0);

    await page.reload();
    await expect(applied.getByRole("article", { name: job.title })).toBeVisible(FIRST_LOAD);
    await expect(toApply.getByRole("article")).toHaveCount(0);
  });

  test("Mark applied on a job card logs it, and Free's second one offers Pro", async ({ page }) => {
    await signedIn(page);
    await withResume(page);
    await fakeJobFeed(page);
    const [first, second] = [FEED_JOBS[0]!, FEED_JOBS[1]!];

    await page.goto("/dashboard/jobs");
    const card = jobCard(page, first.title);
    await card.getByRole("button", { name: "Mark applied" }).click(FIRST_LOAD);
    const followUp = day(Date.now() + 7 * DAY_MS);
    await expect(toasts(page)).toContainText(`Marked as applied at ${first.company}`);
    await expect(toasts(page)).toContainText(`I'll remind you to follow up on ${followUp}.`);
    await expect(card.getByRole("link", { name: APPLIED_LINK })).toBeVisible();
    await expect(card.getByRole("button", { name: "Mark applied" })).toHaveCount(0);

    await jobCard(page, second.title).getByRole("button", { name: "Mark applied" }).click();
    const upgrade = upgradeDialog(page, TRACKER_LIMIT);
    await expect(upgrade).toBeVisible();
    await upgrade.getByRole("button", { name: "Not now" }).click();
    await expect(upgrade).toBeHidden();
    await expect(
      jobCard(page, second.title).getByRole("button", { name: "Mark applied" }),
    ).toBeVisible();

    await card.getByRole("link", { name: APPLIED_LINK }).click();
    await expect(page.getByRole("heading", { level: 1, name: first.company })).toBeVisible(
      FIRST_LOAD,
    );
    await expect(page.getByText(new RegExp(`^${first.title} · Applied `))).toBeVisible();
  });
});

test.describe("Application tracking", () => {
  test("adding an application by hand puts it on the board and in the list", async ({ page }) => {
    await signedIn(page);
    const resume = await withResume(page);
    // The dialog opens "More options" only if the resumes have arrived, so they're shown first.
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: resume, exact: true })).toBeVisible(FIRST_LOAD);
    await page
      .getByRole("navigation", { name: "Dashboard" })
      .getByRole("link", { name: "Applications", exact: true })
      .click();

    await expect(
      page.getByRole("heading", { name: "Your applications will live here" }),
    ).toBeVisible(FIRST_LOAD);
    await page.getByRole("button", { name: "Add your first application" }).click();
    const dialog = page.getByRole("dialog", { name: "Add an application" });
    await expect(dialog).toBeVisible();

    await dialog.getByRole("button", { name: "Add application" }).click();
    await expect(dialog.getByText("Add the company you applied to.")).toBeVisible();
    await expect(dialog.getByLabel("Company")).toBeFocused();

    await dialog.getByLabel("Company").fill("Acme Robotics");
    await dialog.getByLabel("Job title").fill("Product Marketing Manager");
    await dialog.getByLabel("Job link").fill("https://jobs.example.com/acme-robotics/42");
    await dialog.getByLabel("Resume you sent").selectOption({ label: resume });
    await expect(dialog.getByLabel("Status")).toHaveValue("applied");
    await andSaved(page, () => dialog.getByRole("button", { name: "Add application" }).click());
    await expect(dialog).toBeHidden();
    await expect(toasts(page)).toContainText("Application added");

    await expect(
      column(page, "Applied").getByRole("article", { name: "Product Marketing Manager" }),
    ).toBeVisible();
    await expect(page.getByText(/^1 application, 0 interviews so far\./)).toBeVisible();

    await showList(page);
    const row = listRow(page, "Acme Robotics");
    await expect(row.getByText("Product Marketing Manager")).toBeVisible();
    await expect(row.getByText(`Applied ${day(Date.now())} · Sent “${resume}”`)).toBeVisible();
    await expect(row.getByText(`Follow-up reminder ${day(Date.now() + 7 * DAY_MS)}`)).toBeVisible();
    await expect(
      row.getByRole("link", { name: "Job post for Acme Robotics (opens in a new tab)" }),
    ).toHaveAttribute("href", "https://jobs.example.com/acme-robotics/42");

    await page.reload();
    await expect(listRow(page, "Acme Robotics")).toBeVisible(FIRST_LOAD);
  });

  test("the status menu and next-step button move an application along", async ({ page }) => {
    await signedIn(page);
    await logApplication(page, "Kestrel Health", "Growth Marketing Lead");
    await page.goto("/dashboard/applications");
    await showList(page);

    const row = listRow(page, "Kestrel Health");
    await expect(row.getByText(/^Follow-up reminder /)).toBeVisible(FIRST_LOAD);
    await row
      .getByRole("button", { name: "Status: Applied. Change the status for Kestrel Health" })
      .click();
    const menu = page.getByRole("menu", { name: "Status for Kestrel Health" });
    await expect(menu.getByRole("menuitemradio", { name: /^Applied/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await andSaved(page, () => menu.getByRole("menuitemradio", { name: /^Interviewing/ }).click());
    await expect(menu).toBeHidden();

    await expect(row.getByRole("button", { name: /^Status: Interviewing\./ })).toBeVisible();
    await expect(row.getByText(/^Follow-up reminder /)).toHaveCount(0);
    await expect(page.getByText(/^1 application, 1 interview so far\./)).toBeVisible();

    await andSaved(page, () => row.getByRole("button", { name: "Got an offer" }).click());
    await expect(row.getByRole("button", { name: /^Status: Offer\./ })).toBeVisible();
    await expect(row.getByRole("button", { name: "Got an offer" })).toHaveCount(0);

    await page.reload();
    await expect(
      listRow(page, "Kestrel Health").getByRole("button", { name: /^Status: Offer\./ }),
    ).toBeVisible(FIRST_LOAD);
  });

  test("on the board, a card moves to Interviewing with its interview day, then closes", async ({
    page,
  }) => {
    await signedIn(page);
    await logApplication(page, "Bluefin Analytics", "Senior Product Marketer");
    await page.goto("/dashboard/applications");

    const card = (name: string) =>
      column(page, name).getByRole("article", { name: "Senior Product Marketer" });
    await expect(card("Applied")).toBeVisible(FIRST_LOAD);
    await card("Applied").getByRole("button", { name: "Move on to Interviewing" }).click();

    const ask = page.getByRole("dialog", { name: "Move to Interviewing" });
    await expect(ask).toBeVisible();
    const interviewAt = Date.now() + 5 * DAY_MS;
    await ask.getByLabel("Interview day").fill(dateInput(interviewAt));
    await andSaved(page, () => ask.getByRole("button", { name: "Move", exact: true }).click());
    await expect(ask).toBeHidden();

    await expect(card("Interviewing")).toBeVisible();
    await expect(card("Interviewing").getByText(`On ${day(interviewAt)}`)).toBeVisible();
    await expect(card("Applied")).toHaveCount(0);

    await card("Interviewing").getByRole("button", { name: "More for Bluefin Analytics" }).click();
    await page
      .getByRole("menu", { name: "Actions for Bluefin Analytics" })
      .getByRole("menuitem", { name: /^Close…/ })
      .click();
    const ending = page.getByRole("dialog", { name: "How did it end?" });
    await andSaved(page, () => ending.getByRole("button", { name: "Rejected" }).click());
    await expect(ending).toBeHidden();
    await expect(card("Closed")).toBeVisible();
    await expect(card("Closed").getByText("Rejected")).toBeVisible();

    await page.reload();
    await expect(card("Closed")).toBeVisible(FIRST_LOAD);
    await expect(card("Interviewing")).toHaveCount(0);
  });

  test("the follow-up reminder can be removed, undone, and removed for good", async ({ page }) => {
    await signedIn(page);
    const application = await logApplication(page, "Copperleaf", "Lifecycle Marketing Manager");
    expect(application.followUpAt).not.toBeNull();
    const reminder = `Follow-up reminder ${day(application.followUpAt!)}`;
    await page.goto("/dashboard/applications");
    await showList(page);

    const row = listRow(page, "Copperleaf");
    await expect(row.getByText(reminder)).toBeVisible(FIRST_LOAD);
    const remove = row.getByRole("button", {
      name: "Remove the follow-up reminder for Copperleaf",
    });

    await andSaved(page, () => remove.click());
    await expect(toasts(page)).toContainText("Reminder removed");
    await expect(row.getByText(/^Follow-up reminder /)).toHaveCount(0);
    await andSaved(page, () => toasts(page).getByRole("button", { name: "Undo" }).click());
    await expect(row.getByText(reminder)).toBeVisible();

    await andSaved(page, () => remove.click());
    await expect(toasts(page)).toContainText("Reminder removed");
    await expect(row.getByText(/^Follow-up reminder /)).toHaveCount(0);

    await page.reload();
    await expect(row.getByRole("button", { name: /^Status: Applied\./ })).toBeVisible(FIRST_LOAD);
    await expect(row.getByText(/^Follow-up reminder /)).toHaveCount(0);
  });

  test("a follow-up that comes due can be snoozed, then marked done", async ({ page }) => {
    await signedIn(page);
    const application = await logApplication(page, "Halcyon Maps", "Brand Marketing Manager");
    const due = application.followUpAt! + DAY_MS;
    await page.clock.setFixedTime(due);
    await page.goto("/dashboard/applications");

    const card = column(page, "Applied").getByRole("article", { name: "Brand Marketing Manager" });
    await expect(card.getByText("Follow up", { exact: true })).toBeVisible(FIRST_LOAD);

    await showList(page);
    const row = listRow(page, "Halcyon Maps");
    await expect(row.getByText("Follow up now")).toBeVisible();
    await andSaved(page, () => row.getByRole("button", { name: "Snooze 3 days" }).click());
    const until = due + 3 * DAY_MS;
    await expect(toasts(page)).toContainText(`Snoozed until ${day(until, until)}`);
    await expect(row.getByText(`Follow-up reminder ${day(until, due)}`)).toBeVisible();
    await expect(row.getByText("Follow up now")).toHaveCount(0);

    await page.clock.setFixedTime(until + DAY_MS);
    await page.reload();
    await expect(row.getByText("Follow up now")).toBeVisible(FIRST_LOAD);
    await andSaved(page, () => row.getByRole("button", { name: "Done", exact: true }).click());
    await expect(toasts(page)).toContainText("Follow-up marked done");
    await expect(row.getByText("Follow up now")).toHaveCount(0);
    await expect(row.getByText(/^Follow-up reminder /)).toHaveCount(0);
  });
});

test.describe("Free tracking limit", () => {
  test("Free tracks one application, asks for Pro at the next, and Pro lifts it", async ({
    page,
  }) => {
    await signedIn(page);
    await logApplication(page, "Juniper Robotics", "Content Marketing Manager");
    await page.goto("/dashboard/applications");

    const main = page.getByRole("main");
    const limitNote = main.getByText("Free tracks 1 application. Pro tracks every one.", {
      exact: true,
    });
    await expect(limitNote).toBeVisible(FIRST_LOAD);
    await expect(main.getByRole("button", { name: "Try Pro for 3 days" })).toBeVisible();

    await main.getByRole("button", { name: "Add application" }).click();
    const upgrade = upgradeDialog(page, TRACKER_LIMIT);
    await expect(upgrade).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Add an application" })).toHaveCount(0);
    await upgrade.getByRole("button", { name: "Not now" }).click();
    await expect(upgrade).toBeHidden();

    const refused = await page.request.post("/api/applications", {
      data: { company: "Tidewater Systems", appliedAt: Date.now() },
    });
    expect(refused.status()).toBe(402);
    expect(((await refused.json()) as { error: { code: string } }).error.code).toBe(
      "upgrade_required",
    );

    await subscribe(page, "pro", "month");
    await page.reload();
    await expect(page.getByText(/^1 application, 0 interviews so far\./)).toBeVisible(FIRST_LOAD);
    await expect(limitNote).toHaveCount(0);

    await main.getByRole("button", { name: "Add application" }).click();
    const dialog = page.getByRole("dialog", { name: "Add an application" });
    await dialog.getByLabel("Company").fill("Tidewater Systems");
    await dialog.getByRole("button", { name: "Add application" }).click();
    await expect(dialog).toBeHidden();
    await expect(toasts(page)).toContainText("Application added");
    await expect(page.getByText(/^2 applications, 0 interviews so far\./)).toBeVisible();
  });
});
