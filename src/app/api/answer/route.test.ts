import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AI_TOKEN_BUDGETS, PLANS, PRO_TRIAL } from "@/config/plans";
import { getDb } from "@/db/client";
import { usage } from "@/db/schema";
import { AIError, type AnswerResult } from "@/lib/ai/types";
import { answerQuestion } from "@/lib/ai/writing";
import { REQUEST_ID_HEADER, RESUME_HEADER } from "@/lib/api/request-id";
import type { AnswerRequestBody, AnswerResponse, ApiErrorBody } from "@/lib/api/types";
import {
  cookieJar,
  jsonRequest,
  resetDb,
  setPlan,
  signInAs,
  signInOnTrial,
} from "@/lib/auth/test-helpers";
import type { SessionUser } from "@/lib/auth/types";
import { resetEnvForTests } from "@/lib/env";
import { createSampleResume } from "@/lib/resume/sample";
import type { Resume } from "@/lib/resume/schema";
import { AI_TOKENS, getUsage, monthKey, TRIAL_PERIOD_KEY } from "@/lib/usage";
import { readWritingStyle } from "@/lib/writing-style/records";
import { DEFAULT_WRITING_STYLE } from "@/lib/writing-style/schema";

import { POST } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);
vi.mock("@/lib/ai/writing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/writing")>();
  return { ...actual, answerQuestion: vi.fn(actual.answerQuestion) };
});
vi.mock("@/lib/writing-style/records", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/writing-style/records")>();
  return { ...actual, readWritingStyle: vi.fn(actual.readWritingStyle) };
});

const TRIAL_END = Date.UTC(2099, 0, 15, 12);
const NOW = Date.UTC(2026, 10, 7, 12, 0, 0, 7);

const JOB_POST =
  "We're hiring a Senior Product Marketing Manager to lead launches for our B2B analytics suite. " +
  "You will own positioning, messaging and sales enablement. Must have: B2B SaaS experience, SQL.";

const INVALID =
  "Otto couldn't read that. Check the question is 8 to 500 characters and the job post is the full post.";
const TOO_LONG = "That job post or resume is too long for Otto. Try a shorter job post.";
const CROSS_SITE: Record<string, string>[] = [
  { "sec-fetch-site": "cross-site" },
  { origin: "https://evil.example" },
];

function body(question = "Why do you want to work here?"): AnswerRequestBody {
  return {
    resume: createSampleResume(NOW),
    job: { text: JOB_POST, title: "Senior Product Marketing Manager", company: "Contoso" },
    question,
  };
}

function longResume(): Resume {
  const resume = createSampleResume(NOW);
  const job = resume.experience[0]!;
  const experience = [0, 1].map((n) => ({
    ...job,
    id: `long-job-${n}`,
    bullets: Array.from({ length: 40 }, (_, i) => ({
      id: `long-${n}-${i}`,
      text: `Launch ${n}-${i}: ${"ran the campaign from brief to results. ".repeat(24)}`.slice(
        0,
        1_000,
      ),
    })),
  }));
  return { ...resume, experience };
}

function request(payload: unknown, headers: Record<string, string> = {}): Request {
  const req = jsonRequest("/api/answer", payload);
  for (const [name, value] of Object.entries(headers)) req.headers.set(name, value);
  return req;
}

const answer = (payload: unknown = body(), headers?: Record<string, string>) =>
  POST(request(payload, headers));

async function errorOf(res: Response): Promise<ApiErrorBody["error"]> {
  return ((await res.json()) as ApiErrorBody).error;
}

async function lettersUsed(user: SessionUser): Promise<number> {
  return (await getUsage(user)).letter.used;
}

function withAIKey() {
  vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("no network in tests");
    }),
  );
  resetEnvForTests();
}

beforeEach(async () => {
  vi.setSystemTime(NOW);
  await resetDb();
  cookieJar.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  resetEnvForTests();
});

describe("POST /api/answer", () => {
  it("refuses a request sent from another website before doing anything", async () => {
    const user = await signInOnTrial("ada@example.com", TRIAL_END);
    const calls = vi.mocked(answerQuestion).mock.calls.length;

    for (const headers of CROSS_SITE) {
      const res = await answer(body(), headers);
      expect(res.status).toBe(403);
      expect(await errorOf(res)).toEqual({
        code: "forbidden",
        message: "That request came from another website, so it wasn't allowed.",
      });
    }
    expect(vi.mocked(answerQuestion).mock.calls).toHaveLength(calls);
    expect(await lettersUsed(user)).toBe(0);

    expect((await answer(body(), { origin: "http://localhost" })).status).toBe(200);
    expect(await lettersUsed(user)).toBe(1);
  });

  it("asks a signed-out caller to sign in before reading the body", async () => {
    const res = await answer({ question: "?" });
    expect(res.status).toBe(401);
    expect(await errorOf(res)).toEqual({
      code: "unauthorized",
      message: "Sign in to let Otto draft an answer.",
    });
  });

  it("refuses bodies that aren't JSON, and says what it needs when the JSON is broken", async () => {
    const user = await signInOnTrial("ada@example.com", TRIAL_END);
    const plain = await POST(jsonRequest("/api/answer", body(), { contentType: "text/plain" }));
    expect(plain.status).toBe(415);
    expect((await errorOf(plain)).code).toBe("unsupported_type");

    const broken = await POST(
      new Request("http://localhost/api/answer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: '{"question":',
      }),
    );
    expect(broken.status).toBe(400);
    expect(await errorOf(broken)).toEqual({ code: "bad_request", message: INVALID });
    expect(await lettersUsed(user)).toBe(0);
  });

  it("rejects a question over 500 characters or a post that's too short, without spending a letter", async () => {
    const user = await signInOnTrial("ada@example.com", TRIAL_END);
    const long = await answer(body(`Why ${"really ".repeat(100)}this team?`));
    expect(long.status).toBe(400);
    expect(await errorOf(long)).toEqual({ code: "bad_request", message: INVALID });

    const short = await answer({ ...body(), job: { text: "Apply now.", title: "", company: "" } });
    expect(short.status).toBe(400);
    expect(await lettersUsed(user)).toBe(0);
  });

  it("hands the writer the trimmed question and job, and marks an answer from the AI as real", async () => {
    withAIKey();
    const user = await signInOnTrial("ada@example.com", TRIAL_END);
    const result: AnswerResult = {
      answer: "I have run B2B launches for seven years and want to do it for an analytics suite.",
      words: 16,
      warnings: [],
    };
    vi.mocked(answerQuestion).mockResolvedValueOnce(result);

    const sent = body("   Why do you want to work here?   ");
    const res = await answer({
      ...sent,
      job: {
        text: `\n${JOB_POST}\n`,
        title: "  Senior Product Marketing Manager ",
        company: " Contoso ",
      },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as AnswerResponse;
    expect(json.demo).toBe(false);
    expect(json.result).toEqual(result);
    expect(json.usage.letter).toEqual({ used: 1, limit: PRO_TRIAL.limits.letter });
    expect(await lettersUsed(user)).toBe(1);

    const [resume, job, question, style] = vi.mocked(answerQuestion).mock.lastCall ?? [];
    expect(resume?.id).toBe(sent.resume.id);
    expect(job).toEqual({
      jobText: JOB_POST,
      jobTitle: "Senior Product Marketing Manager",
      company: "Contoso",
    });
    expect(question).toBe("Why do you want to work here?");
    expect(style).toEqual(DEFAULT_WRITING_STYLE);
  });

  it("puts each AI failure in the answer's own words and gives the letter back", async () => {
    const user = await signInOnTrial("ada@example.com", TRIAL_END);

    vi.mocked(answerQuestion).mockRejectedValueOnce(new AIError("refused", "declined"));
    const refused = await answer();
    expect(refused.status).toBe(422);
    expect(await errorOf(refused)).toEqual({
      code: "ai_refused",
      message: "Otto can't answer that question. Try rewording it.",
    });

    vi.mocked(answerQuestion).mockRejectedValueOnce(new AIError("too_long", "too long"));
    const tooLong = await answer();
    expect(tooLong.status).toBe(400);
    expect(await errorOf(tooLong)).toEqual({ code: "bad_request", message: TOO_LONG });

    vi.mocked(answerQuestion).mockRejectedValueOnce(new AIError("unavailable", "timed out"));
    const down = await answer();
    expect(down.status).toBe(502);
    expect(await errorOf(down)).toEqual({
      code: "ai_unavailable",
      message:
        "Otto couldn't finish that right now. Try again in a minute. It won't count against your allowance.",
    });

    expect(await lettersUsed(user)).toBe(0);
  });

  it("turns down a resume too long to read, without counting a letter", async () => {
    const user = await signInOnTrial("ada@example.com", TRIAL_END);
    const res = await answer({ ...body(), resume: longResume() });
    expect(res.status).toBe(400);
    expect(await errorOf(res)).toEqual({ code: "bad_request", message: TOO_LONG });
    expect(await lettersUsed(user)).toBe(0);
  });

  it("answers 500 without the cause and gives the letter back when the saved style can't be read", async () => {
    const user = await signInOnTrial("ada@example.com", TRIAL_END);
    const calls = vi.mocked(answerQuestion).mock.calls.length;
    vi.mocked(readWritingStyle).mockRejectedValueOnce(new Error("connection reset by peer"));

    const res = await answer();
    expect(res.status).toBe(500);
    expect(await errorOf(res)).toEqual({
      code: "server_error",
      message: "Something went wrong. Please try again.",
    });
    expect(vi.mocked(answerQuestion).mock.calls).toHaveLength(calls);
    expect(await lettersUsed(user)).toBe(0);
  });

  it("stops at the AI budget before counting a letter or calling the writer", async () => {
    const user = await signInOnTrial("ada@example.com", TRIAL_END);
    await (
      await getDb()
    )
      .insert(usage)
      .values({
        subject: user.id,
        feature: AI_TOKENS,
        period: TRIAL_PERIOD_KEY,
        count: AI_TOKEN_BUDGETS.trial,
      });
    const calls = vi.mocked(answerQuestion).mock.calls.length;

    const res = await answer();
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).not.toBeNull();
    expect(await errorOf(res)).toEqual({
      code: "limit_reached",
      message: "You've used this trial's AI budget. Your full allowance starts on Jan 15.",
      reason: "ai_budget",
    });
    expect(vi.mocked(answerQuestion).mock.calls).toHaveLength(calls);
    expect(await lettersUsed(user)).toBe(0);
  });

  it("slows a burst of answers down after 10 in a minute, without counting the extra one", async () => {
    const user = await signInOnTrial("ada@example.com", TRIAL_END);
    for (let i = 0; i < 10; i++) expect((await answer()).status).toBe(200);

    const res = await answer();
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
    expect(await errorOf(res)).toEqual({
      code: "rate_limited",
      message: "That's a lot at once. Try again in 1 minute.",
    });
    expect(await lettersUsed(user)).toBe(10);

    vi.setSystemTime(NOW + 60_000);
    expect((await answer()).status).toBe(200);
  });

  it("tells Pro at its monthly limit what Max gives", async () => {
    const user = await setPlan(await signInAs("pro@example.com"), "pro");
    await (
      await getDb()
    )
      .insert(usage)
      .values({
        subject: user.id,
        feature: "letter",
        period: monthKey(NOW),
        count: PLANS.pro.limits.letter,
      });

    const res = await answer();
    expect(res.status).toBe(429);
    expect(await errorOf(res)).toEqual({
      code: "limit_reached",
      message: `You've used this month's ${PLANS.pro.limits.letter} cover letters, outreach messages, answers and interview prep. Max has ${PLANS.max.limits.letter} a month.`,
    });
  });

  it("hands back an answer already paid for under the same request id instead of paying again", async () => {
    const user = await signInOnTrial("ada@example.com", TRIAL_END);
    const sent = body();
    const id = { [REQUEST_ID_HEADER]: "answer-run-0000000001" };
    const calls = vi.mocked(answerQuestion).mock.calls.length;

    const first = (await (await answer(sent, id)).json()) as AnswerResponse;
    const again = await answer(sent, id);
    expect(again.status).toBe(200);
    const replayed = (await again.json()) as AnswerResponse;
    expect(replayed.result).toEqual(first.result);
    expect(replayed.demo).toBe(true);
    expect(replayed.usage.letter.used).toBe(1);
    expect(vi.mocked(answerQuestion).mock.calls).toHaveLength(calls + 1);

    const resumed = await answer(sent, { ...id, [RESUME_HEADER]: "1" });
    expect(((await resumed.json()) as AnswerResponse).result).toEqual(first.result);
    expect(await lettersUsed(user)).toBe(1);
  });

  it("has nothing to pick up for a request id that never ran", async () => {
    const user = await signInOnTrial("ada@example.com", TRIAL_END);
    const res = await answer(body(), {
      [REQUEST_ID_HEADER]: "answer-run-0000000002",
      [RESUME_HEADER]: "1",
    });
    expect(res.status).toBe(404);
    expect(await errorOf(res)).toEqual({
      code: "not_found",
      message: "There's nothing to pick up for this one. Start it again.",
    });
    expect(await lettersUsed(user)).toBe(0);
  });
});
