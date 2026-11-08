import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PLANS } from "@/config/plans";
import { draftResume } from "@/lib/ai/draft";
import type { ApiErrorBody, DraftRequestBody, DraftResponse } from "@/lib/api/types";
import { cookieJar, jsonRequest, resetDb, signInAs } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import { getUsage } from "@/lib/usage";
import { DRAFT_LIMITS } from "./limits";
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
  it("drafts without an account", async () => {
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

  it("limits drafts per device", async () => {
    for (let i = 0; i < DRAFT_LIMITS.device; i++) {
      expect((await POST(jsonRequest("/api/draft", BODY))).status).toBe(200);
    }
    const res = await POST(jsonRequest("/api/draft", BODY));
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBeTruthy();
  });

  it("spends a signed-in account's monthly drafts, and offers the next plan at the limit", async () => {
    const maya = await signInAs("maya@example.com");
    // As if the model wrote them, so each one counts.
    vi.mocked(draftResume).mockImplementation(async (body, now) => {
      const { draftResume: real } =
        await vi.importActual<typeof import("@/lib/ai/draft")>("@/lib/ai/draft");
      return { ...(await real(body, now)), usedAI: true };
    });
    for (let i = 0; i < PLANS.free.limits.draft; i++) {
      expect((await POST(jsonRequest("/api/draft", BODY))).status).toBe(200);
    }
    const res = await POST(jsonRequest("/api/draft", BODY));
    expect(res.status).toBe(429);
    expect(((await res.json()) as ApiErrorBody).error).toEqual({
      code: "limit_reached",
      message: `You've used this month's 2 Build with Otto drafts. Pro has ${PLANS.pro.limits.draft} a month.`,
    });
    expect((await getUsage(maya)).draft).toEqual({ used: 2, limit: 2 });
    vi.mocked(draftResume).mockReset();
  });

  it("gives the draft back when the AI didn't write it", async () => {
    const maya = await signInAs("maya@example.com");
    expect((await POST(jsonRequest("/api/draft", BODY))).status).toBe(200);
    expect((await getUsage(maya)).draft.used).toBe(0);
  });
});
