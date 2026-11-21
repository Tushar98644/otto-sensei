import type { Page } from "@playwright/test";
import type { MeResponse } from "@/lib/api/types";
import { expect, test } from "./fixtures";
import { signInWithForm, uniqueEmail } from "./helpers";

// next dev compiles a page on its first visit, which can outlast the 10 s expect timeout.
const COMPILE = { timeout: 60_000 };

const PROTECTED_PAGES = [
  "/dashboard",
  "/dashboard/resumes",
  "/dashboard/jobs",
  "/dashboard/applications",
  "/dashboard/account",
];

function emailField(page: Page) {
  return page.getByLabel("Email", { exact: true });
}

function codeField(page: Page) {
  return page.getByLabel("6-digit code");
}

function accountMenu(page: Page, email: string) {
  return page.getByRole("button", { name: `Account menu for ${email}` });
}

type AccountTab = "Plan & billing" | "Preferences" | "Profile";

function accountTab(page: Page, name: AccountTab) {
  return page.getByRole("tablist", { name: "Account" }).getByRole("tab", { name, exact: true });
}

async function openAccountTab(page: Page, name: AccountTab) {
  const tab = accountTab(page, name);
  await tab.click();
  await expect(tab).toHaveAttribute("aria-selected", "true");
  return page.getByRole("tabpanel", { name, exact: true });
}

function signInCard(page: Page) {
  return page.getByRole("region", { name: "Email and sign-in" });
}

async function signedInEmail(page: Page): Promise<string | null> {
  const response = await page.request.get("/api/me");
  expect(response.ok()).toBe(true);
  const me = (await response.json()) as MeResponse;
  return me.user?.email ?? null;
}

// Fills the email step and returns the code that dev mode shows on screen.
async function requestCode(page: Page, email: string): Promise<string> {
  await emailField(page).fill(email);
  await page.getByRole("button", { name: "Email me a code" }).click();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  const code = await page
    .getByText(/Dev mode: your code is/)
    .locator("strong")
    .textContent();
  expect(code).toMatch(/^\d{6}$/);
  return code ?? "";
}

async function expectSignInPage(page: Page) {
  await expect(page).toHaveURL((url) => url.pathname === "/login");
  await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
  await expect(emailField(page)).toBeVisible();
}

test.describe("signing in", () => {
  test("the email code signs a new visitor in and opens the dashboard", async ({ page }) => {
    const email = uniqueEmail("signin");
    await page.goto("/login");
    await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeDisabled();
    await expect(page.getByText("Google sign-in works once Supabase is set up.")).toBeVisible();

    const code = await requestCode(page, email);
    await expect(emailField(page)).toBeHidden();
    await codeField(page).fill(code);

    await expect(page).toHaveURL(/\/dashboard$/, COMPILE);
    await expect(accountMenu(page, email)).toBeVisible();
    expect(await signedInEmail(page)).toBe(email);
  });

  test("a mistyped email is caught before any code is sent", async ({ page }) => {
    await page.goto("/login");
    await emailField(page).fill("not-an-email");
    await page.getByRole("button", { name: "Email me a code" }).click();

    await expect(emailField(page)).toHaveAttribute("aria-invalid", "true");
    await expect(emailField(page)).toHaveAccessibleDescription(
      "Enter your email address, like name@example.com.",
    );
    await expect(codeField(page)).toHaveCount(0);
    await expect(page.getByText(/Dev mode: your code is/)).toHaveCount(0);
  });

  test("a wrong code is refused, and the right one still signs in", async ({ page }) => {
    const email = uniqueEmail("wrong-code");
    await page.goto("/login");
    const code = await requestCode(page, email);
    const wrong = `${(Number(code[0]) + 1) % 10}${code.slice(1)}`;

    await codeField(page).fill(wrong);
    await expect(codeField(page)).toHaveAttribute("aria-invalid", "true");
    await expect(codeField(page)).toHaveAccessibleDescription(
      /That code didn't work or has expired/,
    );
    await expect(page).toHaveURL(/\/login$/);
    expect(await signedInEmail(page)).toBeNull();

    await codeField(page).fill(code);
    await expect(page).toHaveURL(/\/dashboard$/, COMPILE);
    await expect(accountMenu(page, email)).toBeVisible();
  });

  test("signing in from a link with ?next= lands on that page", async ({ page }) => {
    const email = uniqueEmail("next");
    await page.goto(`/login?next=${encodeURIComponent("/dashboard/applications")}`);
    await codeField(page).fill(await requestCode(page, email));

    await expect(page).toHaveURL(/\/dashboard\/applications$/, COMPILE);
    await expect(accountMenu(page, email)).toBeVisible();
  });

  test("a ?next= link to another site is ignored after sign-in", async ({ page }) => {
    const email = uniqueEmail("next-outside");
    await page.goto(`/login?next=${encodeURIComponent("//example.com/after-sign-in")}`);
    await codeField(page).fill(await requestCode(page, email));

    await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/dashboard$/, COMPILE);
    await expect(accountMenu(page, email)).toBeVisible();
  });

  test("a signed-in visitor skips the sign-in page and the home page", async ({ page, user }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/dashboard$/, COMPILE);
    await expect(accountMenu(page, user.email)).toBeVisible();

    await page.goto("/");
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});

test.describe("signing out", () => {
  test("the dashboard's account menu signs out and returns to the home page", async ({
    page,
    user,
  }) => {
    await page.goto("/dashboard/resumes");
    const trigger = accountMenu(page, user.email);
    const signOut = page.getByRole("menuitem", { name: "Sign out" });
    // The menu only opens once the page has hydrated, so an early click can do nothing.
    await expect(async () => {
      if (!(await signOut.isVisible())) await trigger.click();
      await expect(signOut).toBeVisible({ timeout: 1_000 });
    }).toPass();
    await signOut.click();

    // The toast comes with the click, so a slow load of the home page can outlast it.
    await expect(
      page.getByRole("region", { name: "Notifications" }).getByText("You're signed out."),
    ).toBeVisible();
    await expect(page).toHaveURL((url) => url.pathname === "/", COMPILE);
    await expect(page.getByRole("heading", { level: 1, name: /See your resume/ })).toBeVisible();
    await expect(page.getByRole("banner").getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("banner").getByRole("link", { name: "Dashboard" })).toHaveCount(0);
    expect(await signedInEmail(page)).toBeNull();

    await page.goto("/dashboard");
    await expectSignInPage(page);
  });

  test("an old session cookie stops working once its owner signs out", async ({
    page,
    context,
    user,
  }) => {
    const signedInCookies = await context.cookies();
    await page.goto("/account");
    await openAccountTab(page, "Profile");
    await signInCard(page).getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("button", { name: "Email me a code" })).toBeVisible();

    await context.addCookies(signedInCookies);
    expect(await signedInEmail(page)).toBeNull();
    await page.goto("/dashboard");
    await expectSignInPage(page);
    await expect(page.getByText(user.email)).toHaveCount(0);
  });
});

test.describe("protected pages", () => {
  for (const path of PROTECTED_PAGES) {
    test(`${path} sends a signed-out visitor to sign in`, async ({ page }) => {
      await page.goto(path);
      await expectSignInPage(page);
      expect(new URL(page.url()).searchParams.get("next")).toMatch(/^\/dashboard(\/|$)/);
    });
  }

  test("signing in from the redirect opens the dashboard", async ({ page }) => {
    const email = uniqueEmail("redirected");
    await page.goto("/dashboard/jobs");
    await expectSignInPage(page);
    await codeField(page).fill(await requestCode(page, email));

    await expect(page).toHaveURL((url) => url.pathname.startsWith("/dashboard"), COMPILE);
    await expect(accountMenu(page, email)).toBeVisible();
  });

  test("signed-out API calls get no account data", async ({ page }) => {
    expect(await signedInEmail(page)).toBeNull();
    const resumes = await page.request.get("/api/resumes");
    expect(resumes.status()).toBe(401);
  });
});

test.describe("account page", () => {
  test("signed out, it offers sign-in and shows no account details @mobile", async ({ page }) => {
    await page.goto("/account");
    // Signed out, the page reads like /login: the form's heading takes the place of the page's own.
    await expect(
      page.getByRole("heading", { level: 1, name: "Sign in", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Your account" })).toBeHidden();
    await expect(
      page.getByText("Sign in to see your plan and what you've used this month."),
    ).toBeVisible();
    await expect(emailField(page)).toBeVisible();
    await expect(page.getByRole("button", { name: "Email me a code" })).toBeVisible();
    await expect(page.getByRole("tablist", { name: "Account" })).toHaveCount(0);
    await expect(page.getByRole("region", { name: /^Your plan/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0);
  });

  test("signing in there shows the account in place, and signing out brings the form back @mobile", async ({
    page,
  }) => {
    const email = uniqueEmail("account");
    await page.goto("/account");
    await codeField(page).fill(await requestCode(page, email));

    const tabs = page.getByRole("tablist", { name: "Account" });
    await expect(tabs).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Your account" })).toBeVisible();
    await expect(accountTab(page, "Plan & billing")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("region", { name: "Your plan: Free" })).toBeVisible();
    await expect(page).toHaveURL(/\/account$/);

    await openAccountTab(page, "Profile");
    await expect(signInCard(page).getByText(email, { exact: true })).toBeVisible();
    await signInCard(page).getByRole("button", { name: "Sign out" }).click();
    await expect(
      page.getByRole("region", { name: "Notifications" }).getByText("You're signed out."),
    ).toBeVisible();
    await expect(emailField(page)).toBeVisible();
    await expect(tabs).toHaveCount(0);
    await expect(page.getByText(email, { exact: true })).toHaveCount(0);
    await expect(page).toHaveURL((url) => url.pathname === "/account");
    expect(await signedInEmail(page)).toBeNull();
  });

  test("signed in, it shows who is signed in, the plan and the settings", async ({
    page,
    user,
  }) => {
    await page.goto("/account");
    await expect(page.getByRole("heading", { level: 1, name: "Your account" })).toBeVisible();
    // It opens on the plan.
    await expect(accountTab(page, "Plan & billing")).toHaveAttribute("aria-selected", "true");
    const billing = page.getByRole("tabpanel", { name: "Plan & billing" });
    const plan = billing.getByRole("region", { name: "Your plan: Free" });
    await expect(plan).toBeVisible();
    await expect(plan.getByText("Current plan", { exact: true })).toBeVisible();
    await expect(
      billing.getByRole("heading", { level: 2, name: "Usage", exact: true }),
    ).toBeVisible();

    const preferences = await openAccountTab(page, "Preferences");
    for (const name of ["Writing style", "Job search", "Emails and reminders"]) {
      await expect(preferences.getByRole("heading", { level: 2, name, exact: true })).toBeVisible();
    }

    const profile = await openAccountTab(page, "Profile");
    const signIn = profile.getByRole("region", { name: "Email and sign-in" });
    await expect(signIn.getByText(user.email, { exact: true })).toBeVisible();
    await expect(signIn.getByRole("button", { name: "Sign out" })).toBeVisible();
    await expect(
      profile.getByRole("heading", { level: 2, name: "Delete account", exact: true }),
    ).toBeVisible();
    await expect(emailField(page)).toHaveCount(0);

    await page.goto("/dashboard/account");
    await expect(page.getByRole("heading", { level: 1, name: "Account" })).toBeVisible();
    await openAccountTab(page, "Profile");
    await expect(signInCard(page).getByText(user.email, { exact: true })).toBeVisible();
  });
});

test.describe("session", () => {
  test("a session survives a reload and a new tab", async ({ page, context }) => {
    const email = await signInWithForm(page, uniqueEmail("reload"));
    await expect(accountMenu(page, email)).toBeVisible();

    await page.reload();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(accountMenu(page, email)).toBeVisible();

    const tab = await context.newPage();
    await tab.goto("/account");
    await openAccountTab(tab, "Profile");
    await expect(signInCard(tab).getByText(email, { exact: true })).toBeVisible();
    await tab.close();
  });
});
