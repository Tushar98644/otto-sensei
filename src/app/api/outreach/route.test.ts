import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRO_TRIAL } from "@/config/plans";
import type { ApiErrorBody, OutreachRequestBody, OutreachResponse } from "@/lib/api/types";
import { cookieJar, jsonRequest, resetDb, signInOnTrial } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import { createSampleResume } from "@/lib/resume/sample";
import { consumeUsage, getUsage } from "@/lib/usage";
import { saveWritingStyle } from "@/lib/writing-style/records";
import { DEFAULT_WRITING_STYLE } from "@/lib/writing-style/schema";
import { POST } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

const TRIAL_END = Date.UTC(2099, 0, 15, 12);
const NOW = Date.UTC(2026, 10, 18, 12, 0, 0, 7);

const JOB_POST =
  "We're hiring a Senior Product Marketing Manager to lead launches for our B2B analytics suite. " +
  "You will own positioning, messaging and sales enablement. Must have: B2B SaaS experience, SQL.";

function body(): OutreachRequestBody {
  return {
    resume: createSampleResume(NOW),
    job: { text: JOB_POST, title: "Senior Product Marketing Manager", company: "Contoso" },
  };
}

const send = (payload: unknown = body(), site?: string) => {
  const req = jsonRequest("/api/outreach", payload);
  if (site) req.headers.set("sec-fetch-site", site);
  return POST(req);
};

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

describe("POST /api/outreach", () => {
  it("needs a signed-in user", async () => {
    const res = await send();
    expect(res.status).toBe(401);
    expect((await errorOf(res)).message).toBe("Sign in to let Otto write an outreach message.");
  });

  it("refuses a request sent from another website", async () => {
    await signInOnTrial("ada@example.com", TRIAL_END);
    const res = await send(body(), "cross-site");
    expect(res.status).toBe(403);
  });

  it("writes a demo message from the cover-letter allowance", async () => {
    const user = await signInOnTrial("ada@example.com", TRIAL_END);
    const res = await send();
    expect(res.status).toBe(200);
    const json = (await res.json()) as OutreachResponse;
    expect(json.demo).toBe(true);
    expect(json.result.subject).toBe("Senior Product Marketing Manager at Contoso");
    expect(json.result.email.startsWith("Hi [first name],")).toBe(true);
    expect(json.result.note.startsWith("Hi [first name], ")).toBe(true);
    expect(json.usage.letter).toEqual({ used: 1, limit: PRO_TRIAL.limits.letter });
    expect((await getUsage(user)).letter.used).toBe(1);
  });

  it("signs off in the account's saved style", async () => {
    const user = await signInOnTrial("ada@example.com", TRIAL_END);
    await saveWritingStyle(user.id, { ...DEFAULT_WRITING_STYLE, signOff: "Cheers," });
    const json = (await (await send()).json()) as OutreachResponse;
    expect(json.result.email).toMatch(/\n\nCheers,\n[^\n]+$/);
  });

  it("rejects a post that's too short without spending anything", async () => {
    const user = await signInOnTrial("ada@example.com", TRIAL_END);
    const res = await send({ ...body(), job: { text: "Apply now.", title: "", company: "" } });
    expect(res.status).toBe(400);
    expect((await getUsage(user)).letter.used).toBe(0);
  });

  it("answers 429 once the allowance is used up", async () => {
    const user = await signInOnTrial("ada@example.com", TRIAL_END);
    for (let i = 0; i < PRO_TRIAL.limits.letter; i++) await consumeUsage(user, "letter");
    const res = await send();
    expect(res.status).toBe(429);
    expect((await errorOf(res)).code).toBe("limit_reached");
  });
});
