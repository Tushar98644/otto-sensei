import type { Page, Response } from "@playwright/test";
import { expect, test } from "./fixtures";
import {
  createPortfolio,
  portfolioResume,
  proOwner,
  type PortfolioPerson,
  publishPortfolio,
  signOut,
  skipDashboardIntro,
  uniqueSlug,
} from "./fixtures/portfolio-setup";
import { seedResume, signIn, subscribe } from "./helpers";

const EDITOR = "/dashboard/portfolio";
const UNAVAILABLE = "This link doesn't work";

function editorTab(page: Page, name: "Design" | "Content" | "Sections" | "Settings") {
  return page.getByRole("tab", { name, exact: true });
}

function previewPane(page: Page) {
  return page.getByRole("region", { name: "Preview", exact: true });
}

function liveLink(page: Page, slug: string) {
  return page.getByRole("link", { name: `/p/${slug} (opens in a new tab)` });
}

function contentPath(response: Response, method: string): boolean {
  return (
    response.request().method() === method &&
    new URL(response.url()).pathname === "/api/portfolio/content"
  );
}

function contentLoaded(page: Page): Promise<Response> {
  return page.waitForResponse((response) => contentPath(response, "GET"), { timeout: 60_000 });
}

function contentSaved(page: Page, text: string): Promise<Response> {
  return page.waitForResponse(
    (response) =>
      contentPath(response, "PUT") && (response.request().postData() ?? "").includes(text),
  );
}

// The way in from the app; a fresh load of the editor's own address can't save (see the fixme below).
async function openEditor(page: Page, owner: PortfolioPerson): Promise<void> {
  await skipDashboardIntro(page);
  await page.goto("/dashboard");
  // The card draws only once the app runs; a click before that is a full load, the fixme's case.
  await expect(
    page.getByRole("button", { name: `More actions for ${owner.resume.title}` }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Dashboard" })
    .getByRole("link", { name: "Portfolio", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard\/portfolio$/);
}

test("a Pro user makes a portfolio from the resume and design they pick", async ({ page }) => {
  await signIn(page);
  await subscribe(page, "pro", "month");
  const older = portfolioResume("Older resume");
  const newer = portfolioResume("Newer resume");
  await seedResume(page, { ...older.resume, updatedAt: older.resume.updatedAt - 60_000 });
  await seedResume(page, newer.resume);

  await page.goto(EDITOR);
  await expect(page.getByRole("heading", { name: "Pick a design" })).toBeVisible();
  await expect(
    page.getByText("You can switch designs any time. Nothing goes live until you publish.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByLabel("Make it from").selectOption({ label: older.resume.title });
  // Paper, not the default Navy, so the page shows it was made with the picked design.
  await page.getByRole("button", { name: "Use this design: Paper" }).click();

  await expect(page.getByText("Draft", { exact: true })).toBeVisible();
  await expect(
    page.getByText("I filled this in from your resume. Nothing goes live until you publish."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish" })).toBeEnabled();
  await expect(page.getByRole("radio", { name: /Paper/ })).toBeChecked();
  await expect(previewPane(page).getByText("Paper · as visitors see it")).toBeVisible();

  await editorTab(page, "Settings").click();
  await expect(page.getByLabel("Your page lives at /p/")).toHaveValue(older.slug);
  await expect(page.getByLabel("Resume", { exact: true })).toHaveValue(older.resume.id);

  // A draft stays private until it is published.
  await signOut(page);
  await page.goto(`/p/${older.slug}`);
  await expect(page.getByRole("heading", { name: UNAVAILABLE })).toBeVisible();
});

test("Make my portfolio on a resume card opens the editor with that resume", async ({
  page,
  user,
}) => {
  expect(user.plan).toBe("free");
  const owner = await proOwner(page, "Card resume");
  await skipDashboardIntro(page);

  await page.goto("/dashboard");
  await page.getByRole("button", { name: `More actions for ${owner.resume.title}` }).click();
  await page.getByRole("menuitem", { name: "Make my portfolio" }).click();

  await expect(page).toHaveURL(/\/dashboard\/portfolio$/);
  await expect(page.getByText("Draft", { exact: true })).toBeVisible();
  await editorTab(page, "Settings").click();
  await expect(page.getByLabel("Your page lives at /p/")).toHaveValue(owner.slug);
  await expect(page.getByLabel("Resume", { exact: true })).toHaveValue(owner.resume.id);
});

test("edits to the content, design and sections show on the live page", async ({ page, user }) => {
  expect(user.plan).toBe("free");
  const owner = await proOwner(page);
  await createPortfolio(page, owner.resume);
  await publishPortfolio(page);
  const pitch = `I write launch stories that sales teams reuse ${Date.now().toString(36)}.`;

  const loaded = contentLoaded(page);
  await openEditor(page, owner);
  await expect(page.getByText("Live", { exact: true })).toBeVisible();
  await expect(page.getByText("Saved to your live page", { exact: true })).toBeVisible();

  await editorTab(page, "Content").click();
  // An edit typed before the saved content arrives is dropped (see the fixme below).
  await (await loaded).finished();
  const content = page.getByRole("tabpanel", { name: "Content" });
  await content.getByText("Intro", { exact: true }).click();
  const saved = contentSaved(page, pitch);
  await content.getByLabel("Pitch", { exact: true }).fill(pitch);
  await expect(page.getByText("Saving…", { exact: true })).toBeVisible();
  expect((await saved).ok()).toBe(true);
  await expect(page.getByText("Saved to your live page", { exact: true })).toBeVisible();

  await editorTab(page, "Design").click();
  await expect(previewPane(page).getByText("Navy · as visitors see it")).toBeVisible();
  // The radio itself is visually hidden; people pick the design's card.
  await page.getByRole("group", { name: "Design" }).getByText("Dock", { exact: true }).click();
  await expect(page.getByRole("radio", { name: /Dock/ })).toBeChecked();
  await expect(previewPane(page).getByText("Dock · as visitors see it")).toBeVisible();
  await expect(page.getByText("Saved to your live page", { exact: true })).toBeVisible();

  await editorTab(page, "Sections").click();
  const experience = page.getByRole("checkbox", { name: "Experience" });
  await expect(experience).toBeChecked();
  await experience.uncheck();
  await expect(
    page
      .getByRole("tabpanel", { name: "Sections" })
      .getByText("Hidden on your page", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Saved to your live page", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("radio", { name: /Dock/ })).toBeChecked();
  await editorTab(page, "Content").click();
  await content.getByText("Intro", { exact: true }).click();
  await expect(content.getByLabel("Pitch", { exact: true })).toHaveValue(pitch);

  await signOut(page);
  await page.goto(`/p/${owner.slug}`);
  await expect(page.getByRole("heading", { level: 1, name: /Hi, I.m Robin/ })).toBeVisible();
  await expect(page.getByText(pitch)).toBeVisible();
  await expect(page.getByText("Hi, my name is")).toHaveCount(0);
  await expect(page.getByText("Brightloop")).toHaveCount(0);
});

test("publishing checks the address while you type", async ({ page }) => {
  const taken = uniqueSlug("taken");
  await signIn(page);
  const other = await proOwner(page, "Other resume");
  await createPortfolio(page, other.resume, { slug: taken });

  await signIn(page);
  const owner = await proOwner(page);
  await createPortfolio(page, owner.resume);
  const wanted = uniqueSlug("robin-live");

  await openEditor(page, owner);
  await editorTab(page, "Settings").click();
  const address = page.getByLabel("Your page lives at /p/");
  const save = page.getByRole("button", { name: "Save", exact: true });
  await expect(address).toHaveValue(owner.slug);
  await expect(page.getByText("Lowercase letters, numbers and hyphens.")).toBeVisible();

  await address.fill("ab");
  await expect(page.getByText("Use at least 3 letters or numbers.")).toBeVisible();
  await expect(address).toHaveAttribute("aria-invalid", "true");
  await expect(save).toBeDisabled();

  await address.fill("admin");
  await expect(page.getByText("That address is kept for the app. Try another.")).toBeVisible();
  await expect(save).toBeDisabled();

  await address.fill(taken);
  await expect(page.getByText("Someone already has that address. Try another.")).toBeVisible();
  await expect(address).toHaveAttribute("aria-invalid", "true");
  await expect(save).toBeDisabled();

  // Typed the way a person would: capitals and spaces become a lowercase, hyphenated address.
  await address.fill("");
  await address.pressSequentially(wanted.toUpperCase().replaceAll("-", " "));
  await expect(page.getByText(`/p/${wanted} is free.`)).toBeVisible();
  await expect(address).not.toHaveAttribute("aria-invalid", "true");
  await save.click();
  await expect(address).toHaveValue(wanted);
  await expect(save).toBeHidden();

  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Your page is live", { exact: true })).toBeVisible();
  await expect(page.getByText("Live", { exact: true })).toBeVisible();
  await expect(liveLink(page, wanted)).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy link" })).toBeVisible();
  await expect(
    page.getByText("Changing it keeps the old address working for 90 days."),
  ).toBeVisible();

  await signOut(page);
  await page.goto(`/p/${wanted}`);
  await expect(page.getByRole("heading", { name: `${owner.name}.` })).toBeVisible();
});

test("a signed-out visitor sees the published page @mobile", async ({ page, user }) => {
  expect(user.plan).toBe("free");
  const owner = await proOwner(page);
  await createPortfolio(page, owner.resume);
  await publishPortfolio(page);
  await signOut(page);

  await page.goto(`/p/${owner.slug.toUpperCase()}`);
  await expect(page).toHaveURL(new RegExp(`/p/${owner.slug}$`));
  await expect(page).toHaveTitle(`${owner.name} - Portfolio`);
  await expect(page.getByRole("heading", { name: `${owner.name}.` })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Product Marketing Manager." })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Brightloop" })).toBeVisible();
  // Email and phone start off, so the page never hands them out unasked.
  await expect(page.getByText(owner.resume.basics.email)).toHaveCount(0);
  await expect(page.getByText(owner.resume.basics.phone)).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByRole("button", { name: "Publish" })).toHaveCount(0);
});

test("changing a live page's address keeps the old one working", async ({ page, user }) => {
  expect(user.plan).toBe("free");
  const owner = await proOwner(page);
  const before = uniqueSlug("robin-old");
  const after = uniqueSlug("robin-new");
  await createPortfolio(page, owner.resume, { slug: before });
  await publishPortfolio(page);

  await openEditor(page, owner);
  await expect(liveLink(page, before)).toBeVisible();
  await editorTab(page, "Settings").click();
  await expect(
    page.getByText("Changing it keeps the old address working for 90 days."),
  ).toBeVisible();
  const address = page.getByLabel("Your page lives at /p/");
  await address.fill(after);
  await expect(page.getByText(`/p/${after} is free.`)).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(liveLink(page, after)).toBeVisible();

  await signOut(page);
  await page.goto(`/p/${before}`);
  await expect(page).toHaveURL(new RegExp(`/p/${after}$`));
  await expect(page.getByRole("heading", { name: `${owner.name}.` })).toBeVisible();
});

test("taking the page down shows visitors that the link doesn't work", async ({ page, user }) => {
  expect(user.plan).toBe("free");
  const owner = await proOwner(page);
  await createPortfolio(page, owner.resume);
  await publishPortfolio(page);

  await openEditor(page, owner);
  const [visit] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("link", { name: "Open page (opens in a new tab)" }).click(),
  ]);
  await expect(visit).toHaveURL(new RegExp(`/p/${owner.slug}$`));
  await expect(visit.getByRole("heading", { name: `${owner.name}.` })).toBeVisible();

  await page.getByRole("button", { name: "More page actions" }).click();
  await page.getByRole("menuitem", { name: /Take down/ }).click();
  await expect(page.getByText("Your page is down", { exact: true })).toBeVisible();
  await expect(page.getByText("Draft", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish" })).toBeVisible();
  await expect(liveLink(page, owner.slug)).toHaveCount(0);

  await visit.reload();
  await expect(visit.getByRole("heading", { name: UNAVAILABLE })).toBeVisible();
  await expect(visit.getByText(owner.name)).toHaveCount(0);

  await signOut(page);
  await page.goto(`/p/${owner.slug}`);
  await expect(page.getByRole("heading", { name: UNAVAILABLE })).toBeVisible();
});

test("a Free account is offered Pro instead of the editor", async ({ page, user }) => {
  expect(user.plan).toBe("free");
  const person = portfolioResume();
  await seedResume(page, person.resume);

  await page.goto(EDITOR);
  // The sidebar carries its own Try Pro slip, so the offer is looked for on the page itself.
  const main = page.getByRole("main");
  await expect(
    main.getByRole("heading", { name: "A real portfolio, live at your own link" }),
  ).toBeVisible();
  await expect(main.getByText(`/p/${person.slug}`)).toBeVisible();
  await expect(main.getByRole("button", { name: /^Try Pro/ })).toBeVisible();
  await expect(main.getByRole("button", { name: "Preview Paper full page" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /^Use this design/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Publish" })).toHaveCount(0);
});

// Product bug: on a full page load the first render has no user yet, so usePortfolio caches an empty ["portfolio", ""] query, and savePortfolio reads that one and gives up without saving or saying so.
test.fixme("Publish works after opening the editor straight from its address", async ({
  page,
  user,
}) => {
  expect(user.plan).toBe("free");
  const owner = await proOwner(page);
  await createPortfolio(page, owner.resume);

  await page.goto(EDITOR);
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Your page is live", { exact: true })).toBeVisible();
  await expect(liveLink(page, owner.slug)).toBeVisible();
});

// Product bug: the Content tab takes typing before the saved content arrives, then the arriving copy replaces the edit while the bar says it is saved.
test.fixme("an edit typed while the content is still loading is kept", async ({ page, user }) => {
  expect(user.plan).toBe("free");
  const owner = await proOwner(page);
  await createPortfolio(page, owner.resume);
  const pitch = `Typed before the content arrived ${Date.now().toString(36)}.`;
  let release = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/portfolio/content", async (route) => {
    if (route.request().method() === "GET") await held;
    await route.continue();
  });

  await openEditor(page, owner);
  await editorTab(page, "Content").click();
  const content = page.getByRole("tabpanel", { name: "Content" });
  await content.getByText("Intro", { exact: true }).click();
  const saved = contentSaved(page, pitch);
  await content.getByLabel("Pitch", { exact: true }).fill(pitch);
  release();
  expect((await saved).ok()).toBe(true);
});
