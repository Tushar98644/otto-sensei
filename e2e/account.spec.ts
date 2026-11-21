import type { Browser, Locator, Page, Response } from "@playwright/test";
import type { MeResponse, ReferralSummaryResponse, ResumesResponse } from "@/lib/api/types";
import type { EmailChoicesResponse, ReminderSettingsResponse } from "@/lib/notifications/types";
import { MAX_REWARDED_REFERRALS, REFERRAL_BONUS } from "@/lib/referrals/referrals";
import type { WritingStyleBody, WritingStyleResponse } from "@/lib/writing-style/schema";
import { E2E_BASE_URL } from "./env";
import { blockOutsideHosts, clientIpHeader, expect, holdDevUpdates, test } from "./fixtures";
import {
  resumePdf,
  sampleResume,
  seedResume,
  signInWithForm,
  subscribe,
  uniqueEmail,
} from "./helpers";

// next dev compiles a page or API route on its first visit, which can outlast the expect timeout.
const COMPILE = { timeout: 60_000 };
const STUDIO_KEY = "otto-studio-v1";
const EMAIL_ROUTES = new Set(["/api/notifications/settings", "/api/notifications/emails"]);

type AccountTab = "Plan & billing" | "Preferences" | "Profile";

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

function accountTab(page: Page, name: AccountTab): Locator {
  return page.getByRole("tablist", { name: "Account" }).getByRole("tab", { name, exact: true });
}

function tabPanel(page: Page, name: AccountTab): Locator {
  return page.getByRole("tabpanel", { name, exact: true });
}

async function openAccount(page: Page, path = "/dashboard/account") {
  await page.goto(path);
  await expect(page.getByRole("tablist", { name: "Account" })).toBeVisible(COMPILE);
}

async function openTab(page: Page, name: AccountTab): Promise<Locator> {
  const tab = accountTab(page, name);
  await tab.click();
  await expect(tab).toHaveAttribute("aria-selected", "true");
  return tabPanel(page, name);
}

function region(page: Page, name: string | RegExp): Locator {
  return page.getByRole("region", { name, exact: typeof name === "string" });
}

function toasts(page: Page): Locator {
  return page.getByRole("region", { name: "Notifications" });
}

async function getJson<T>(page: Page, url: string): Promise<T> {
  const response = await page.request.get(url);
  expect(response.ok(), `GET ${url}: ${response.status()}`).toBe(true);
  return (await response.json()) as T;
}

function signedInUser(page: Page) {
  return getJson<MeResponse>(page, "/api/me").then((me) => me.user);
}

function isCall(response: Response, method: string, pathname: string): boolean {
  return response.request().method() === method && new URL(response.url()).pathname === pathname;
}

// Fills the email step wherever the sign-in form is, and types the code that dev mode shows.
async function signInHere(page: Page, email: string) {
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Email me a code" }).click();
  const code = await page
    .getByText(/Dev mode: your code is/)
    .locator("strong")
    .textContent();
  expect(code).toMatch(/^\d{6}$/);
  await page.getByLabel("6-digit code").fill(code ?? "");
}

// The radios are visually hidden inside their labels, so a person clicks the label's text.
async function pick(group: Locator, option: string) {
  await group.getByText(option, { exact: true }).click();
  await expect(group.getByRole("radio", { name: option, exact: true })).toBeChecked();
}

function stamp(): string {
  return Math.random().toString(36).slice(2, 8);
}

test.describe("account tabs", () => {
  test("each tab shows only its own settings, and the open tab stays in the address through a reload", async ({
    page,
    user,
  }) => {
    await openAccount(page);
    await expect(accountTab(page, "Plan & billing")).toHaveAttribute("aria-selected", "true");
    await expect(region(page, "Your plan: Free")).toBeVisible();
    await expect(region(page, "Writing style")).toHaveCount(0);
    await expect(region(page, "Email and sign-in")).toHaveCount(0);

    const preferences = await openTab(page, "Preferences");
    await expect(page).toHaveURL(/\/dashboard\/account\?tab=preferences$/);
    for (const name of ["Writing style", "Job search", "Emails and reminders"]) {
      await expect(preferences.getByRole("heading", { level: 2, name, exact: true })).toBeVisible();
    }
    await expect(region(page, /^Your plan: /)).toHaveCount(0);

    await page.reload();
    await expect(accountTab(page, "Preferences")).toHaveAttribute("aria-selected", "true", COMPILE);
    await expect(
      tabPanel(page, "Preferences").getByRole("heading", { level: 2, name: "Writing style" }),
    ).toBeVisible();

    const profile = await openTab(page, "Profile");
    await expect(page).toHaveURL(/\/dashboard\/account\?tab=profile$/);
    await expect(profile.getByRole("region", { name: "Email and sign-in" })).toContainText(
      user.email,
    );
    for (const name of ["Invite friends", "Your data", "Delete account"]) {
      await expect(profile.getByRole("region", { name, exact: true })).toBeVisible();
    }
    await expect(region(page, "Writing style")).toHaveCount(0);

    await openTab(page, "Plan & billing");
    await expect(page).toHaveURL(/\/dashboard\/account$/);
    await expect(region(page, "Your plan: Free")).toBeVisible();
  });

  test("the arrow, Home and End keys move between the tabs", async ({ page, user }) => {
    await openAccount(page, "/account");
    expect(user.plan).toBe("free");
    const plan = accountTab(page, "Plan & billing");
    await plan.focus();

    await page.keyboard.press("ArrowRight");
    await expect(accountTab(page, "Preferences")).toBeFocused();
    await expect(accountTab(page, "Preferences")).toHaveAttribute("aria-selected", "true");
    await expect(region(page, "Writing style")).toBeVisible();

    await page.keyboard.press("End");
    await expect(accountTab(page, "Profile")).toBeFocused();
    await expect(accountTab(page, "Profile")).toHaveAttribute("aria-selected", "true");

    await page.keyboard.press("ArrowRight");
    await expect(plan).toBeFocused();
    await expect(plan).toHaveAttribute("aria-selected", "true");

    await page.keyboard.press("ArrowLeft");
    await expect(accountTab(page, "Profile")).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Home");
    await expect(plan).toHaveAttribute("aria-selected", "true");
    await expect(region(page, "Your plan: Free")).toBeVisible();
  });

  // The page used to be one long list with an on-this-page nav; its anchors are still in emails, hints and bookmarks.
  const SECTION_LINKS: ReadonlyArray<{ path: string; tab: AccountTab; section: string | RegExp }> =
    [
      { path: "/dashboard/account#writing-style", tab: "Preferences", section: "Writing style" },
      { path: "/dashboard/account#reminders", tab: "Preferences", section: "Reminders and emails" },
      { path: "/dashboard/account#invite", tab: "Profile", section: "Invite friends" },
      { path: "/dashboard/account#delete-account", tab: "Profile", section: "Delete account" },
      { path: "/account?tab=profile#plan", tab: "Plan & billing", section: /^Your plan: / },
    ];

  for (const link of SECTION_LINKS) {
    test(`${link.path} opens ${link.tab} on that section`, async ({ page, user }) => {
      expect(user.plan).toBe("free");
      await openAccount(page, link.path);
      await expect(accountTab(page, link.tab)).toHaveAttribute("aria-selected", "true");
      const section = tabPanel(page, link.tab).getByRole("region", {
        name: link.section,
        exact: typeof link.section === "string",
      });
      await expect(section).toBeFocused();
      await expect(section).toBeInViewport();
    });
  }

  test("the account menu's link to a card switches the open tab and lands on it", async ({
    page,
    user,
  }) => {
    await openAccount(page);
    await openTab(page, "Profile");

    const trigger = page.getByRole("button", { name: `Account menu for ${user.email}` });
    const item = page.getByRole("menuitem", { name: "Work rights & preferences" });
    // The menu only opens once the page has hydrated, so an early click can do nothing.
    await expect(async () => {
      if (!(await item.isVisible())) await trigger.click();
      await expect(item).toBeVisible({ timeout: 1_000 });
    }).toPass();
    await item.click();

    await expect(page).toHaveURL(/\/dashboard\/account#work-profile$/);
    await expect(accountTab(page, "Preferences")).toHaveAttribute("aria-selected", "true");
    const card = region(page, "Where you can work");
    await expect(card).toBeFocused();
    await expect(card).toBeInViewport();
  });

  test("signed out, a section link signs in on the page and then opens that section", async ({
    page,
  }) => {
    const email = uniqueEmail("account-link");
    await page.goto("/account#invite");
    await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible(COMPILE);
    await expect(page.getByRole("tablist", { name: "Account" })).toHaveCount(0);

    await signInHere(page, email);
    await expect(accountTab(page, "Profile")).toHaveAttribute("aria-selected", "true", COMPILE);
    const invite = region(page, "Invite friends");
    await expect(invite).toBeFocused();
    await expect(invite).toBeInViewport();
    await expect(region(page, "Email and sign-in")).toContainText(email);
  });

  // Product bug: sign-in drops #reminders (next= carries no anchor), so the visitor lands at the top of the account page.
  test.fixme("signed out, a reminder email's settings link still lands on the reminders after sign-in", async ({
    page,
  }) => {
    const email = uniqueEmail("email-link");
    await page.goto("/dashboard/account#reminders");
    await expect(page).toHaveURL((url) => url.pathname === "/login", COMPILE);

    await signInHere(page, email);
    await expect(page).toHaveURL((url) => url.pathname === "/dashboard/account", COMPILE);
    await expect(accountTab(page, "Preferences")).toHaveAttribute("aria-selected", "true");
    await expect(region(page, "Reminders and emails")).toBeInViewport();
  });
});

function writingStyle(page: Page): Locator {
  return region(page, "Writing style");
}

type StyleGroup = "Tone" | "Length" | "Spelling";

function segments(scope: Locator, group: StyleGroup): Locator {
  return scope.getByRole("group", { name: group, exact: true });
}

function choice(scope: Locator, group: StyleGroup, option: string): Locator {
  return segments(scope, group).getByRole("radio", { name: option, exact: true });
}

function styleSaved(page: Page, matches: (body: WritingStyleBody) => boolean) {
  return page.waitForResponse(
    (response) =>
      isCall(response, "PUT", "/api/writing-style") &&
      matches(response.request().postDataJSON() as WritingStyleBody),
    COMPILE,
  );
}

test.describe("writing style", () => {
  test("each choice saves as you go, comes back after a reload, and Reset to default undoes them all", async ({
    page,
    user,
  }) => {
    expect(user.plan).toBe("free");
    const signOff = "Cheers, Sam";
    const notes = "Mention I'm open to relocating.";
    await openAccount(page, "/dashboard/account?tab=preferences");
    const style = writingStyle(page);
    const status = style.getByRole("status");
    const reset = style.getByRole("button", { name: "Reset to default" });
    await expect(choice(style, "Tone", "Natural")).toBeChecked(COMPILE);
    await expect(choice(style, "Length", "Standard")).toBeChecked();
    await expect(choice(style, "Spelling", "US English")).toBeChecked();
    await expect(status).toHaveText("Changes save as you go.");
    await expect(reset).toHaveAttribute("aria-disabled", "true");

    let saved = styleSaved(page, (body) => body.tone === "warm");
    await pick(segments(style, "Tone"), "Warm");
    expect((await saved).ok()).toBe(true);
    await expect(style.getByText("Friendly and personal, still professional.")).toBeVisible();
    await expect(status).toHaveText("Saved");
    await expect(reset).not.toHaveAttribute("aria-disabled", "true");

    saved = styleSaved(page, (body) => body.length === "shorter");
    await pick(segments(style, "Length"), "Shorter");
    expect((await saved).ok()).toBe(true);
    saved = styleSaved(page, (body) => body.spelling === "uk");
    await pick(segments(style, "Spelling"), "UK English");
    expect((await saved).ok()).toBe(true);
    await expect(style.getByText("organise, colour, CV")).toBeVisible();

    // Typing saves once it pauses; leaving the notes box sends them at once.
    saved = styleSaved(page, (body) => body.signOff === signOff);
    await style.getByLabel("Sign-off").fill(signOff);
    expect((await saved).ok()).toBe(true);
    saved = styleSaved(page, (body) => body.notes === notes);
    await style.getByLabel("Notes for Otto").fill(notes);
    await style.getByLabel("Notes for Otto").blur();
    expect((await saved).ok()).toBe(true);
    await expect(status).toHaveText("Saved");
    await expect(style.getByText(`${notes.length}/500`)).toBeVisible();

    const { style: stored } = await getJson<WritingStyleResponse>(page, "/api/writing-style");
    expect(stored).toMatchObject({
      tone: "warm",
      length: "shorter",
      spelling: "uk",
      signOff,
      notes,
    });

    await page.reload();
    await expect(choice(style, "Tone", "Warm")).toBeChecked(COMPILE);
    await expect(choice(style, "Length", "Shorter")).toBeChecked();
    await expect(choice(style, "Spelling", "UK English")).toBeChecked();
    await expect(style.getByLabel("Sign-off")).toHaveValue(signOff);
    await expect(style.getByLabel("Notes for Otto")).toHaveValue(notes);

    saved = styleSaved(page, (body) => body.tone === "natural" && body.signOff === "");
    await reset.click();
    expect((await saved).ok()).toBe(true);
    await expect(choice(style, "Tone", "Natural")).toBeChecked();
    await expect(choice(style, "Length", "Standard")).toBeChecked();
    await expect(choice(style, "Spelling", "US English")).toBeChecked();
    await expect(style.getByLabel("Sign-off")).toHaveValue("");
    await expect(style.getByLabel("Notes for Otto")).toHaveValue("");
    await expect(reset).toHaveAttribute("aria-disabled", "true");

    await page.reload();
    await expect(choice(style, "Tone", "Natural")).toBeChecked(COMPILE);
    await expect(style.getByLabel("Notes for Otto")).toHaveValue("");
    expect((await getJson<WritingStyleResponse>(page, "/api/writing-style")).style).toMatchObject({
      tone: "natural",
      length: "standard",
      spelling: "us",
      signOff: "",
      notes: "",
    });
  });
});

function reminders(page: Page): Locator {
  return region(page, "Reminders and emails");
}

function emailChoice(card: Locator, name: string): Locator {
  return card.getByRole("radiogroup", { name, exact: true });
}

function onOff(card: Locator, name: string, value: "On" | "Off"): Locator {
  return emailChoice(card, name).getByRole("radio", { name: value, exact: true });
}

// The e2e server has no email service; this answers as if it had one, while the settings still save for real.
async function withEmailService(page: Page) {
  await page.route(
    (url) => EMAIL_ROUTES.has(url.pathname),
    async (route) => {
      const response = await route.fetch();
      const body = (await response.json()) as Record<string, unknown>;
      await route.fulfill({ response, json: { ...body, emailAvailable: true } });
    },
  );
}

test.describe("reminders and emails", () => {
  test("the follow-up delay saves and stays after a reload, and with no email service no email choice is offered", async ({
    page,
    user,
  }) => {
    expect(user.plan).toBe("free");
    const emailsRead = page.waitForResponse(
      (response) => isCall(response, "GET", "/api/notifications/emails"),
      COMPILE,
    );
    await openAccount(page, "/dashboard/account?tab=preferences");
    const card = reminders(page);
    const delay = card.getByLabel("Remind me to follow up after");
    await expect(delay).toHaveValue("7", COMPILE);
    await expect(delay.locator("option")).toHaveText([
      "3 days",
      "5 days",
      "7 days",
      "10 days",
      "14 days",
      "21 days",
    ]);
    expect((await emailsRead).ok()).toBe(true);
    await expect(card.getByRole("radiogroup")).toHaveCount(0);
    await expect(card.getByText("Email me reminders")).toHaveCount(0);
    await expect(card.getByText("Weekly jobs email")).toHaveCount(0);

    await delay.selectOption("14");
    await expect(
      toasts(page).getByText("Reminders now come 14 days after you apply."),
    ).toBeVisible();
    const settings = await getJson<ReminderSettingsResponse>(page, "/api/notifications/settings");
    expect(settings.followUpDays).toBe(14);
    expect(settings.emailReminders).toBe(false);

    await page.reload();
    await expect(reminders(page).getByLabel("Remind me to follow up after")).toHaveValue(
      "14",
      COMPILE,
    );
  });

  test("with an email service, each email can be turned on or off, and the choice stays", async ({
    page,
    user,
  }) => {
    expect(user.plan).toBe("free");
    await withEmailService(page);
    await openAccount(page, "/dashboard/account#reminders");
    const card = reminders(page);
    await expect(onOff(card, "Email me reminders", "Off")).toBeChecked(COMPILE);
    await expect(onOff(card, "Weekly jobs email", "Off")).toBeChecked(COMPILE);
    await expect(onOff(card, "Tips and reminders", "On")).toBeChecked();

    await pick(emailChoice(card, "Email me reminders"), "On");
    await expect(toasts(page).getByText("Reminder emails are on.")).toBeVisible();
    await pick(emailChoice(card, "Weekly jobs email"), "On");
    await expect(toasts(page).getByText("Weekly jobs email is on.")).toBeVisible();
    await pick(emailChoice(card, "Tips and reminders"), "Off");
    await expect(toasts(page).getByText("Tips and reminders are off.")).toBeVisible();

    // Read straight from the server, past the browser's stand-in answers.
    const settings = await getJson<ReminderSettingsResponse>(page, "/api/notifications/settings");
    expect(settings).toMatchObject({ emailReminders: true, followUpDays: 7 });
    const emails = await getJson<EmailChoicesResponse>(page, "/api/notifications/emails");
    expect(emails).toMatchObject({ jobEmails: true, tipEmails: false });

    await page.reload();
    await expect(onOff(reminders(page), "Email me reminders", "On")).toBeChecked(COMPILE);
    await expect(onOff(reminders(page), "Weekly jobs email", "On")).toBeChecked(COMPILE);
    await expect(onOff(reminders(page), "Tips and reminders", "Off")).toBeChecked();

    await pick(emailChoice(reminders(page), "Email me reminders"), "Off");
    await expect(toasts(page).getByText("Reminder emails are off.")).toBeVisible();
    expect(
      (await getJson<ReminderSettingsResponse>(page, "/api/notifications/settings")).emailReminders,
    ).toBe(false);
  });
});

// A friend's own browser, with the same guards as the fixtures.
async function friendBrowser(browser: Browser) {
  const context = await browser.newContext({
    baseURL: E2E_BASE_URL,
    extraHTTPHeaders: clientIpHeader(),
  });
  const leaks = await blockOutsideHosts(context);
  await holdDevUpdates(context);
  const page = await context.newPage();
  return {
    page,
    close: async () => {
      await context.close();
      expect(leaks, "the friend's browser asked for something outside localhost").toEqual([]);
    },
  };
}

function inviteCard(page: Page): Locator {
  return region(page, "Invite friends");
}

test.describe("invite friends", () => {
  test("the invite link copies, and a friend who joins with it and checks a resume earns you both extras", async ({
    page,
    context,
    browser,
    user,
  }) => {
    expect(user.plan).toBe("free");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await openAccount(page, "/dashboard/account?tab=profile");
    const card = inviteCard(page);
    const field = card.getByRole("textbox", { name: "Your invite link" });
    await expect(field).toHaveValue(/\/\?ref=\w+$/, COMPILE);
    const link = await field.inputValue();
    expect(link.startsWith(`${E2E_BASE_URL}/?ref=`)).toBe(true);
    await expect(card.getByText("Nobody has joined with your link yet.")).toBeVisible();
    const progress = card.getByRole("progressbar", { name: "Friends who earned you extras" });
    await expect(progress).toHaveAttribute("aria-valuenow", "0");
    await expect(progress).toHaveAttribute("aria-valuemax", String(MAX_REWARDED_REFERRALS));

    await card.getByRole("button", { name: "Copy link" }).click();
    await expect(card.getByRole("button", { name: "Copied" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(link);
    await expect(card.getByRole("button", { name: "Copy link" })).toBeVisible();

    const friend = await friendBrowser(browser);
    try {
      const tip = friend.page
        .getByRole("dialog")
        .filter({ has: friend.page.getByRole("button", { name: /^(Skip tips|Got it)$/ }) });
      await friend.page.addLocatorHandler(tip, async () => {
        const skip = tip.getByRole("button", { name: "Skip tips" });
        await (
          (await skip.isVisible()) ? skip : tip.getByRole("button", { name: "Got it" })
        ).click();
      });

      await friend.page.goto(link);
      await expect(friend.page).toHaveURL(
        (url) => url.pathname === "/" && !url.searchParams.has("ref"),
        COMPILE,
      );
      await signInWithForm(friend.page, uniqueEmail("friend"));
      await expect(toasts(friend.page).getByText("You joined through an invite")).toBeVisible(
        COMPILE,
      );

      await page.reload();
      await expect(inviteCard(page).getByText("1 friend joined, 0 checked a resume.")).toBeVisible(
        COMPILE,
      );
      await expect(progress).toHaveAttribute("aria-valuenow", "0");

      await friend.page.goto("/studio");
      const dropzone = friend.page.getByRole("button", {
        name: "Upload your resume, a PDF or Word file",
      });
      await expect(dropzone).toBeVisible(COMPILE);
      const [chooser] = await Promise.all([
        friend.page.waitForEvent("filechooser"),
        dropzone.click(),
      ]);
      await chooser.setFiles(await resumePdf());
      await expect(friend.page.getByRole("button", { name: "Next: Fix my lines" })).toBeVisible(
        COMPILE,
      );
    } finally {
      await friend.close();
    }

    await page.reload();
    await expect(inviteCard(page).getByText("1 friend joined, 1 checked a resume.")).toBeVisible(
      COMPILE,
    );
    await expect(progress).toHaveAttribute("aria-valuenow", "1");
    await expect(
      inviteCard(page).getByText(
        `This month you have ${REFERRAL_BONUS.fix} more line fixes and ${REFERRAL_BONUS.tailor} more tailored versions from invites.`,
      ),
    ).toBeVisible();
    const { referrals } = await getJson<ReferralSummaryResponse>(page, "/api/referrals");
    expect(referrals).toMatchObject({ joined: 1, checked: 1, rewarded: 1 });
  });
});

function dangerZone(page: Page): Locator {
  return region(page, "Delete account");
}

function deleteDialog(page: Page): Locator {
  return page.getByRole("dialog", { name: "Delete your account?" });
}

async function openDeleteDialog(page: Page): Promise<Locator> {
  await dangerZone(page).getByRole("button", { name: "Delete account" }).click();
  const dialog = deleteDialog(page);
  await expect(dialog).toBeVisible();
  return dialog;
}

async function confirmDelete(page: Page, dialog: Locator) {
  await dialog.getByLabel("Type DELETE to confirm").fill("DELETE");
  const deleted = page.waitForResponse((response) => isCall(response, "DELETE", "/api/account"));
  await dialog.getByRole("button", { name: "Delete account" }).click();
  expect((await deleted).ok()).toBe(true);
  await expect(page).toHaveURL((url) => url.pathname === "/", COMPILE);
}

test.describe("deleting an account", () => {
  test("Delete stays off until DELETE is typed, and Cancel keeps the account", async ({
    page,
    user,
  }) => {
    await openAccount(page, "/dashboard/account?tab=profile");
    await expect(dangerZone(page)).toContainText("You can't undo it.");
    await expect(dangerZone(page)).not.toContainText("This also cancels your plan.");

    let dialog = await openDeleteDialog(page);
    await expect(
      dialog.getByText(
        "This deletes your account, the resumes backed up to it, and your usage history. You can't undo it.",
      ),
    ).toBeVisible();
    await expect(dialog.getByText("This also cancels your plan")).toHaveCount(0);
    const confirm = dialog.getByRole("button", { name: "Delete account" });
    const field = dialog.getByLabel("Type DELETE to confirm");
    await expect(field).toBeFocused();
    await expect(confirm).toBeDisabled();
    await field.fill("DELET");
    await expect(confirm).toBeDisabled();
    await field.fill("remove");
    await expect(confirm).toBeDisabled();
    await field.fill(" delete ");
    await expect(confirm).toBeEnabled();

    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
    expect((await signedInUser(page))?.id).toBe(user.id);

    dialog = await openDeleteDialog(page);
    await expect(dialog.getByLabel("Type DELETE to confirm")).toHaveValue("");
    await expect(dialog.getByRole("button", { name: "Delete account" })).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    await page.reload();
    await expect(region(page, "Email and sign-in")).toContainText(user.email, COMPILE);
  });

  test("deleting signs you out for good, and the same email then signs in to a new, empty account", async ({
    page,
    context,
    user,
  }) => {
    const title = `Delete check ${stamp()}`;
    await seedResume(page, { ...sampleResume(), title });
    const styled = await page.request.put("/api/writing-style", {
      data: {
        tone: "formal",
        length: "shorter",
        spelling: "uk",
        signOff: "Yours",
        notes: "Brief.",
      },
    });
    expect(styled.ok()).toBe(true);
    const reminded = await page.request.put("/api/notifications/settings", {
      data: { followUpDays: 21 },
    });
    expect(reminded.ok()).toBe(true);

    // The account's resume is on the dashboard and kept in this browser too.
    await page.goto("/dashboard/resumes");
    await expect(page.getByRole("region", { name: "Your resumes" })).toContainText(title, COMPILE);
    await expect
      .poll(() => page.evaluate((key) => localStorage.getItem(key) ?? "", STUDIO_KEY))
      .toContain(title);

    await openAccount(page, "/dashboard/account?tab=preferences");
    await expect(choice(writingStyle(page), "Tone", "Formal")).toBeChecked(COMPILE);
    await expect(reminders(page).getByLabel("Remind me to follow up after")).toHaveValue("21");

    const oldCookies = await context.cookies();
    await openTab(page, "Profile");
    await confirmDelete(page, await openDeleteDialog(page));

    await expect(page.getByRole("banner").getByRole("link", { name: "Sign in" })).toBeVisible(
      COMPILE,
    );
    expect(await signedInUser(page)).toBeNull();
    expect(await page.evaluate((key) => localStorage.getItem(key) ?? "", STUDIO_KEY)).not.toContain(
      title,
    );
    // The page was replaced, so Back goes to the page before it, which now asks to sign in.
    await page.goBack();
    await expect(page).toHaveURL((url) => url.pathname === "/login", COMPILE);

    // The old session cookie is dead on the server, not just cleared from the browser.
    await context.addCookies(oldCookies);
    expect(await signedInUser(page)).toBeNull();
    expect((await page.request.get("/api/resumes")).status()).toBe(401);
    await context.clearCookies();

    const listed = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/resumes" &&
        response.request().method() !== "PUT",
      COMPILE,
    );
    await signInWithForm(page, user.email);
    expect((await listed).ok()).toBe(true);
    const again = await signedInUser(page);
    expect(again?.email).toBe(user.email);
    expect(again?.id).not.toBe(user.id);
    expect(again?.plan).toBe("free");
    expect((await getJson<ResumesResponse>(page, "/api/resumes")).resumes).toEqual([]);

    await page.goto("/dashboard/resumes");
    await expect(
      page.getByRole("heading", { level: 2, name: "Your resumes will live here" }),
    ).toBeVisible(COMPILE);
    await expect(page.getByText(title)).toHaveCount(0);
    expect(await page.evaluate((key) => localStorage.getItem(key) ?? "", STUDIO_KEY)).not.toContain(
      title,
    );

    await openAccount(page, "/dashboard/account?tab=preferences");
    await expect(choice(writingStyle(page), "Tone", "Natural")).toBeChecked(COMPILE);
    await expect(writingStyle(page).getByLabel("Sign-off")).toHaveValue("");
    await expect(reminders(page).getByLabel("Remind me to follow up after")).toHaveValue("7");
  });

  test("a Pro account is told deleting also ends the plan, and the same email comes back on Free with no second trial", async ({
    page,
    user,
  }) => {
    expect(await subscribe(page, "pro", "month")).toContain("trial=1");
    expect((await signedInUser(page))?.plan).toBe("pro");

    await openAccount(page, "/account?tab=profile");
    await expect(dangerZone(page)).toContainText("This also cancels your plan.");
    const dialog = await openDeleteDialog(page);
    await expect(dialog.getByText("This also cancels your plan", { exact: true })).toBeVisible();
    await expect(
      dialog.getByText("Your paid plan ends right away, and you won't be charged again."),
    ).toBeVisible();
    await confirmDelete(page, dialog);
    expect(await signedInUser(page)).toBeNull();

    await signInWithForm(page, user.email);
    const again = await signedInUser(page);
    expect(again?.id).not.toBe(user.id);
    expect(again?.plan).toBe("free");
    await openAccount(page, "/account");
    await expect(region(page, "Your plan: Free")).toBeVisible(COMPILE);
    // One trial per email outlives a deleted account, so checkout now charges for Pro straight away.
    expect(await subscribe(page, "pro", "month")).not.toContain("trial=1");
  });
});
