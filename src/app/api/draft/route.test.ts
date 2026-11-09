import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PLANS, PRO_TRIAL } from "@/config/plans";
import { draftResume } from "@/lib/ai/draft";
import type { ApiErrorBody, DraftRequestBody, DraftResponse } from "@/lib/api/types";
import { cookieJar, jsonRequest, resetDb, signInAs, signInOnTrial } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import { getUsage } from "@/lib/usage";
import { POST } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);
vi.mock("@/lib/ai/draft", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/draft")>();
  return { ...actual, draftResume: vi.fn(actual.draftResume) };
});

const BODY: DraftRequestBody = {
  targetRole: "Data Analyst",
  jobs: [
    {
      company: "Contoso",
      title: "Intern",
      startDate: "Jun 2025",
      endDate: "Aug 2025",
      notes: ["built 3 dashboards"],
    },
  ],
};

beforeEach(async () => {
  delete process.env.OPENROUTER_API_KEY;
  resetEnvForTests();
  await resetDb();
  cookieJar.clear();
});

afterEach(() => resetEnvForTests());

describe("POST /api/draft", () => {
  it("is part of Pro: signed out or on Free it answers 402 upgrade_required", async () => {
    for (const signIn of [async () => null, () => signInAs("free@example.com")]) {
      await signIn();
      const res = await POST(jsonRequest("/api/draft", BODY));
      expect(res.status).toBe(402);
      expect(((await res.json()) as ApiErrorBody).error).toEqual({
        code: "upgrade_required",
        message: "Build with Otto comes with Pro. Try Pro free for 3 days.",
      });
    }
  });

  it("drafts on the trial", async () => {
    await signInOnTrial("maya@example.com");
    const res = await POST(jsonRequest("/api/draft", BODY));
    expect(res.status).toBe(200);
    const body = (await res.json()) as DraftResponse;
    expect(body.usedAI).toBe(false);
    expect(body.resume.experience[0]?.bullets[0]?.text).toBe("Built 3 dashboards");
  });

  it("asks for at least one thing the person did", async () => {
    const res = await POST(
      jsonRequest("/api/draft", { ...BODY, jobs: [{ ...BODY.jobs[0], notes: [" "] }] }),
    );
    expect(res.status).toBe(400);
    expect(((await res.json()) as ApiErrorBody).error.code).toBe("bad_request");
  });

  it("refuses requests that aren't JSON", async () => {
    const res = await POST(jsonRequest("/api/draft", BODY, { contentType: "text/plain" }));
    expect(res.status).toBe(415);
  });

  it("spends the trial's drafts, and says when the full allowance starts", async () => {
    const trialEnd = Date.UTC(2099, 0, 15, 12);
    const maya = await signInOnTrial("maya@example.com", trialEnd);
    // As if the model wrote them, so each one counts.
    vi.mocked(draftResume).mockImplementation(async (body, now) => {
      const { draftResume: real } =
        await vi.importActual<typeof import("@/lib/ai/draft")>("@/lib/ai/draft");
      return { ...(await real(body, now)), usedAI: true };
    });
    for (let i = 0; i < PRO_TRIAL.limits.draft; i++) {
      expect((await POST(jsonRequest("/api/draft", BODY))).status).toBe(200);
    }
    const res = await POST(jsonRequest("/api/draft", BODY));
    expect(res.status).toBe(429);
    expect(((await res.json()) as ApiErrorBody).error).toEqual({
      code: "limit_reached",
      message: `You've used this trial's 3 Build with Otto drafts. Pro has ${PLANS.pro.limits.draft} a month. Your full allowance starts on Jan 15.`,
    });
    expect((await getUsage(maya)).draft).toEqual({ used: 3, limit: 3 });
    vi.mocked(draftResume).mockReset();
  });

  it("gives the draft back when the AI didn't write it", async () => {
    const maya = await signInOnTrial("maya@example.com");
    expect((await POST(jsonRequest("/api/draft", BODY))).status).toBe(200);
    expect((await getUsage(maya)).draft.used).toBe(0);
  });
});
