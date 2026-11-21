import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { answerQuestion } from "@/lib/ai/writing";
import { AnswerRequestSchema, type AnswerRequestBody, type ApiErrorBody } from "@/lib/api/types";
import { cookieJar, jsonRequest, resetDb, signInOnTrial } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import { createSampleResume } from "@/lib/resume/sample";
import { getUsage } from "@/lib/usage";

import { POST } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);
vi.mock("@/lib/ai/writing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/writing")>();
  return { ...actual, answerQuestion: vi.fn(actual.answerQuestion) };
});

const TRIAL_END = Date.UTC(2099, 0, 15, 12);
const NOW = Date.UTC(2026, 10, 7, 12, 0, 0, 7);

const JOB_POST =
  "We're hiring a Senior Product Marketing Manager to lead launches for our B2B analytics suite. " +
  "You will own positioning, messaging and sales enablement. Must have: B2B SaaS experience, SQL.";

const INVALID =
  "Otto couldn't read that. Check the question is 8 to 500 characters and the job post is the full post.";

function body(question: string): AnswerRequestBody {
  return {
    resume: createSampleResume(NOW),
    job: { text: JOB_POST, title: "Senior Product Marketing Manager", company: "Contoso" },
    question,
  };
}

beforeEach(async () => {
  vi.setSystemTime(NOW);
  await resetDb();
  cookieJar.clear();
  delete process.env.OPENROUTER_API_KEY;
  resetEnvForTests();
});

afterEach(() => {
  vi.useRealTimers();
  resetEnvForTests();
});

describe("AnswerRequestSchema question", () => {
  it("measures the question with its runs of spaces collapsed, the way the writer reads it", () => {
    expect(AnswerRequestSchema.safeParse(body("Why  us?")).success).toBe(false);
    expect(AnswerRequestSchema.safeParse(body(" Why \n\t us? ")).success).toBe(false);

    const parsed = AnswerRequestSchema.parse(body("  Why do  you\n want   this role?  "));
    expect(parsed.question).toBe("Why do you want this role?");
  });
});

describe("POST /api/answer with a question that is short once its spaces collapse", () => {
  it("turns it down as a bad request before the writer runs, and never spends a letter on retries", async () => {
    const user = await signInOnTrial("ada@example.com", TRIAL_END);
    const calls = vi.mocked(answerQuestion).mock.calls.length;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const res = await POST(jsonRequest("/api/answer", body("Why  us?")));
      expect(res.status).toBe(400);
      expect(((await res.json()) as ApiErrorBody).error).toEqual({
        code: "bad_request",
        message: INVALID,
      });
    }

    expect(vi.mocked(answerQuestion).mock.calls).toHaveLength(calls);
    expect((await getUsage(user, NOW)).letter.used).toBe(0);
  });
});
