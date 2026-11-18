import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRO_TRIAL } from "@/config/plans";
import { AIError } from "@/lib/ai/types";
import { answerQuestion, writeCoverLetter } from "@/lib/ai/writing";
import type {
  AnswerRequestBody,
  AnswerResponse,
  ApiErrorBody,
  LetterRequestBody,
  LetterResponse,
} from "@/lib/api/types";
import { cookieJar, jsonRequest, resetDb, signInOnTrial } from "@/lib/auth/test-helpers";
import type { SessionUser } from "@/lib/auth/types";
import { resetEnvForTests } from "@/lib/env";
import { createSampleResume } from "@/lib/resume/sample";
import { consumeUsage, getUsage } from "@/lib/usage";
import { saveWritingStyle } from "@/lib/writing-style/records";
import type { WritingStyleBody } from "@/lib/writing-style/schema";

import { POST as answerPost } from "../answer/route";
import { POST } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);
vi.mock("@/lib/ai/writing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/writing")>();
  return {
    ...actual,
    writeCoverLetter: vi.fn(actual.writeCoverLetter),
    answerQuestion: vi.fn(actual.answerQuestion),
  };
});

const TRIAL_END = Date.UTC(2099, 0, 15, 12);
const NOW = Date.UTC(2026, 10, 7, 12, 0, 0, 7);

const STYLE: WritingStyleBody = {
  tone: "warm",
  length: "shorter",
  spelling: "uk",
  signOff: "Kind regards",
  notes: "Keep it plain.",
};

const JOB_POST =
  "We're hiring a Senior Product Marketing Manager to lead launches for our B2B analytics suite. " +
  "You will own positioning, messaging and sales enablement. Must have: B2B SaaS experience, SQL.";

function letterBody(): LetterRequestBody {
  return {
    resume: createSampleResume(NOW),
    job: { text: JOB_POST, title: "Senior Product Marketing Manager", company: "Contoso" },
  };
}

function answerBody(question = "Why do you want to work here?"): AnswerRequestBody {
  return { ...letterBody(), question };
}

const letter = (payload: unknown = letterBody(), init?: { site?: string }) => {
  const req = jsonRequest("/api/letter", payload);
  if (init?.site) req.headers.set("sec-fetch-site", init.site);
  return POST(req);
};
const answer = (payload: unknown = answerBody()) => answerPost(jsonRequest("/api/answer", payload));

async function signIn(email = "ada@example.com"): Promise<SessionUser> {
  const user = await signInOnTrial(email, TRIAL_END);
  return user;
}

async function errorOf(res: Response): Promise<ApiErrorBody["error"]> {
  return ((await res.json()) as ApiErrorBody).error;
}

beforeEach(async () => {
  vi.setSystemTime(NOW);
  await resetDb();
  cookieJar.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("POST /api/letter", () => {
  it("needs a signed-in user", async () => {
    const res = await letter();
    expect(res.status).toBe(401);
    expect(await errorOf(res)).toEqual({
      code: "unauthorized",
      message: "Sign in to let Otto write a cover letter.",
    });
  });

  it("refuses a request sent from another website", async () => {
    await signIn();
    const res = await letter(letterBody(), { site: "cross-site" });
    expect(res.status).toBe(403);
    expect((await errorOf(res)).code).toBe("forbidden");
  });

  it("returns a demo letter and counts one letter", async () => {
    const user = await signIn();
    const res = await letter();
    expect(res.status).toBe(200);
    const body = (await res.json()) as LetterResponse;
    expect(body.demo).toBe(true);
    expect(body.result.letter.startsWith("Dear Contoso team,")).toBe(true);
    expect(body.usage.letter).toEqual({ used: 1, limit: PRO_TRIAL.limits.letter });
    expect(body.usage.tailor.used).toBe(0);
    expect((await getUsage(user)).letter.used).toBe(1);
  });

  it("writes in the account's saved style", async () => {
    const user = await signIn();
    await saveWritingStyle(user.id, STYLE);
    const res = await letter();
    expect(res.status).toBe(200);
    const body = (await res.json()) as LetterResponse;
    expect(body.result.letter).toMatch(/\n\nKind regards,\n[^\n]+$/);
    expect(vi.mocked(writeCoverLetter).mock.lastCall?.[2]).toMatchObject(STYLE);
  });

  it("answers 429 limit_reached after the trial's letters", async () => {
    const user = await signIn();
    for (let i = 0; i < PRO_TRIAL.limits.letter; i++) await consumeUsage(user, "letter");
    const res = await letter();
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).not.toBeNull();
    expect(await errorOf(res)).toEqual({
      code: "limit_reached",
      message:
        "You've used this trial's 15 cover letters, outreach messages, answers and interview prep. Pro has 150 a month. Your full allowance starts on Jan 15.",
    });
  });

  it("rejects a post that's too short without spending a letter", async () => {
    const user = await signIn();
    const res = await letter({ ...letterBody(), job: { text: "Apply now.", title: "", company: "" } });
    expect(res.status).toBe(400);
    expect((await getUsage(user)).letter.used).toBe(0);
  });

  it("gives the letter back when the AI call fails", async () => {
    const user = await signIn();
    vi.mocked(writeCoverLetter).mockRejectedValueOnce(new AIError("unavailable", "down"));
    const res = await letter();
    expect(res.status).toBe(502);
    expect((await errorOf(res)).code).toBe("ai_unavailable");
    expect((await getUsage(user)).letter.used).toBe(0);
  });
});

describe("POST /api/answer", () => {
  it("needs a signed-in user", async () => {
    const res = await answer();
    expect(res.status).toBe(401);
    expect((await errorOf(res)).message).toBe("Sign in to let Otto draft an answer.");
  });

  it("drafts a demo answer from the same allowance as cover letters", async () => {
    const user = await signIn();
    await consumeUsage(user, "letter");
    const res = await answer();
    expect(res.status).toBe(200);
    const body = (await res.json()) as AnswerResponse;
    expect(body.demo).toBe(true);
    expect(body.result.answer).toContain("Why do you want to work here?");
    expect(body.usage.letter.used).toBe(2);
  });

  it("answers in the account's saved style", async () => {
    const user = await signIn();
    await saveWritingStyle(user.id, STYLE);
    expect((await answer()).status).toBe(200);
    expect(vi.mocked(answerQuestion).mock.lastCall?.[3]).toMatchObject(STYLE);
  });

  it("rejects a missing or too-short question without spending anything", async () => {
    const user = await signIn();
    expect((await answer(answerBody("Why?"))).status).toBe(400);
    expect((await answer(letterBody())).status).toBe(400);
    expect((await getUsage(user)).letter.used).toBe(0);
  });

  it("answers 429 once cover letters used the allowance up", async () => {
    const user = await signIn();
    for (let i = 0; i < PRO_TRIAL.limits.letter; i++) await consumeUsage(user, "letter");
    const res = await answer();
    expect(res.status).toBe(429);
    expect((await errorOf(res)).code).toBe("limit_reached");
  });
});
