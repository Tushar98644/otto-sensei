import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PLANS, PRO_TRIAL, type Feature } from "@/config/plans";
import type { ApiErrorBody } from "@/lib/api/types";
import { cookieJar, jsonRequest, linkGitHub, resetDb, setPlan, signInAs } from "@/lib/auth/test-helpers";
import type { SessionUser } from "@/lib/auth/types";
import { resetEnvForTests } from "@/lib/env";
import { installFakeGitHub, json, rawRepo, type FakeGitHub } from "@/lib/github/testing";
import { createSampleResume } from "@/lib/resume/sample";
import { getUsage } from "@/lib/usage";
import { POST as answer } from "./answer/route";
import { createApplication } from "./applications/records";
import { POST as draft } from "./draft/route";
import { POST as fix } from "./fix/route";
import { POST as githubDraft } from "./github/draft/route";
import { POST as interview } from "./interview/route";
import { POST as letter } from "./letter/route";
import { POST as summary } from "./summary/route";
import { POST as tailor } from "./tailor/route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

const NOW = Date.UTC(2026, 10, 7, 12);
const TRIAL_END = Date.UTC(2026, 10, 10, 12);
const JOB =
  "We're hiring a Senior Product Marketing Manager to lead launches for our B2B analytics suite.\n" +
  "What you bring:\n- B2B SaaS launches\n- SQL for campaign analysis\n";
const job = { text: JOB, title: "Senior Product Marketing Manager", company: "Contoso" };

let github: FakeGitHub | undefined;

type Call = { feature: Feature; send: (user: SessionUser | null) => Promise<Response>; message: string };

const CALLS: Call[] = [
  {
    feature: "fix",
    send: () => fix(jsonRequest("/api/fix", { bullet: "Managed the blog", role: { title: "Marketer", company: "Northwind" } })),
    message: "Line fixes and summaries come with Pro. Try Pro free for 3 days.",
  },
  {
    feature: "fix",
    send: () => summary(jsonRequest("/api/summary", { mode: "write", resume: createSampleResume(NOW) })),
    message: "Line fixes and summaries come with Pro. Try Pro free for 3 days.",
  },
  {
    feature: "tailor",
    send: () => tailor(jsonRequest("/api/tailor", { resume: createSampleResume(NOW), job })),
    message: "Tailoring comes with Pro. Try Pro free for 3 days.",
  },
  {
    feature: "letter",
    send: () => letter(jsonRequest("/api/letter", { resume: createSampleResume(NOW), job })),
    message: "Cover letters, answers and interview prep come with Pro. Try Pro free for 3 days.",
  },
  {
    feature: "letter",
    send: () =>
      answer(
        jsonRequest("/api/answer", { resume: createSampleResume(NOW), job, question: "Why do you want this role?" }),
      ),
    message: "Cover letters, answers and interview prep come with Pro. Try Pro free for 3 days.",
  },
  {
    feature: "letter",
    send: async (user) => {
      const created = user
        ? await createApplication(user.id, {
            resumeId: null,
            resumeTitle: "",
            company: "Contoso",
            role: job.title,
            jobUrl: "https://example.com/jobs/1",
            appliedAt: NOW - 1000,
            status: "interview",
            notes: "",
          })
        : null;
      const applicationId = created?.status === "created" ? created.application.id : crypto.randomUUID();
      return interview(jsonRequest("/api/interview", { applicationId, resume: createSampleResume(NOW), job }));
    },
    message: "Cover letters, answers and interview prep come with Pro. Try Pro free for 3 days.",
  },
  {
    feature: "draft",
    send: () =>
      draft(
        jsonRequest("/api/draft", {
          targetRole: "Data Analyst",
          jobs: [{ company: "Contoso", title: "Intern", startDate: "Jun 2025", endDate: "Aug 2025", notes: ["built 3 dashboards"] }],
        }),
      ),
    message: "Build with Otto comes with Pro. Try Pro free for 3 days.",
  },
  {
    feature: "github",
    send: (user) => {
      if (user) linkGitHub(user, "octocat");
      return githubDraft(jsonRequest("/api/github/draft", { username: "octocat", repos: ["octocat/ledger-lint"] }));
    },
    message: "GitHub drafts come with Pro. Try Pro free for 3 days.",
  },
];

async function errorOf(res: Response): Promise<ApiErrorBody["error"]> {
  return ((await res.json()) as ApiErrorBody).error;
}

beforeEach(async () => {
  vi.setSystemTime(NOW);
  delete process.env.OPENROUTER_API_KEY;
  resetEnvForTests();
  await resetDb();
  cookieJar.clear();
  github = installFakeGitHub((url) =>
    url.pathname === "/repos/octocat/ledger-lint" || url.pathname === "/users/octocat/repos"
      ? json(url.pathname.startsWith("/users") ? [rawRepo("octocat/ledger-lint")] : rawRepo("octocat/ledger-lint"))
      : undefined,
  );
});

afterEach(() => {
  github?.restore();
  vi.useRealTimers();
  resetEnvForTests();
});

describe("AI features by plan", () => {
  it.each(CALLS.map((call, index) => [index, call.feature, call] as const))(
    "#%i %s: Free and signed out get 402 upgrade_required, and nothing is counted",
    async (_index, feature, call) => {
      if (feature === "draft" || feature === "github") {
        const anonymous = await call.send(null);
        expect(anonymous.status).toBe(402);
        expect(await errorOf(anonymous)).toEqual({ code: "upgrade_required", message: call.message });
      }
      const user = await signInAs("free@example.com");
      const res = await call.send(user);
      expect(res.status).toBe(402);
      expect(await errorOf(res)).toEqual({ code: "upgrade_required", message: call.message });
      expect((await getUsage(user)).fix.used + (await getUsage(user)).tailor.used).toBe(0);
    },
  );

  it.each(CALLS.map((call, index) => [index, call.feature, call] as const))(
    "#%i %s: the trial gets it, on the trial's own allowance",
    async (_index, feature, call) => {
      const user = await setPlan(await signInAs("trial@example.com"), "trial", TRIAL_END);
      const res = await call.send(user);
      expect(res.status, await res.clone().text()).toBe(200);
      const counted = (await getUsage(user))[feature];
      expect(counted.limit).toBe(PRO_TRIAL.limits[feature]);
    },
  );

  it.each(CALLS.map((call, index) => [index, call.feature, call] as const))(
    "#%i %s: Pro gets it, on Pro's monthly allowance",
    async (_index, feature, call) => {
      const user = await setPlan(await signInAs("pro@example.com"), "pro");
      const res = await call.send(user);
      expect(res.status, await res.clone().text()).toBe(200);
      expect((await getUsage(user))[feature].limit).toBe(PLANS.pro.limits[feature]);
    },
  );
});
