import type { Locator, Page } from "@playwright/test";
import type { Application } from "@/lib/applications/schema";
import { trialHeadline } from "@/lib/billing/prices";
import type { Resume } from "@/lib/resume/schema";
import { expect, test } from "./fixtures";
import { sampleResume, seedResume, signIn, subscribe } from "./helpers";

const JOB = {
  title: "Product Designer",
  company: "Acme Robotics",
  post: [
    "Acme Robotics is hiring a Product Designer to shape the tools our customers use to plan warehouse robot fleets.",
    "You will run customer interviews, turn research into flows and prototypes, and work with engineers from the first sketch to launch.",
    "Requirements: four or more years of product design for B2B software, a portfolio of shipped work, and comfort presenting to customers.",
  ].join("\n\n"),
};
const ROLE_LINE = `${JOB.title} at ${JOB.company}`;
const DEMO_NOTE = "Demo mode: these are sample suggestions. Add an AI key for real ones.";
const PRO_ONLY = "Letters, outreach messages, answers and interview prep come with Pro.";
const LOCKED =
  "With Pro, I write cover letters, answers and outreach messages from your resume. Here's an example.";
// A page, API route or lazy dialog compiles on first use, which is slow on a cold or busy machine.
const firstLoad = expect.configure({ timeout: 45_000 });

function titled(label: string, resume: Resume = sampleResume()): Resume {
  return { ...resume, title: `${label} ${Math.random().toString(36).slice(2, 8)}` };
}

// The demo letter quotes the first bullet, so a blank in it shows up as a fill-in warning.
function withBlank(resume: Resume, line: string): Resume {
  return {
    ...resume,
    experience: resume.experience.map((job, index) =>
      index === 0
        ? {
            ...job,
            bullets: job.bullets.map((bullet, at) =>
              at === 0 ? { ...bullet, text: line } : bullet,
            ),
          }
        : job,
    ),
  };
}

// A fresh account on the Pro trial, which allows 15 letters, answers and messages.
async function proTrial(page: Page): Promise<void> {
  expect((await signIn(page)).plan).toBe("free");
  await subscribe(page);
}

async function trackApplication(page: Page): Promise<Application> {
  const response = await page.request.post("/api/applications", {
    data: { company: JOB.company, role: JOB.title, appliedAt: Date.now() },
  });
  expect(response.status(), await response.text()).toBe(201);
  return ((await response.json()) as { application: Application }).application;
}

async function openLetters(page: Page): Promise<void> {
  await page.goto("/dashboard/letters");
  await firstLoad(
    page.getByRole("heading", { level: 1, name: "Letters", exact: true }),
  ).toBeVisible();
}

// "Start writing" while the list is empty, "Write" in the header once it isn't.
function writeButton(page: Page, name: "Start writing" | "Write"): Locator {
  return page.getByRole("button", { name, exact: true });
}

function row(page: Page, name: string): Locator {
  return page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { level: 3, name, exact: true }) });
}

async function pasteJob(dialog: Locator, withDetails: boolean): Promise<void> {
  await dialog.getByRole("button", { name: "No link? Paste the job text" }).click();
  if (withDetails) {
    await dialog.getByText("More options", { exact: true }).click();
    await dialog.getByLabel("Job title").fill(JOB.title);
    await dialog.getByLabel("Company").fill(JOB.company);
  }
  await dialog.getByLabel("Job post").fill(JOB.post);
}

async function writeLetter(page: Page, resume: Resume): Promise<Locator> {
  await writeButton(page, "Start writing").click();
  const composer = page.getByRole("dialog", { name: "Write a cover letter" });
  await firstLoad(composer).toContainText(
    `Written from ${resume.title}, the resume you edited last.`,
  );
  await expect(composer.getByRole("button", { name: "Cover letter", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await pasteJob(composer, true);
  await composer.getByRole("button", { name: "Write my letter" }).click();
  await firstLoad(composer).toBeHidden();
  const letter = page.getByRole("dialog", { name: ROLE_LINE });
  await firstLoad(letter).toBeVisible();
  return letter;
}

async function replaceIn(box: Locator, from: string, to: string): Promise<void> {
  const text = await box.inputValue();
  expect(text).toContain(from);
  await box.fill(text.replaceAll(from, to));
}

test("a Free account sees an example letter and is offered Pro instead of writing one", async ({
  page,
  user,
}) => {
  expect(user.plan).toBe("free");
  await seedResume(page, titled("Free letters"));
  await openLetters(page);
  await firstLoad(page.getByText(LOCKED)).toBeVisible();
  const example = page.getByRole("region", {
    name: "Cover letter for Senior Product Marketing Manager",
  });
  await expect(example).toContainText("Every fact comes from the resume. Nothing is made up.");
  await expect(example).toContainText("reached 1,200 paying teams");
  await expect(writeButton(page, "Start writing")).toHaveCount(0);
  await expect(writeButton(page, "Write")).toHaveCount(0);

  await page.getByRole("button", { name: trialHeadline(), exact: true }).click();
  const upgrade = page.getByRole("dialog").filter({ hasText: PRO_ONLY });
  await firstLoad(upgrade).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Write a cover letter" })).toHaveCount(0);
  await upgrade.getByRole("button", { name: "Not now" }).click();
  await expect(upgrade).toBeHidden();
});

test("a Pro trial writes a cover letter from a pasted job post and keeps it", async ({ page }) => {
  await proTrial(page);
  const resume = await seedResume(page, titled("Letter source"));
  await openLetters(page);
  await firstLoad(writeButton(page, "Start writing")).toBeVisible();
  await expect(writeButton(page, "Write")).toHaveCount(0);

  await writeButton(page, "Start writing").click();
  const composer = page.getByRole("dialog", { name: "Write a cover letter" });
  await firstLoad(composer).toBeVisible();
  await pasteJob(composer, true);
  await expect(
    composer.getByText(/^15 of 15 cover letters, messages and answers left this trial\.$/),
  ).toBeVisible();
  await composer.getByRole("button", { name: "Close" }).click();
  await expect(composer).toBeHidden();

  const letter = await writeLetter(page, resume);
  await expect(letter).toContainText(`From “${resume.title}”`);
  await expect(letter.getByText(DEMO_NOTE)).toBeVisible();
  const box = letter.getByLabel("Cover letter");
  await expect(box).toHaveValue(/^Dear Acme Robotics team,/);
  await expect(box).toHaveValue(/I'm applying for the Product Designer at Acme Robotics\./);
  await expect(box).toHaveValue(/Best regards,\nJordan Ellis$/);
  await expect(letter.getByText(/^\d+ words$/)).toBeVisible();
  await expect(letter.getByRole("button", { name: "Download PDF" })).toBeEnabled();
  await letter.getByRole("button", { name: "Close" }).click();
  await expect(letter).toBeHidden();

  const saved = row(page, JOB.company);
  await expect(saved).toContainText("Letter");
  await expect(saved).toContainText(JOB.title);
  await expect(saved).not.toContainText("Not saved");

  await page.reload();
  await firstLoad(row(page, JOB.company)).toContainText(JOB.title);
  await expect(page.getByText("1 letter, each written for one job.")).toBeVisible();
  await expect(writeButton(page, "Start writing")).toHaveCount(0);
  await writeButton(page, "Write").click();
  const again = page.getByRole("dialog", { name: "Write a cover letter" });
  await pasteJob(again, false);
  await expect(again.getByText(/^14 of 15 cover letters/)).toBeVisible();
});

test("a fill-in warning on a letter clears once the blank is filled, and the edit is saved", async ({
  page,
}) => {
  await proTrial(page);
  const resume = await seedResume(
    page,
    withBlank(
      titled("Blank letter"),
      "Cut onboarding time for new sales hires by [X]% with a self-serve tour",
    ),
  );
  await openLetters(page);
  await firstLoad(writeButton(page, "Start writing")).toBeVisible();

  const letter = await writeLetter(page, resume);
  const check = letter.getByRole("status").filter({ hasText: "Check before you send it" });
  await expect(check).toContainText("Fill in [X] before you send it. Otto never guesses numbers.");
  const box = letter.getByLabel("Cover letter");
  await expect(box).toHaveValue(/I cut onboarding time for new sales hires by \[X\]%/);

  await replaceIn(box, "[X]", "30");
  await expect(check).toHaveCount(0);
  await box.blur();
  await firstLoad(letter.getByText("Saved", { exact: true })).toBeVisible();
  await letter.getByRole("button", { name: "Close" }).click();

  await page.reload();
  await firstLoad(row(page, JOB.company)).toBeVisible();
  await row(page, JOB.company).getByRole("button", { name: "Open" }).click();
  const reopened = page.getByRole("dialog", { name: ROLE_LINE });
  await expect(reopened.getByLabel("Cover letter")).toHaveValue(/by 30% with a self-serve tour/);
  await expect(reopened.getByText("Check before you send it")).toHaveCount(0);
});

test("an answer needs the question and flags the part only you can write", async ({ page }) => {
  await proTrial(page);
  await seedResume(page, titled("Answer source"));
  await openLetters(page);
  await firstLoad(writeButton(page, "Start writing")).toBeVisible();
  await writeButton(page, "Start writing").click();
  const letterComposer = page.getByRole("dialog", { name: "Write a cover letter" });
  await firstLoad(letterComposer).toBeVisible();
  await expect(letterComposer.getByLabel("The question")).toHaveCount(0);
  await letterComposer
    .getByRole("group", { name: "What to write" })
    .getByRole("button", { name: "Answer", exact: true })
    .click();

  const composer = page.getByRole("dialog", { name: "Answer an application question" });
  await expect(composer).toBeVisible();
  await expect(composer.getByRole("button", { name: "Answer", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(composer.getByLabel("The question")).toBeVisible();
  await pasteJob(composer, true);
  await composer.getByRole("button", { name: "Draft my answer" }).click();
  await expect(composer.getByText("Paste the question from the application first.")).toBeVisible();
  await expect(composer.getByLabel("The question")).toBeFocused();

  const question = "Why do you want to work at Acme Robotics?";
  await composer.getByLabel("The question").fill(question);
  await composer.getByRole("button", { name: "Draft my answer" }).click();
  await firstLoad(composer).toBeHidden();

  const answer = page.getByRole("dialog", { name: ROLE_LINE });
  await firstLoad(answer).toContainText(question);
  const check = answer.getByRole("status").filter({ hasText: "Check before you send it" });
  await expect(check).toContainText(
    "Fill in [Add your own reason here.] with your own words before you send it.",
  );
  const box = answer.getByLabel("Answer", { exact: true });
  await replaceIn(
    box,
    "[Add your own reason here.]",
    "I have planned robot fleets with your tools in two past roles.",
  );
  await expect(check).toHaveCount(0);
  await box.blur();
  await firstLoad(answer.getByText("Saved", { exact: true })).toBeVisible();
  await expect(answer.getByRole("button", { name: "Download PDF" })).toHaveCount(0);
  await answer.getByRole("button", { name: "Close" }).click();

  await page.reload();
  const saved = row(page, JOB.company);
  await firstLoad(saved).toContainText("Answer");
  await expect(saved).toContainText(question);
  await saved.getByRole("button", { name: "Open" }).click();
  await expect(
    page.getByRole("dialog", { name: ROLE_LINE }).getByLabel("Answer", { exact: true }),
  ).toHaveValue(/I have planned robot fleets with your tools in two past roles\./);
});

test("a cover letter written from a tracked application stays with it", async ({ page }) => {
  await proTrial(page);
  await seedResume(page, titled("Hub letter"));
  const application = await trackApplication(page);
  await page.goto(`/dashboard/applications/${application.id}`);
  await firstLoad(page.getByRole("heading", { level: 1, name: JOB.company })).toBeVisible();
  await firstLoad(page.getByText("No letter or message yet.", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: "Write a cover letter" }).click();
  const composer = page.getByRole("dialog", { name: "Write a cover letter" });
  await firstLoad(composer).toBeVisible();
  await composer.getByRole("button", { name: "No link? Paste the job text" }).click();
  await expect(composer.getByLabel("Job title")).toHaveValue(JOB.title);
  await expect(composer.getByLabel("Company")).toHaveValue(JOB.company);
  await composer.getByLabel("Job post").fill(JOB.post);
  await composer.getByRole("button", { name: "Write my letter" }).click();
  await firstLoad(composer).toBeHidden();
  await firstLoad(page.getByText("Letter kept with this application")).toBeVisible();
  await expect(page.getByText("Dear Acme Robotics team,", { exact: false })).toBeVisible();

  await page.getByRole("link", { name: "All letters and messages" }).click();
  await expect(page).toHaveURL(/\/dashboard\/letters$/);
  const saved = row(page, JOB.company);
  await firstLoad(saved).toContainText("Letter");
  await expect(saved.getByRole("link", { name: /open the application/ })).toHaveAttribute(
    "href",
    `/dashboard/applications/${application.id}`,
  );
});

test("a Free account is offered Pro instead of an outreach message", async ({ page, user }) => {
  expect(user.plan).toBe("free");
  await seedResume(page, titled("Free outreach"));
  const application = await trackApplication(page);
  await page.goto(`/dashboard/applications/${application.id}`);
  const start = page.getByRole("button", { name: /^Write an outreach message/ });
  await firstLoad(start).toContainText("Pro");

  await start.click();
  const upgrade = page.getByRole("dialog").filter({ hasText: PRO_ONLY });
  await firstLoad(upgrade).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Write an outreach message" })).toHaveCount(0);
});

test("a Pro trial writes an outreach message, fills in the name and keeps the edits", async ({
  page,
}) => {
  await proTrial(page);
  const resume = await seedResume(page, titled("Outreach source"));
  const application = await trackApplication(page);
  await page.goto(`/dashboard/applications/${application.id}`);
  await firstLoad(page.getByRole("heading", { level: 1, name: JOB.company })).toBeVisible();

  await firstLoad(page.getByRole("button", { name: "Write an outreach message" })).toBeVisible();
  await page.getByRole("button", { name: "Write an outreach message" }).click();
  const composer = page.getByRole("dialog", { name: "Write an outreach message" });
  await firstLoad(composer).toContainText(`For ${ROLE_LINE}, from ${resume.title}.`);
  const write = composer.getByRole("button", { name: "Write my message" });
  await firstLoad(composer.getByText("Checking for a message you already wrote.")).toHaveCount(0);
  await write.click();
  await expect(composer.getByText("Paste the job post first.")).toBeVisible();
  await composer.getByLabel("The job post").fill(JOB.post);
  await write.click();

  const message = page.getByRole("dialog", { name: "Your outreach message" });
  await firstLoad(message.getByText("Saved to Letters", { exact: true })).toBeVisible();
  await expect(message.getByText(DEMO_NOTE)).toBeVisible();
  const subject = message.getByLabel("Email subject");
  const email = message.getByLabel("Email", { exact: true });
  const note = message.getByLabel("LinkedIn note");
  await expect(subject).toHaveValue(ROLE_LINE);
  await expect(email).toHaveValue(
    /^Hi \[first name\],\n\nI'm applying for the Product Designer at Acme Robotics\./,
  );
  await expect(note).toHaveValue(/^Hi \[first name\], /);
  const check = message.getByRole("status").filter({ hasText: "Check before you send it" });
  await expect(check).toContainText(
    "Swap [first name] for the name of the person you're writing to.",
  );
  await expect(
    message.getByText("Your email still says [first name].", { exact: false }),
  ).toBeVisible();

  await replaceIn(email, "[first name]", "Sam");
  await expect(message.getByText("Your email still says", { exact: false })).toHaveCount(0);
  await expect(check).toBeVisible();
  const noteSaved = page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH" &&
      response.url().includes("/api/writings/") &&
      String((response.request().postDataJSON() as { note?: string } | null)?.note).startsWith(
        "Hi Sam, ",
      ),
  );
  await replaceIn(note, "[first name]", "Sam");
  await expect(check).toHaveCount(0);
  await note.blur();
  expect((await noteSaved).ok()).toBe(true);
  await expect(message.getByText("Saved to Letters", { exact: true })).toBeVisible();
  await message.getByRole("button", { name: "Close" }).click();
  await expect(message).toBeHidden();

  await expect(page.getByRole("button", { name: "Open your outreach message" })).toBeVisible();
  await page.getByRole("link", { name: "All letters and messages" }).click();
  await expect(page).toHaveURL(/\/dashboard\/letters$/);
  await page.reload();
  await firstLoad(page.getByRole("button", { name: /^Messages/ })).toBeVisible();
  await page.getByRole("button", { name: /^Messages/ }).click();
  const saved = row(page, JOB.company);
  await expect(saved).toContainText("Message");
  await expect(saved).toContainText(ROLE_LINE);
  await saved.getByRole("button", { name: "Open" }).click();

  const reopened = page.getByRole("dialog", { name: ROLE_LINE });
  await expect(reopened.getByLabel("Email", { exact: true })).toHaveValue(/^Hi Sam,\n\n/);
  await expect(reopened.getByLabel("LinkedIn note")).toHaveValue(/^Hi Sam, /);
  await expect(reopened.getByText("Check before you send it")).toHaveCount(0);
});
