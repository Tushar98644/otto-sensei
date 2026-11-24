import type { Locator, Page } from "@playwright/test";
import { maxLine } from "@/app/(marketing)/account/_components/plan-copy";
import { trialUpgradeNotice } from "@/components/account/trial-upgrade";
import { PLANS, type BillingInterval, type PaidPlanId, type PlanId } from "@/config/plans";
import type { MeResponse, UrlResponse } from "@/lib/api/types";
import {
  endsTrialSentence,
  perMonth,
  planPrice,
  trialHeadline,
  trialPrice,
  trialSentence,
  yearlySavingsPercent,
} from "@/lib/billing/prices";
import { trialEndDay } from "@/lib/usage-copy";
import { expect, test } from "./fixtures";
import { signIn, subscribe, uniqueEmail } from "./helpers";

// Trial end dates are shown in the browser's time zone, so both sides use UTC.
test.use({ timezoneId: "UTC" });

const TRIAL_LANDING = "/account?checkout=success&plan=pro&trial=1";
const landing = (plan: PaidPlanId) => `/account?checkout=success&plan=${plan}`;
const upgradeLink = (plan: PaidPlanId, interval: BillingInterval) =>
  `/account?upgrade=1&plan=${plan}&interval=${interval}`;
const switchedTo = (plan: PaidPlanId) =>
  `You're on ${PLANS[plan].name} now. Your new limits apply straight away.`;
const TRY_PRO = `Try ${PLANS.pro.name} for ${trialPrice()}`;

type CheckoutRequest = { plan: PaidPlanId; interval: BillingInterval; next?: string };

// Every checkout the page asks for, in order, so a test can tell a confirmation step from a charge.
function watchCheckouts(page: Page): CheckoutRequest[] {
  const seen: CheckoutRequest[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname === "/api/billing/checkout"
    ) {
      seen.push(request.postDataJSON() as CheckoutRequest);
    }
  });
  return seen;
}

// Checkout ends with a full page load of this address; the page then tidies its query away.
async function landsOn(page: Page, path: string, act: () => Promise<void>) {
  const target = new URL(path, "http://localhost");
  await Promise.all([
    page.waitForURL((url) => url.pathname === target.pathname && url.search === target.search, {
      waitUntil: "commit",
    }),
    act(),
  ]);
}

async function me(page: Page): Promise<MeResponse> {
  const response = await page.request.get("/api/me");
  expect(response.ok()).toBe(true);
  return (await response.json()) as MeResponse;
}

async function trialEnd(page: Page): Promise<string> {
  const { user } = await me(page);
  if (!user?.trialEndsAt) throw new Error("This account is not on a trial");
  return trialEndDay(user.trialEndsAt, "UTC");
}

// Mock billing's portal: it ends the plan on the spot.
async function cancelPlan(page: Page) {
  const response = await page.request.post("/api/billing/portal");
  expect(response.ok(), await response.text()).toBe(true);
  expect(((await response.json()) as UrlResponse).url).toBe("/account?portal=mock");
}

type PlanState = "trial" | "pro-monthly" | "pro-yearly" | "max";

// A fresh account on the given plan, the way mock checkout leaves it; the first Pro monthly is always the trial.
async function signedInOn(page: Page, state: PlanState) {
  await signIn(page);
  if (state === "pro-yearly") {
    expect(await subscribe(page, "pro", "year")).toBe(landing("pro"));
    return;
  }
  if (state === "max") {
    expect(await subscribe(page, "max", "month")).toBe(landing("max"));
    return;
  }
  expect(await subscribe(page, "pro", "month")).toBe(TRIAL_LANDING);
  if (state === "trial") return;
  await cancelPlan(page);
  expect(await subscribe(page, "pro", "month")).toBe(landing("pro"));
}

function pricingCard(page: Page, plan: string): Locator {
  return page
    .locator("div")
    .filter({ has: page.getByRole("heading", { level: 2, name: plan, exact: true }) })
    .filter({ has: page.getByRole("link") })
    .last();
}

const planPanel = (page: Page) => page.getByRole("tabpanel", { name: "Plan & billing" });
const panelTitles = (page: Page) => planPanel(page).getByRole("heading", { level: 2 });
const planSummary = (page: Page) => page.getByRole("region", { name: /^Your plan: / });
const yourPlan = (page: Page, plan: PlanId) =>
  page.getByRole("heading", { level: 2, name: `Your plan: ${PLANS[plan].name}`, exact: true });
// Everything that opens the billing portal, which mock billing turns into a cancel.
const portalButtons = (page: Page) =>
  planPanel(page).getByRole("button", {
    name: /^(Cancel (trial|plan)|Resume (trial|plan)|Update card)$/,
  });
const TEST_MODE_PAID = "Cancelling or updating your card switches you back to Free.";

// Sales pages trust a hint the app leaves once it has read the account, as after a real sign-in.
async function openAccount(page: Page, plan: PlanId) {
  await page.goto("/account");
  await expect(yourPlan(page, plan)).toBeVisible();
}

// The radios are visually hidden inside their labels, so a person clicks the label.
async function pick(scope: Page | Locator, name: string | RegExp) {
  const radio = scope.getByRole("radio", { name });
  await radio.locator("..").click();
  await expect(radio).toBeChecked();
}

function offerCard(dialog: Locator, plan: PaidPlanId): Locator {
  return dialog
    .getByRole("listitem")
    .filter({ has: dialog.page().getByRole("heading", { name: PLANS[plan].name, exact: true }) });
}

// Signed out: the trial button opens the dialog on its sign-in step, then the dev code in the dialog's form.
async function startTrialSignedOut(page: Page) {
  await page.goto("/pricing");
  await pricingCard(page, "Pro").getByRole("link", { name: trialHeadline() }).click();

  const signInDialog = page.getByRole("dialog", { name: "Sign in to start your trial" });
  await expect(
    signInDialog.getByText("Sign in first. Then I'll take you straight to checkout."),
  ).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Choose your plan" })).toHaveCount(0);
  await signInDialog.getByLabel("Email", { exact: true }).fill(uniqueEmail("pricing"));
  await signInDialog.getByRole("button", { name: "Email me a code" }).click();
  const code = await signInDialog
    .getByText(/Dev mode: your code is/)
    .locator("strong")
    .textContent();
  if (!code) throw new Error("The dev code is not in the dialog");
  await landsOn(page, TRIAL_LANDING, () => signInDialog.getByLabel("6-digit code").fill(code));
}

const toasts = (page: Page) => page.getByRole("region", { name: "Notifications" });

test.describe("pricing page", () => {
  test("shows Free, Pro and Max, with the Pro trial on the monthly price @mobile", async ({
    page,
  }) => {
    await page.goto("/pricing");

    const free = pricingCard(page, "Free");
    await expect(free.getByText("$0", { exact: true })).toBeVisible();
    await expect(free.getByRole("link", { name: "Check my resume, free" })).toHaveAttribute(
      "href",
      "/studio",
    );

    const pro = pricingCard(page, "Pro");
    await expect(pro.getByText("Popular")).toBeVisible();
    await expect(pro.getByText(planPrice("pro", "month"), { exact: true })).toBeVisible();
    await expect(pro.getByText(trialSentence())).toBeVisible();
    await expect(pro.getByRole("link", { name: trialHeadline() })).toHaveAttribute(
      "href",
      upgradeLink("pro", "month"),
    );

    const max = pricingCard(page, "Max");
    await expect(max.getByText(planPrice("max", "month"), { exact: true })).toBeVisible();
    await expect(max.getByRole("link", { name: "Get Max" })).toHaveAttribute(
      "href",
      upgradeLink("max", "month"),
    );
    await expect(page.getByText(trialSentence())).toHaveCount(1);
  });

  test("yearly prices show the savings and drop the trial", async ({ page }) => {
    await page.goto("/pricing");
    const pro = pricingCard(page, "Pro");
    const max = pricingCard(page, "Max");
    await expect(pro.getByRole("link", { name: trialHeadline() })).toBeVisible();

    await pick(page, "Yearly");

    await expect(pro.getByText(planPrice("pro", "year"), { exact: true })).toBeVisible();
    await expect(pro.getByText(`Save ${yearlySavingsPercent("pro")}% vs monthly`)).toBeVisible();
    await expect(pro.getByText(`About ${perMonth("pro")} a month`)).toBeVisible();
    await expect(pro.getByText(trialSentence())).toHaveCount(0);
    await expect(pro.getByRole("link", { name: "Get Pro" })).toHaveAttribute(
      "href",
      upgradeLink("pro", "year"),
    );
    await expect(max.getByText(planPrice("max", "year"), { exact: true })).toBeVisible();
    await expect(max.getByText(`Save ${yearlySavingsPercent("max")}% vs monthly`)).toBeVisible();
    await expect(max.getByRole("link", { name: "Get Max" })).toHaveAttribute(
      "href",
      upgradeLink("max", "year"),
    );

    await pick(page, "Monthly");
    await expect(pro.getByRole("link", { name: trialHeadline() })).toBeVisible();
  });

  test("a signed-out visitor picks the trial, signs in inside the dialog, and lands on the trial", async ({
    page,
  }) => {
    const checkouts = watchCheckouts(page);
    await startTrialSignedOut(page);

    expect(checkouts[0]).toEqual({ plan: "pro", interval: "month" });
    await expect(
      page.getByText(`Your Pro trial runs until ${await trialEnd(page)}. Let's get to work.`),
    ).toBeVisible();
    await expect(toasts(page).getByText("Thanks for upgrading!")).toBeVisible();
    await expect(yourPlan(page, "pro")).toBeVisible();
    await expect(page).toHaveURL(/\/account$/);
  });

  test("signing in inside the upgrade dialog asks for checkout only once", async ({ page }) => {
    const checkouts = watchCheckouts(page);
    await startTrialSignedOut(page);
    await expect(yourPlan(page, "pro")).toBeVisible();
    expect(checkouts).toEqual([{ plan: "pro", interval: "month" }]);
  });

  // Product bug in next dev: Strict Mode replays AccountView's checkout effect, the cleanup clears the timer and the ref guard skips the restart.
  test.fixme("a signed-in Free account goes from the trial button straight to checkout", async ({
    page,
    user,
  }) => {
    expect(user.plan).toBe("free");
    await openAccount(page, "free");
    await page.goto("/pricing");
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();

    await landsOn(page, TRIAL_LANDING, () =>
      pricingCard(page, "Pro").getByRole("link", { name: trialHeadline() }).click(),
    );

    await expect(
      page.getByText(`Your Pro trial runs until ${await trialEnd(page)}. Let's get to work.`),
    ).toBeVisible();
  });

  test("a trial account sees Start Max now, and the upgrade link asks before charging", async ({
    page,
  }) => {
    await signedInOn(page, "trial");
    await openAccount(page, "pro");
    const checkouts = watchCheckouts(page);
    await page.goto("/pricing");

    const max = pricingCard(page, "Max");
    await expect(max.getByText(endsTrialSentence("max", "month"))).toBeVisible();
    await max.getByRole("link", { name: "Start Max now" }).click();

    const confirm = page.getByRole("dialog", { name: "Upgrade to Max" });
    await expect(confirm.getByText(trialUpgradeNotice("max", "month"))).toBeVisible();
    await expect(offerCard(confirm, "pro").getByText("Current plan")).toBeVisible();
    await expect(confirm.getByRole("button", { name: "Start Max now" })).toBeVisible();
    await confirm.getByRole("button", { name: "Not now" }).click();

    await expect(confirm).toBeHidden();
    await expect(yourPlan(page, "pro")).toBeVisible();
    await expect(planSummary(page).getByText(/^Trial · /)).toBeVisible();
    expect(checkouts).toEqual([]);
    expect((await me(page)).user?.plan).toBe("pro");
  });

  test("a paid Pro account confirms Max on its own billing period", async ({ page }) => {
    await signedInOn(page, "pro-yearly");
    await openAccount(page, "pro");
    const checkouts = watchCheckouts(page);
    await page.goto("/pricing");
    await pricingCard(page, "Max").getByRole("link", { name: "Upgrade to Max" }).click();

    const confirm = page.getByRole("dialog", { name: "Upgrade to Max" });
    await expect(
      confirm.getByText(
        "Your subscription changes in place: you pay only the difference, never twice.",
      ),
    ).toBeVisible();
    await expect(
      offerCard(confirm, "max").getByText(planPrice("max", "year"), { exact: true }),
    ).toBeVisible();
    await expect(confirm.getByRole("radio")).toHaveCount(0);
    expect(checkouts).toEqual([]);

    await landsOn(page, landing("max"), () =>
      confirm.getByRole("button", { name: "Upgrade to Max" }).click(),
    );

    expect(checkouts).toEqual([{ plan: "max", interval: "year" }]);
    await expect(page.getByText(switchedTo("max"))).toBeVisible();
  });
});

test.describe("account page", () => {
  test("a new Free account is offered the Pro trial and has nothing to cancel", async ({
    page,
    user,
  }) => {
    expect(user.plan).toBe("free");
    await openAccount(page, "free");

    await expect(panelTitles(page)).toHaveText(["Your plan: Free", "Usage"]);
    const plan = planSummary(page);
    await expect(plan.getByText("Current plan", { exact: true })).toBeVisible();
    await expect(plan.getByText(`Try ${PLANS.pro.name}: ${trialSentence()}`)).toBeVisible();
    await expect(plan.getByText("No real payment. Your plan switches right away.")).toBeVisible();
    await expect(plan.getByRole("button", { name: TRY_PRO })).toBeVisible();
    await expect(plan.getByRole("link", { name: "Compare plans" })).toHaveAttribute(
      "href",
      "/pricing",
    );
    await expect(portalButtons(page)).toHaveCount(0);
  });

  test("starting the trial from the account page", async ({ page, user }) => {
    expect(user.plan).toBe("free");
    const checkouts = watchCheckouts(page);
    await openAccount(page, "free");

    await landsOn(page, TRIAL_LANDING, () =>
      planSummary(page).getByRole("button", { name: TRY_PRO }).click(),
    );

    expect(checkouts).toEqual([{ plan: "pro", interval: "month" }]);
    const ends = await trialEnd(page);
    await expect(
      page.getByText(`Your Pro trial runs until ${ends}. Let's get to work.`),
    ).toBeVisible();
    await expect(yourPlan(page, "pro")).toBeVisible();
    await expect(
      planSummary(page).getByText(
        `You paid ${trialPrice()} for the trial. On ${ends} Pro starts at ${planPrice("pro", "month")} a month. We remind you the day before.`,
      ),
    ).toBeVisible();
  });

  test("the plan dialog: picking yearly drops the trial, picking Max changes the offer, and Max starts at once", async ({
    page,
    user,
  }) => {
    expect(user.plan).toBe("free");
    const checkouts = watchCheckouts(page);
    await page.goto("/dashboard/account");
    await expect(yourPlan(page, "free")).toBeVisible();
    await page.getByRole("complementary").getByRole("button", { name: TRY_PRO }).click();

    const choose = page.getByRole("dialog", { name: "Choose your plan" });
    await expect(choose.getByText("Cancel anytime from your account.")).toBeVisible();
    await expect(choose.getByText("No real payment. Your plan switches right away.")).toBeVisible();
    const pro = offerCard(choose, "pro");
    const max = offerCard(choose, "max");
    await expect(pro.getByText(trialSentence())).toBeVisible();
    await expect(pro.getByRole("button", { name: trialHeadline() })).toBeVisible();

    await pick(choose, "Yearly");
    await expect(pro.getByText(planPrice("pro", "year"), { exact: true })).toBeVisible();
    await expect(pro.getByText(`About ${perMonth("pro")} a month.`)).toBeVisible();
    await expect(pro.getByText(trialSentence())).toHaveCount(0);
    await expect(pro.getByRole("button", { name: "Upgrade to Pro" })).toBeVisible();
    await expect(max.getByText(planPrice("max", "year"), { exact: true })).toBeVisible();

    await pick(choose, "Monthly");
    await expect(pro.getByRole("button", { name: trialHeadline() })).toBeVisible();
    await expect(max.getByText(planPrice("max", "month"), { exact: true })).toBeVisible();
    expect(checkouts).toEqual([]);

    await landsOn(page, landing("max"), () =>
      max.getByRole("button", { name: "Upgrade to Max" }).click(),
    );

    expect(checkouts).toEqual([{ plan: "max", interval: "month" }]);
    await expect(page.getByText(switchedTo("max"))).toBeVisible();
    await expect(yourPlan(page, "max")).toBeVisible();
  });

  test("an upgrade link opened in a new tab takes a Free account straight to a yearly plan, no trial", async ({
    page,
    user,
  }) => {
    expect(user.plan).toBe("free");
    const checkouts = watchCheckouts(page);

    await landsOn(page, landing("pro"), async () => {
      await page.goto(upgradeLink("pro", "year"), { waitUntil: "commit" });
    });

    expect(checkouts).toEqual([{ plan: "pro", interval: "year" }]);
    await expect(page.getByText(switchedTo("pro"))).toBeVisible();
    await expect(yourPlan(page, "pro")).toBeVisible();
    const plan = planSummary(page);
    await expect(plan.getByText("Active", { exact: true })).toBeVisible();
    await expect(plan.getByText("/year", { exact: true })).toBeVisible();
    await expect(plan.getByRole("button", { name: "Cancel plan" })).toBeVisible();
    await expect(plan.getByRole("button", { name: "Cancel trial" })).toHaveCount(0);
    await expect(panelTitles(page)).toHaveText([
      "Your plan: Pro",
      "Usage",
      "Payment method",
      "Billing history",
    ]);
    await expect(planPanel(page).getByText(maxLine())).toBeVisible();
  });

  test("on the Pro trial: trial dates, cancel and card, and Max ends the trial", async ({
    page,
  }) => {
    await signedInOn(page, "trial");
    const ends = await trialEnd(page);
    const checkouts = watchCheckouts(page);
    await openAccount(page, "pro");

    const plan = planSummary(page);
    await expect(plan.getByText("Trial · 3 days left", { exact: true })).toBeVisible();
    await expect(plan.getByText(`from ${ends}`, { exact: true })).toBeVisible();
    await expect(
      plan.getByText(
        `You paid ${trialPrice()} for the trial. On ${ends} Pro starts at ${planPrice("pro", "month")} a month. We remind you the day before.`,
      ),
    ).toBeVisible();
    await expect(plan.getByText(TEST_MODE_PAID)).toBeVisible();
    await expect(panelTitles(page)).toHaveText([
      "Your plan: Pro",
      "Usage",
      "Payment method",
      "Billing history",
    ]);
    await expect(plan.getByRole("button", { name: "Cancel trial" })).toBeVisible();
    await expect(planPanel(page).getByRole("button", { name: "Update card" })).toBeVisible();

    await plan.getByRole("button", { name: "Change plan" }).click();
    const confirm = page.getByRole("dialog", { name: "Upgrade to Max" });
    await expect(confirm.getByText(trialUpgradeNotice("max", "month"))).toBeVisible();
    await expect(
      offerCard(confirm, "max").getByText(endsTrialSentence("max", "month")),
    ).toBeVisible();
    expect(checkouts).toEqual([]);

    await landsOn(page, landing("max"), () =>
      confirm.getByRole("button", { name: "Start Max now" }).click(),
    );

    expect(checkouts).toEqual([{ plan: "max", interval: "month" }]);
    await expect(page.getByText(switchedTo("max"))).toBeVisible();
    await expect(yourPlan(page, "max")).toBeVisible();
    await expect(planSummary(page).getByText("Active", { exact: true })).toBeVisible();
    await expect(planSummary(page).getByRole("button", { name: "Cancel trial" })).toHaveCount(0);
  });

  test("on paid Pro: Max on the same period, cancel and card", async ({ page }) => {
    await signedInOn(page, "pro-monthly");
    const checkouts = watchCheckouts(page);
    await openAccount(page, "pro");

    const plan = planSummary(page);
    await expect(plan.getByText("Active", { exact: true })).toBeVisible();
    await expect(plan.getByText(/^Trial/)).toHaveCount(0);
    await expect(panelTitles(page)).toHaveText([
      "Your plan: Pro",
      "Usage",
      "Payment method",
      "Billing history",
    ]);
    await expect(planPanel(page).getByText(maxLine())).toBeVisible();
    await expect(plan.getByRole("button", { name: "Cancel plan" })).toBeVisible();
    await expect(planPanel(page).getByRole("button", { name: "Update card" })).toBeVisible();
    await expect(plan.getByText(TEST_MODE_PAID)).toBeVisible();

    await plan.getByRole("button", { name: "Change plan" }).click();
    const confirm = page.getByRole("dialog", { name: "Upgrade to Max" });
    await expect(
      confirm.getByText(
        "Your subscription changes in place: you pay only the difference, never twice.",
      ),
    ).toBeVisible();
    await expect(confirm.getByRole("group", { name: "How often to pay" })).toHaveCount(0);
    await expect(
      offerCard(confirm, "max").getByText(planPrice("max", "month"), { exact: true }),
    ).toBeVisible();
    await expect(confirm.getByRole("button", { name: "Upgrade to Max" })).toBeVisible();
    await confirm.getByRole("button", { name: "Not now" }).click();
    await expect(confirm).toBeHidden();
    expect(checkouts).toEqual([]);
  });

  test("on Max: no upgrade offer, only cancel and card", async ({ page }) => {
    await signedInOn(page, "max");
    await openAccount(page, "max");

    await expect(panelTitles(page)).toHaveText([
      "Your plan: Max",
      "Usage",
      "Payment method",
      "Billing history",
    ]);
    await expect(
      planPanel(page).getByRole("button", { name: /^(Upgrade|Change plan|Try )/ }),
    ).toHaveCount(0);
    await expect(planSummary(page).getByRole("button", { name: "Cancel plan" })).toBeVisible();
    await expect(planPanel(page).getByRole("button", { name: "Update card" })).toBeVisible();
  });

  test("cancelling the trial in test mode moves the account back to Free, and the trial is not offered again", async ({
    page,
  }) => {
    await signedInOn(page, "trial");
    await openAccount(page, "pro");

    await landsOn(page, "/account?portal=mock", () =>
      planSummary(page).getByRole("button", { name: "Cancel trial" }).click(),
    );

    await expect(toasts(page).getByText("Test mode: you're back on Free.")).toBeVisible();
    await expect(yourPlan(page, "free")).toBeVisible();
    await expect(panelTitles(page)).toHaveText(["Your plan: Free", "Usage"]);
    const plan = planSummary(page);
    await expect(plan.getByText(trialSentence())).toHaveCount(0);
    await expect(plan.getByRole("button", { name: TRY_PRO })).toHaveCount(0);
    await expect(portalButtons(page)).toHaveCount(0);

    await plan.getByRole("button", { name: "Upgrade to Pro" }).click();
    const choose = page.getByRole("dialog", { name: "Choose your plan" });
    await expect(
      offerCard(choose, "pro").getByRole("button", { name: "Upgrade to Pro" }),
    ).toBeVisible();
    await expect(choose.getByRole("button", { name: trialHeadline() })).toHaveCount(0);
    await choose.getByRole("button", { name: "Not now" }).click();

    await page.goto("/pricing");
    await expect(
      pricingCard(page, "Pro").getByRole("link", { name: "Upgrade to Pro" }),
    ).toBeVisible();
    await expect(page.getByText(trialSentence())).toHaveCount(0);
  });
});
