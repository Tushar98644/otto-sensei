import type { Browser, Page } from "@playwright/test";
import type { ResumesResponse } from "@/lib/api/types";
import type { Resume } from "@/lib/resume/schema";
import { E2E_BASE_URL } from "./env";
import { blockOutsideHosts, clientIpHeader, expect, holdDevUpdates, test } from "./fixtures";
import { sampleResume, seedResume, signIn, subscribe } from "./helpers";

const JOB_TITLE = "Senior Product Marketing Manager";
const COMPANY = "Acme Analytics";
const COPY_TITLE = `${JOB_TITLE} at ${COMPANY}`;
const MARKETO_LINE = "Ran Marketo nurture campaigns for trial users";

// The demo tailor reads this as 7 must-haves (3 shown in the sample resume, Marketo missing) and Tableau as a nice-to-have.
const JOB_POST = `Senior Product Marketing Manager

About the role
You will lead launches for our analytics platform and partner with sales on every major deal.

Requirements
- 5+ years of product marketing in B2B SaaS
- Strong positioning and messaging skills
- Built sales enablement programs that sales reps use every week
- Hands-on with Salesforce and HubSpot
- Experience running campaigns in Marketo

Nice to have
- Tableau dashboards for launch reporting
`;

async function seedBase(page: Page): Promise<Resume> {
  const title = `Tailor base ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return seedResume(page, { ...sampleResume(), title });
}

function switcher(page: Page, title: string) {
  return page.getByRole("button", { name: `Current resume: ${title}. Switch resume` });
}

function currentStep(page: Page) {
  return page.getByRole("navigation", { name: "Studio steps" }).locator('[aria-current="step"]');
}

// Opens the studio, waits for the account's resume to load, then picks the Tailor step.
async function openTailorStep(page: Page, resume: Resume): Promise<void> {
  await page.goto("/studio");
  await expect(switcher(page, resume.title)).toBeVisible({ timeout: 30_000 });
  await page
    .getByRole("navigation", { name: "Studio steps" })
    .getByRole("button", { name: "Tailor", exact: true })
    .click();
  await expect(currentStep(page)).toHaveAccessibleName("Tailor");
}

// A second browser signed in to the same account, with the same guards as the fixtures.
async function otherDevice(browser: Browser, email: string) {
  const context = await browser.newContext({
    baseURL: E2E_BASE_URL,
    extraHTTPHeaders: clientIpHeader(),
  });
  const leaks = await blockOutsideHosts(context);
  await holdDevUpdates(context);
  const page = await context.newPage();
  await signIn(page, email);
  return {
    page,
    close: async () => {
      await context.close();
      expect(leaks, "the browser asked for something outside localhost").toEqual([]);
    },
  };
}

async function pasteJobPost(page: Page, text: string, job?: { title: string; company: string }) {
  await page.getByRole("button", { name: "No link? Paste the job text" }).click();
  if (job) {
    await page.getByText("More options").click();
    await page.getByRole("textbox", { name: /^Job title/ }).fill(job.title);
    await page.getByRole("textbox", { name: /^Company/ }).fill(job.company);
  }
  await page.getByRole("textbox", { name: "Job post", exact: true }).fill(text);
}

function tailorCalls(page: Page): string[] {
  const calls: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === "/api/tailor") {
      calls.push(request.url());
    }
  });
  return calls;
}

async function serverResumes(page: Page): Promise<Resume[]> {
  const response = await page.request.get("/api/resumes");
  expect(response.ok()).toBe(true);
  return ((await response.json()) as ResumesResponse).resumes;
}

const bulletTexts = (resume: Resume, company: string) =>
  resume.experience.find((job) => job.company === company)?.bullets.map((bullet) => bullet.text);

test("a Pro account tailors a pasted job post, picks the changes and gets a saved tailored copy", async ({
  browser,
  page,
  user,
}) => {
  expect(user.plan).toBe("free");
  await subscribe(page, "pro", "month");
  const base = await seedBase(page);
  await openTailorStep(page, base);
  await expect(page.getByText(/\d+ of \d+ tailored versions left/).first()).toBeVisible();

  await pasteJobPost(page, JOB_POST, { title: JOB_TITLE, company: COMPANY });
  await page.getByRole("button", { name: "Compare with my resume" }).click();

  const results = page.getByRole("region", { name: "Tailoring results" });
  await expect(
    results.getByRole("heading", { name: "Must-haves proven: 3 of 7 · Nice-to-haves: 0 of 1" }),
  ).toBeVisible({ timeout: 60_000 });
  await expect(results.getByText(/^Demo mode: these are sample suggestions/)).toBeVisible();
  await expect(page.getByText(`${JOB_TITLE} · ${COMPANY}`, { exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Job post", exact: true })).toBeHidden();

  // A missing must-have: say yes and add a line in your own words.
  await results
    .getByRole("group", { name: "Have you used Marketo?" })
    .getByRole("button", { name: "Yes" })
    .click();
  await expect(results.getByRole("combobox", { name: "Where did you do it?" })).toHaveValue(
    base.experience[0]!.id,
  );
  await results.getByRole("textbox", { name: "What did you do?" }).fill(MARKETO_LINE);
  await results.getByRole("button", { name: "Use my words" }).click();
  await expect(results.getByRole("textbox", { name: "Your new line" })).toHaveValue(MARKETO_LINE);
  await results.getByRole("button", { name: "Add this line" }).click();
  await expect(
    results.getByRole("heading", { name: "Must-haves proven: 4 of 7 · Nice-to-haves: 0 of 1" }),
  ).toBeVisible();
  await expect(
    results
      .getByRole("region", { name: "Must-haves" })
      .getByText("Your new line, for the tailored copy"),
  ).toBeVisible();

  // A nice-to-have the user doesn't have stays off the resume.
  await results
    .getByRole("group", { name: "Have you used Tableau?" })
    .getByRole("button", { name: "No" })
    .click();
  await expect(results.getByText("It stays off your resume.")).toBeVisible();

  // Keep one job's lines in their original order.
  await expect(results.getByRole("heading", { name: "Your best lines first" })).toBeVisible();
  const northwind = results.getByRole("checkbox", {
    name: /Marketing Specialist at Northwind Analytics/,
  });
  await expect(northwind).toBeChecked();
  await northwind.uncheck();

  await expect(
    results.getByText(
      "The copy adds 1 line you confirmed, adds 1 skill and reorders lines in 2 jobs. Your original stays the same.",
    ),
  ).toBeVisible();
  await results.getByRole("button", { name: "Create tailored version" }).click();

  await expect(
    page.getByText("Your tailored copy is ready. Your original stays untouched."),
  ).toBeVisible();
  await expect(currentStep(page)).toHaveAccessibleName("Download");
  await expect(
    page.getByRole("button", { name: `Current resume: ${COPY_TITLE}. Switch resume` }),
  ).toBeVisible();

  // The copy reaches the account with exactly the picked changes, and the original is untouched.
  let copy: Resume | undefined;
  await expect
    .poll(
      async () => {
        copy = (await serverResumes(page)).find(
          (resume) => resume.tailor?.baseResumeId === base.id,
        );
        return copy?.title;
      },
      { timeout: 20_000 },
    )
    .toBe(COPY_TITLE);
  expect(copy!.tailor).toMatchObject({ jobTitle: JOB_TITLE, company: COMPANY });
  expect(bulletTexts(copy!, "Brightloop")?.slice(0, 2)).toEqual([
    MARKETO_LINE,
    "Responsible for creating sales enablement materials for the sales team.",
  ]);
  expect(bulletTexts(copy!, "Northwind Analytics")).toEqual(
    bulletTexts(base, "Northwind Analytics"),
  );
  expect(bulletTexts(copy!, "Fieldnote Studio")?.[0]).toMatch(/^Wrote customer case studies/);
  const skills = copy!.skills.flatMap((group) => group.items);
  expect(skills).toContain("Marketo");
  expect(skills).not.toContain("Tableau");

  const original = (await serverResumes(page)).find((resume) => resume.id === base.id);
  expect(original?.experience).toEqual(base.experience);
  expect(original?.skills).toEqual(base.skills);

  // Signed in on another browser, the studio lists the copy, labelled for the job, beside the original.
  const device = await otherDevice(browser, user.email);
  await device.page.goto("/studio");
  const trigger = device.page.getByRole("button", { name: /^Current resume: .+\. Switch resume$/ });
  const list = device.page.getByRole("group", { name: "Your resumes" });
  // The switcher only opens once the page has hydrated, so a click that came too early is retried.
  await expect(async () => {
    if (!(await list.isVisible())) await trigger.click();
    await expect(list).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 30_000 });
  await expect(list.getByRole("button", { name: `Rename ${COPY_TITLE}` })).toBeVisible();
  await expect(list.getByRole("button", { name: `Rename ${base.title}` })).toBeVisible();
  await expect(list.getByText(`Tailored · ${COMPANY}`)).toBeVisible();
  await device.close();
});

test("tailoring results come back after a reload and warn once the post changes", async ({
  page,
  user,
}) => {
  expect(user.plan).toBe("free");
  await subscribe(page, "pro", "month");
  const base = await seedBase(page);
  await openTailorStep(page, base);
  await pasteJobPost(page, JOB_POST, { title: JOB_TITLE, company: COMPANY });
  await page.getByRole("button", { name: "Compare with my resume" }).click();

  const headline = page.getByRole("heading", {
    name: "Must-haves proven: 3 of 7 · Nice-to-haves: 0 of 1",
  });
  await expect(headline).toBeVisible({ timeout: 60_000 });

  await page.reload();
  await expect(currentStep(page)).toHaveAccessibleName("Tailor");
  await expect(headline).toBeVisible();
  await expect(page.getByText(`${JOB_TITLE} · ${COMPANY}`, { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Change the job post" }).click();
  const post = page.getByRole("textbox", { name: "Job post", exact: true });
  await expect(post).toHaveValue(JOB_POST);
  await post.fill(`${JOB_POST}\n- Experience with Looker\n`);
  await expect(page.getByText("These results are for the post you sent before")).toBeVisible();

  await page.getByRole("button", { name: "Start over with another job" }).click();
  await expect(headline).toBeHidden();
  await expect(page.getByRole("textbox", { name: "Job link" })).toHaveValue("");
});

test("a Free account gets the skills check instead of a tailored copy", async ({ page, user }) => {
  expect(user.plan).toBe("free");
  const calls = tailorCalls(page);
  const base = await seedBase(page);
  await openTailorStep(page, base);
  await expect(
    page.getByText(
      "Free shows which skills the post names and where you show them. Tailoring comes with Pro.",
    ),
  ).toBeVisible();

  await pasteJobPost(page, JOB_POST);
  await page.getByRole("button", { name: "Compare with my resume" }).click();

  await expect(
    page.getByText("Here's each skill this post names, and where your resume shows it."),
  ).toBeVisible();
  await expect(page.getByText("Tailoring on Pro goes further")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create tailored version" })).toHaveCount(0);
  expect(calls).toEqual([]);
});

test("a job post that is too short is not sent", async ({ page, user }) => {
  expect(user.plan).toBe("free");
  await subscribe(page, "pro", "month");
  const calls = tailorCalls(page);
  const base = await seedBase(page);
  await openTailorStep(page, base);

  await pasteJobPost(page, "Product Marketing Manager");
  await page.getByRole("button", { name: "Compare with my resume" }).click();

  const post = page.getByRole("textbox", { name: "Job post", exact: true });
  await expect(
    page.getByText("That's a bit short. Paste the whole job post, not just the title."),
  ).toBeVisible();
  await expect(post).toBeFocused();
  await expect(post).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("region", { name: "Tailoring results" })).toHaveCount(0);
  expect(calls).toEqual([]);
});
