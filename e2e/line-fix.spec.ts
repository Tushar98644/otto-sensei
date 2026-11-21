import type { Locator, Page } from "@playwright/test";
import { PLANS } from "@/config/plans";
import { newBullet, newId, type Resume } from "@/lib/resume/schema";
import { expect, test } from "./fixtures";
import { sampleResume, seedResume, uniqueEmail } from "./helpers";

const JOB = { title: "Support Lead", company: "Fernway" };
const OWNER = `${JOB.title} at ${JOB.company}`;

// The demo fixer is deterministic, so each line's suggestion is known.
const LINES = [
  {
    text: "Helped launch 3 regional support hubs that cut reply times by 40%.",
    issue: 'Swap "Helped" for what you did',
    suggestion: "Launch 3 regional support hubs that cut reply times by 40%",
  },
  {
    text: "Responsible for onboarding new support hires.",
    issue: '"Responsible for" reads like a job description.',
    suggestion: "Onboarding new support hires [result]",
  },
  {
    text: "Helped plan 6 customer workshops that brought in 900 sign-ups.",
    issue: 'Swap "Helped" for what you did',
    suggestion: "Plan 6 customer workshops that brought in 900 sign-ups",
  },
  {
    text: "Handled customer escalations for the enterprise accounts.",
    issue: 'Swap "Handled" for what you did',
    suggestion: "Customer escalations for the enterprise accounts [result]",
  },
] as const;

const FREE_FIXES = PLANS.free.limits.fix;
const DEMO_NOTE = "Demo mode: these are sample suggestions.";
const NUMBERS_QUESTION = "Roughly how many people, dollars, or hours did this affect?";
const RESULT_QUESTION = "What changed because of this work?";

const fixesLeft = (left: number) => `${left} of ${FREE_FIXES} fixes left this month`;
const freeUsed = `You've used this month's ${FREE_FIXES} line fixes. ${PLANS.pro.name} has ${PLANS.pro.limits.fix.toLocaleString("en-US")} a month.`;

function lineFixResume(): Resume {
  return {
    ...sampleResume(),
    title: `Line fix ${Math.random().toString(36).slice(2, 8)}`,
    experience: [
      {
        id: newId(),
        title: JOB.title,
        company: JOB.company,
        location: "Remote",
        startDate: "Jan 2021",
        endDate: "Present",
        bullets: LINES.map((line) => newBullet(line.text)),
      },
    ],
    projects: [],
  };
}

function line(page: Page, n: number, owner = OWNER): Locator {
  return page.getByRole("textbox", { name: `Line ${n} ${owner}`, exact: true });
}

function lineRow(page: Page, n: number, owner = OWNER): Locator {
  return page
    .getByRole("list", { name: "What you did" })
    .getByRole("listitem")
    .filter({ has: line(page, n, owner) });
}

function fixDialog(page: Page): Locator {
  return page.getByRole("dialog", { name: "Fix this line" });
}

function ottosVersion(dialog: Locator): Locator {
  return dialog.getByRole("region", { name: "Otto's version" });
}

async function openFixStep(page: Page): Promise<void> {
  await page.goto("/studio");
  // Desktop shows every step; the phone layout only has previous and next.
  const step = page
    .getByRole("navigation", { name: "Studio steps" })
    .getByRole("button", { name: /^(?:Next step: )?Fix lines$/ });
  await expect(step).toBeEnabled({ timeout: 45_000 });
  await step.click();
  await expect(line(page, 1)).toBeVisible();
}

function fixButton(page: Page, n: number, owner = OWNER): Locator {
  return lineRow(page, n, owner).getByRole("button", { name: "Fix with Otto" });
}

async function askOtto(
  page: Page,
  n: number,
  { owner = OWNER, by = "mouse" }: { owner?: string; by?: "mouse" | "keyboard" } = {},
): Promise<Locator> {
  const button = fixButton(page, n, owner);
  await (by === "mouse" ? button.click() : button.press("Enter"));
  const dialog = fixDialog(page);
  await expect(dialog).toBeVisible();
  return dialog;
}

async function keepMine(dialog: Locator): Promise<void> {
  await dialog.getByRole("button", { name: "Keep mine" }).click();
  await expect(dialog).toBeHidden();
}

test.beforeEach(async ({ page }) => {
  // A returning visitor: the first-run tours are already seen, so their tips never cover a line.
  await page.addInitScript(() => {
    try {
      const seen = new Date().toISOString();
      localStorage.setItem("otto.tour.studio", seen);
      localStorage.setItem("otto.tour.dashboard", seen);
    } catch {}
  });
});

test.describe("fixing a line with Otto", () => {
  test("a Free user uses Otto's version of a weak line, then undoes it @mobile", async ({
    page,
    user,
  }) => {
    expect(user.plan).toBe("free");
    await seedResume(page, lineFixResume());
    await openFixStep(page);
    const [weak] = LINES;

    const dialog = await askOtto(page, 1);
    await expect(
      dialog.getByText("Here's a stronger version. Keep it, edit it, or skip it."),
    ).toBeVisible();
    await expect(dialog).toContainText(weak.text);
    await expect(dialog.getByRole("listitem").filter({ hasText: weak.issue })).toBeVisible();
    const suggestion = ottosVersion(dialog);
    await expect(suggestion).toContainText(weak.suggestion);
    await expect(suggestion.getByText("New line", { exact: true })).toBeVisible();
    await expect(dialog.getByRole("note")).toContainText(DEMO_NOTE);
    await expect(dialog.getByText(fixesLeft(FREE_FIXES - 1))).toBeVisible();

    await dialog.getByRole("button", { name: "Use this line" }).click();
    await expect(dialog).toBeHidden();
    await expect(line(page, 1)).toHaveValue(weak.suggestion);
    await expect(line(page, 2)).toHaveValue(LINES[1].text);

    await page.getByRole("button", { name: "Undo: Otto fixed a line" }).click();
    await expect(line(page, 1)).toHaveValue(weak.text);
  });

  test("Keep mine, Escape and Close leave the line as it was, and reopening it costs nothing", async ({
    page,
    user,
  }) => {
    expect(user.plan).toBe("free");
    await seedResume(page, lineFixResume());
    await openFixStep(page);
    const [weak] = LINES;
    const left = fixesLeft(FREE_FIXES - 1);

    let dialog = await askOtto(page, 1);
    await expect(ottosVersion(dialog)).toContainText(weak.suggestion);
    await expect(dialog.getByText(left)).toBeVisible();
    await keepMine(dialog);
    await expect(line(page, 1)).toHaveValue(weak.text);

    dialog = await askOtto(page, 1);
    await expect(ottosVersion(dialog)).toContainText(weak.suggestion);
    await expect(dialog.getByText(left)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(line(page, 1)).toHaveValue(weak.text);

    dialog = await askOtto(page, 1);
    await expect(dialog.getByText(left)).toBeVisible();
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden();
    await expect(line(page, 1)).toHaveValue(weak.text);
  });

  test("blanks in Otto's version are filled by answering its questions", async ({ page, user }) => {
    expect(user.plan).toBe("free");
    await seedResume(page, lineFixResume());
    await openFixStep(page);
    const duty = LINES[1];

    const dialog = await askOtto(page, 2);
    await expect(
      dialog.getByText(
        "Quick question first. I only use facts you give me, never made-up numbers.",
      ),
    ).toBeVisible();
    await expect(dialog.getByText("2 questions")).toBeVisible();
    await expect(dialog.getByRole("listitem").filter({ hasText: duty.issue })).toBeVisible();
    const suggestion = ottosVersion(dialog);
    await expect(suggestion).toContainText(duty.suggestion);
    await expect(suggestion.getByText("Fill the blanks", { exact: true })).toBeVisible();
    await expect(suggestion).toContainText("Words in [brackets] are blanks for your real facts.");
    await expect(dialog.getByRole("button", { name: "Use this line" })).toBeDisabled();
    await expect(dialog.getByText(fixesLeft(FREE_FIXES - 1))).toBeVisible();

    const questions = dialog.getByRole("form", { name: "A few quick questions" });
    const update = questions.getByRole("button", { name: "Update suggestion" });
    await expect(update).toBeDisabled();
    await expect(questions.getByText("Answer at least one to update it.")).toBeVisible();
    await questions.getByLabel(NUMBERS_QUESTION).fill("24 new hires a year");
    await questions
      .getByLabel(RESULT_QUESTION)
      .fill("Time to first solo ticket fell from 3 weeks to 1");
    await expect(update).toBeEnabled();
    await update.click();

    const answered =
      "Onboarding new support hires, 24 new hires a year, time to first solo ticket fell from 3 weeks to 1";
    await expect(suggestion).toContainText(answered);
    await expect(suggestion.getByText("New line", { exact: true })).toBeVisible();
    await expect(questions).toBeHidden();
    // Updating the suggestion is a second fix.
    await expect(dialog.getByText(fixesLeft(FREE_FIXES - 2))).toBeVisible();

    await dialog.getByRole("button", { name: "Use this line" }).click();
    await expect(dialog).toBeHidden();
    await expect(line(page, 2)).toHaveValue(answered);
  });

  test("Otto's version can be edited before it goes on the resume", async ({ page, user }) => {
    expect(user.plan).toBe("free");
    await seedResume(page, lineFixResume());
    await openFixStep(page);
    const vague = LINES[3];

    const dialog = await askOtto(page, 4);
    await expect(ottosVersion(dialog)).toContainText(vague.suggestion);
    await dialog.getByRole("button", { name: "Edit before using" }).click();

    const draft = dialog.getByRole("textbox", { name: "Your version" });
    await expect(draft).toBeFocused();
    await expect(draft).toHaveValue(vague.suggestion);
    await expect(
      dialog.getByText("Swap the [blanks] for your real facts before you use it."),
    ).toBeVisible();

    const mine =
      "Resolved customer escalations for the enterprise accounts within one business day";
    await draft.fill(mine);
    await expect(
      dialog.getByText(
        "Change anything you like. Nothing changes on your resume until you use it.",
      ),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Use this line" }).click();
    await expect(dialog).toBeHidden();
    await expect(line(page, 4)).toHaveValue(mine);
    await expect(line(page, 1)).toHaveValue(LINES[0].text);
  });

  // Product bug: the focused line's tip collapses on mousedown, so this button moves and the click is lost.
  test.fixme("after closing Otto's dialog, one click on another line's Fix with Otto opens it", async ({
    page,
    user,
  }) => {
    expect(user.plan).toBe("free");
    await seedResume(page, lineFixResume());
    await openFixStep(page);

    const dialog = await askOtto(page, 1);
    await expect(ottosVersion(dialog)).toContainText(LINES[0].suggestion);
    await keepMine(dialog);

    await askOtto(page, 3);
    await expect(ottosVersion(fixDialog(page))).toContainText(LINES[2].suggestion);
  });

  test("the Free allowance counts down, and the fix after the last one offers an upgrade", async ({
    page,
    user,
  }) => {
    expect(user.plan).toBe("free");
    expect(FREE_FIXES).toBe(3);
    await seedResume(page, lineFixResume());
    await openFixStep(page);

    // Keyboard, not the mouse: a click on another line right after a fix is lost (see the fixme test).
    const byKeyboard = { by: "keyboard" } as const;
    let dialog = await askOtto(page, 1, byKeyboard);
    await expect(ottosVersion(dialog)).toContainText(LINES[0].suggestion);
    await expect(dialog.getByText(fixesLeft(2))).toBeVisible();
    await keepMine(dialog);

    dialog = await askOtto(page, 3, byKeyboard);
    await expect(ottosVersion(dialog)).toContainText(LINES[2].suggestion);
    await expect(dialog.getByText(fixesLeft(1))).toBeVisible();
    await keepMine(dialog);

    dialog = await askOtto(page, 4, byKeyboard);
    await expect(ottosVersion(dialog)).toContainText(LINES[3].suggestion);
    await expect(
      dialog.getByText(
        new RegExp(
          `^No fixes left this month\\. They reset .+\\. ${PLANS.pro.name} has ${PLANS.pro.limits.fix} a month\\.$`,
        ),
      ),
    ).toBeVisible();
    await keepMine(dialog);

    await fixButton(page, 2).press("Enter");
    const upgrade = page
      .getByRole("dialog")
      .filter({ has: page.getByRole("button", { name: "Not now" }) });
    await expect(upgrade).toBeVisible();
    await expect(upgrade).toContainText(freeUsed);
    await upgrade.getByRole("button", { name: "Not now" }).click();
    await expect(upgrade).toBeHidden();

    dialog = fixDialog(page);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(freeUsed)).toBeVisible();
    await expect(ottosVersion(dialog)).toBeHidden();
    await expect(dialog.getByRole("button", { name: "Try again" })).toBeVisible();
    await keepMine(dialog);
    await expect(line(page, 2)).toHaveValue(LINES[1].text);

    await page.goto("/dashboard");
    const stat = page.getByText("Line fixes left", { exact: true }).locator("xpath=..");
    await expect(stat).toContainText(new RegExp(`Line fixes left\\s*0\\s*of ${FREE_FIXES}`));
  });

  test("a signed-out visitor signs in from the prompt and gets Otto's suggestion", async ({
    page,
  }) => {
    await page.goto("/studio");
    await page.getByRole("button", { name: /^Try a sample/ }).click();
    const owner = "Product Marketing Manager at Brightloop";
    const duty = "Responsible for creating sales enablement materials for the sales team.";
    await expect(line(page, 2, owner)).toHaveValue(duty);

    await fixButton(page, 2, owner).click();
    const signIn = page.getByRole("dialog", { name: "Sign in" });
    await expect(signIn).toBeVisible();
    await expect(signIn).toContainText(
      `Sign in to fix lines with me. On Free you get ${FREE_FIXES} a month.`,
    );
    await expect(fixDialog(page)).toBeHidden();

    await signIn.getByLabel("Email", { exact: true }).fill(uniqueEmail("line-fix"));
    await signIn.getByRole("button", { name: "Email me a code" }).click();
    const code = await signIn
      .getByText(/Dev mode: your code is/)
      .locator("strong")
      .textContent();
    expect(code).toMatch(/^\d{6}$/);
    await signIn.getByLabel("6-digit code").fill(code ?? "");
    await expect(signIn).toBeHidden();

    const dialog = fixDialog(page);
    await expect(dialog).toBeVisible();
    await expect(ottosVersion(dialog)).toContainText(
      "Creating sales enablement materials for the sales team [result]",
    );
    await expect(dialog.getByText(fixesLeft(FREE_FIXES - 1))).toBeVisible();
    await keepMine(dialog);
    await expect(line(page, 2, owner)).toHaveValue(duty);
  });
});
