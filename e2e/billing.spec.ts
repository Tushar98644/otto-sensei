import type { Locator, Page } from "@playwright/test";
import {
  trialUpgradeButton,
  trialUpgradeCharge,
  trialUpgradeNotice,
} from "@/components/account/trial-upgrade";
import { PLANS, type BillingInterval, type PaidPlanId, type PlanId } from "@/config/plans";
import type { MeResponse, UrlResponse } from "@/lib/api/types";
import {
  endsTrialSentence,
  perMonth,
  planPrice,
  planPriceLabel,
  priceSentence,
  trialHeadline,
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

type CheckoutRequest = { plan: PaidPlanId; interval: BillingInterval };

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

// Mock billing's Manage billing: it ends the plan on the spot.
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

function planSection(page: Page, billed: boolean): Locator {
  return page.getByRole("region", { name: billed ? "Plan and billing" : "Plan", exact: true });
}

function profileSection(page: Page): Locator {
  return page.getByRole("region", { name: "Profile", exact: true });
}

// Sales pages trust a hint the app leaves once it has read the account, as after a real sign-in.
async function openAccount(page: Page, plan: PlanId) {
  await page.goto("/account");
  await expect(
    profileSection(page).getByText(`${PLANS[plan].name} plan`, { exact: true }),
  ).toBeVisible();
}

// The radios are visually hidden inside their labels, so a person clicks the label.
async function pick(scope: Page | Locator, name: string | RegExp) {
  const radio = scope.getByRole("radio", { name });
  await radio.locator("..").click();
  await expect(radio).toBeChecked();
}

// Signed out: the trial button, the plan dialog, then the dev code in the dialog's sign-in form.
async function startTrialSignedOut(page: Page) {
  await page.goto("/pricing");
  await pricingCard(page, "Pro").getByRole("link", { name: trialHeadline() }).click();

  const choose = page.getByRole("dialog", { name: "Choose your plan" });
  await expect(choose.getByText("Cancel anytime from your account.")).toBeVisible();
  await expect(choose.getByText("No real payment. Your plan switches right away.")).toBeVisible();
  await expect(choose.getByRole("button", { name: "Upgrade to Max" })).toBeVisible();
  await choose.getByRole("button", { name: trialHeadline() }).click();

  const signInDialog = page.getByRole("dialog", { name: "Sign in to start your trial" });
  await signInDialog.getByLabel("Email", { exact: true }).fill(uniqueEmail("pricing"));
  await signInDialog.getByRole("button", { name: "Email me a code" }).click();
  const code = await signInDialog
    .getByText(/Dev mode: your code is/)
    .locator("strong")
    .textContent();
  if (!code) throw new Error("The dev code is not in the dialog");
  await landsOn(page, TRIAL_LANDING, () => signInDialog.getByLabel("6-digit code").fill(code));
}

const cardTitles = (section: Locator) => section.getByRole("heading", { level: 3 });
const manageBilling = (page: Page) => page.getByRole("button", { name: "Manage billing" });
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
    await expect(pro.getByText("Most popular")).toBeVisible();
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
    await expect(profileSection(page).getByText("Pro plan", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/account$/);
  });

  // Product bug: the dialog and the account page behind it both start checkout, so the second fails with an error toast.
  test.fixme("signing in inside the upgrade dialog asks for checkout only once", async ({
    page,
  }) => {
    const checkouts = watchCheckouts(page);
    await startTrialSignedOut(page);
    await expect(profileSection(page).getByText("Pro plan", { exact: true })).toBeVisible();
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
    await expect(confirm.getByText("Current plan")).toBeVisible();
    await expect(confirm.getByRole("button", { name: "Start Max now" })).toBeVisible();
    await confirm.getByRole("button", { name: "Not now" }).click();

    await expect(confirm).toBeHidden();
    await expect(cardTitles(planSection(page, true))).toHaveText([
      "Your trial",
      "Go Max",
      "Billing",
    ]);
    expect(checkouts).toEqual([]);
    expect((await me(page)).user?.plan).toBe("pro");
  });

  test("a paid Pro account confirms Max on its own billing period", async ({ page }) => {
    await signedInOn(page, "pro-yearly");
    await openAccount(page, "pro");
    const checkouts = watchCheckouts(page);
    await page.goto("/pricing");
    await pricingCard(page, "Max").getByRole("link", { name: "Get Max" }).click();

    const confirm = page.getByRole("dialog", { name: "Upgrade to Max" });
    await expect(
      confirm.getByText(
        "Your subscription changes in place: you pay only the difference, never twice.",
      ),
    ).toBeVisible();
    await expect(confirm.getByText(planPrice("max", "year"), { exact: true })).toBeVisible();
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
  test("a new Free account is offered the Pro trial and has no Manage billing", async ({
    page,
    user,
  }) => {
    expect(user.plan).toBe("free");
    await openAccount(page, "free");

    const plan = planSection(page, false);
    await expect(cardTitles(plan)).toHaveText(["Otto's AI help", trialHeadline()]);
    await expect(plan.getByText(trialSentence())).toBeVisible();
    await expect(plan.getByText("No real payment. Your plan switches right away.")).toBeVisible();
    await expect(
      plan.getByRole("button", { name: `Start my ${PLANS.pro.name} trial` }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Plan and billing" })).toHaveCount(0);
    await expect(manageBilling(page)).toHaveCount(0);
  });

  test("starting the trial from the account page", async ({ page, user }) => {
    expect(user.plan).toBe("free");
    const checkouts = watchCheckouts(page);
    await openAccount(page, "free");

    await landsOn(page, TRIAL_LANDING, () =>
      planSection(page, false).getByRole("button", { name: "Start my Pro trial" }).click(),
    );

    expect(checkouts).toEqual([{ plan: "pro", interval: "month" }]);
    const ends = await trialEnd(page);
    await expect(
      page.getByText(`Your Pro trial runs until ${ends}. Let's get to work.`),
    ).toBeVisible();
    await expect(
      profileSection(page).getByText(
        `Pro trial until ${ends}. Then ${planPriceLabel("pro", "month")}, unless you cancel before.`,
      ),
    ).toBeVisible();
  });

  test("picking Max or yearly changes the offer, and Max starts at once", async ({
    page,
    user,
  }) => {
    expect(user.plan).toBe("free");
    const checkouts = watchCheckouts(page);
    await openAccount(page, "free");
    const plan = planSection(page, false);
    await expect(cardTitles(plan)).toHaveText(["Otto's AI help", trialHeadline()]);

    await pick(plan, "Yearly");
    await expect(cardTitles(plan)).toHaveText(["Otto's AI help", "Go Pro"]);
    await expect(plan.getByText(priceSentence("pro", "year"))).toBeVisible();
    await expect(plan.getByRole("button", { name: "Upgrade to Pro" })).toBeVisible();

    await pick(plan, "Monthly");
    await pick(plan, /^Max/);
    await expect(cardTitles(plan)).toHaveText(["Otto's AI help", "Go Max"]);
    await expect(plan.getByText(planPrice("max", "month"), { exact: true })).toBeVisible();

    await landsOn(page, landing("max"), () =>
      plan.getByRole("button", { name: "Upgrade to Max" }).click(),
    );

    expect(checkouts).toEqual([{ plan: "max", interval: "month" }]);
    await expect(page.getByText(switchedTo("max"))).toBeVisible();
    await expect(profileSection(page).getByText("Max plan", { exact: true })).toBeVisible();
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
    const profile = profileSection(page);
    await expect(profile.getByText("Pro plan", { exact: true })).toBeVisible();
    await expect(profile.getByText(/trial until/)).toHaveCount(0);
    await expect(cardTitles(planSection(page, true))).toHaveText([
      "This month",
      "Go Max",
      "Billing",
    ]);
  });

  test("on the Pro trial: trial dates, Manage billing, and Max ends the trial", async ({
    page,
  }) => {
    await signedInOn(page, "trial");
    const ends = await trialEnd(page);
    const checkouts = watchCheckouts(page);
    await openAccount(page, "pro");

    await expect(profileSection(page).getByText(`Pro trial until ${ends}.`)).toBeVisible();
    const plan = planSection(page, true);
    await expect(cardTitles(plan)).toHaveText(["Your trial", "Go Max", "Billing"]);
    await expect(
      plan.getByText(`Cancel before ${ends} and Pro won't start, so you won't pay anything more.`),
    ).toBeVisible();
    await expect(plan.getByText("Managing billing switches you back to Free.")).toBeVisible();
    await expect(manageBilling(page)).toBeVisible();
    await expect(
      plan.getByText(`${endsTrialSentence("max", "month")} ${trialUpgradeCharge("max", "month")}`),
    ).toBeVisible();

    await landsOn(page, landing("max"), () =>
      plan.getByRole("button", { name: trialUpgradeButton("max", "month") }).click(),
    );

    expect(checkouts).toEqual([{ plan: "max", interval: "month" }]);
    await expect(page.getByText(switchedTo("max"))).toBeVisible();
    await expect(profileSection(page).getByText(/trial until/)).toHaveCount(0);
  });

  test("on paid Pro: Max on the same period, and Manage billing", async ({ page }) => {
    await signedInOn(page, "pro-monthly");
    await openAccount(page, "pro");

    await expect(profileSection(page).getByText(/trial until/)).toHaveCount(0);
    const plan = planSection(page, true);
    await expect(cardTitles(plan)).toHaveText(["This month", "Go Max", "Billing"]);
    await expect(
      plan.getByText("Even more for a long, busy search. Your subscription changes in place."),
    ).toBeVisible();
    await expect(plan.getByRole("group", { name: "How often to pay" })).toHaveCount(0);
    await expect(plan.getByRole("button", { name: "Upgrade to Max" })).toBeVisible();
    await expect(
      plan.getByText("Update your card, get invoices, or cancel your plan."),
    ).toBeVisible();
    await expect(manageBilling(page)).toBeVisible();
  });

  test("on Max: no upgrade offer, only Manage billing", async ({ page }) => {
    await signedInOn(page, "max");
    await openAccount(page, "max");

    const plan = planSection(page, true);
    await expect(cardTitles(plan)).toHaveText(["This month", "Billing"]);
    await expect(plan.getByRole("button", { name: /^Upgrade/ })).toHaveCount(0);
    await expect(manageBilling(page)).toBeVisible();
  });

  test("Manage billing in test mode moves the account back to Free, and the trial is not offered again", async ({
    page,
  }) => {
    await signedInOn(page, "trial");
    await openAccount(page, "pro");

    await landsOn(page, "/account?portal=mock", () => manageBilling(page).click());

    await expect(toasts(page).getByText("Test mode: you're back on Free.")).toBeVisible();
    await expect(profileSection(page).getByText("Free plan", { exact: true })).toBeVisible();
    const plan = planSection(page, false);
    await expect(cardTitles(plan)).toHaveText(["Otto's AI help", "Go Pro"]);
    await expect(plan.getByRole("button", { name: "Upgrade to Pro" })).toBeVisible();
    await expect(manageBilling(page)).toHaveCount(0);

    await page.goto("/pricing");
    await expect(pricingCard(page, "Pro").getByRole("link", { name: "Get Pro" })).toBeVisible();
    await expect(page.getByText(trialSentence())).toHaveCount(0);
  });
});
