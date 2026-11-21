import { expect, type APIResponse, type Page } from "@playwright/test";
import type { BillingInterval, PaidPlanId } from "@/config/plans";
import type { RequestCodeResponse, UrlResponse, VerifyCodeResponse } from "@/lib/api/types";
import type { SessionUser } from "@/lib/auth/types";
import { cleanResumePdf } from "@/lib/parse/test-fixtures";
import { createSampleResume } from "@/lib/resume/sample";
import type { Resume } from "@/lib/resume/schema";

let emails = 0;

// An API route compiles on its first call under next dev, which can outlast the 15 s action timeout.
const API = { timeout: 60_000 };

export function uniqueEmail(label = "user"): string {
  const stamp = `${Date.now().toString(36)}${(emails++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return `e2e-${label}-${stamp}@example.com`;
}

async function okJson<T>(response: APIResponse, what: string): Promise<T> {
  expect(response.ok(), `${what}: ${response.status()} ${await response.text()}`).toBe(true);
  return (await response.json()) as T;
}

// Dev auth hands the code back in the response, so no email is sent; the cookie lands in the page's context.
export async function signIn(page: Page, email = uniqueEmail()): Promise<SessionUser> {
  const sent = await okJson<RequestCodeResponse>(
    await page.request.post("/api/auth/request-code", { ...API, data: { email } }),
    "request a sign-in code",
  );
  if (!sent.devCode) throw new Error("No dev code came back: the e2e server is not using dev auth");
  const { user } = await okJson<VerifyCodeResponse>(
    await page.request.post("/api/auth/verify", { ...API, data: { email, code: sent.devCode } }),
    "verify the sign-in code",
  );
  return user;
}

// The real form, for specs about signing in itself: /login, the dev code shown on screen, then /dashboard.
export async function signInWithForm(page: Page, email = uniqueEmail()): Promise<string> {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Email me a code" }).click();
  const code = await page
    .getByText(/Dev mode: your code is/)
    .locator("strong")
    .textContent();
  if (!code) throw new Error("The dev code is not on the page");
  await page.getByLabel("6-digit code").fill(code);
  await page.waitForURL("**/dashboard");
  return email;
}

export function sampleResume(): Resume {
  return createSampleResume();
}

// Saves a resume to the signed-in account, as the studio's sync would; it shows up on the next page load.
export async function seedResume(page: Page, resume: Resume = sampleResume()): Promise<Resume> {
  await okJson(
    await page.request.put(`/api/resumes/${resume.id}`, { ...API, data: resume }),
    "save the seeded resume",
  );
  return resume;
}

// A one-page text PDF the upload step reads without AI, for setInputFiles.
export async function resumePdf(): Promise<{ name: string; mimeType: string; buffer: Buffer }> {
  return {
    name: "resume.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await cleanResumePdf()),
  };
}

// Mock billing switches the plan at once; a new account's first Pro monthly starts the 3-day trial instead.
export async function subscribe(
  page: Page,
  plan: PaidPlanId = "pro",
  interval: BillingInterval = "month",
): Promise<string> {
  const { url } = await okJson<UrlResponse>(
    await page.request.post("/api/billing/checkout", { ...API, data: { plan, interval } }),
    `subscribe to ${plan} ${interval}`,
  );
  return url;
}
