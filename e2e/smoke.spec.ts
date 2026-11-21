import { expect, test } from "./fixtures";
import { sampleResume, seedResume, signInWithForm } from "./helpers";

test("the home page loads @mobile", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: /See your resume/ })).toBeVisible();
});

test("the pricing page loads", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { level: 1, name: /Free for the basics/ })).toBeVisible();
});

test("signing in with the dev code opens the dashboard", async ({ page }) => {
  await signInWithForm(page);
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("a seeded resume shows on the dashboard", async ({ page, user }) => {
  expect(user.plan).toBe("free");
  const title = `Seeded ${Date.now().toString(36)}`;
  await seedResume(page, { ...sampleResume(), title });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
});
