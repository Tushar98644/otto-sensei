import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MODERATION_MODEL } from "@/lib/ai/moderation";
import type { ApiErrorBody, FixRequestBody, FixResponse } from "@/lib/api/types";
import { cookieJar, jsonRequest, resetDb, setPlan, signInAs } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import { emptyContent } from "@/lib/portfolio/content";
import { saveContent } from "@/lib/portfolio/content-records";
import { getPortfolio } from "@/lib/portfolio/records";
import { sampleResume } from "@/lib/portfolio/testing";
import { listShares } from "@/lib/share/records";
import { getUsage } from "@/lib/usage";
import { POST as fixRoute } from "./fix/route";
import { PUT as putContent } from "./portfolio/content/route";
import { PATCH as patchPortfolio, POST as createPortfolio } from "./portfolio/route";
import { PAGE_BLOCKED } from "./public-pages";
import { PUT as putResume } from "./resumes/[id]/route";
import { POST as createShare } from "./share/route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);
vi.mock("next/cache", () => ({
  revalidateTag: () => {},
  revalidatePath: () => {},
  unstable_cache: <T>(load: () => Promise<T>) => load,
}));

const EXPLICIT = "graphic sex scene";
const FIX_BODY: FixRequestBody = {
  bullet: "Responsible for managing the company blog",
  role: { title: "Marketing Manager", company: "Northwind" },
};

type ChatBody = { model: string; messages: { content: string }[] };

let guard: (text: string) => string | Promise<string>;
let suggestion: string;
const checked: string[] = [];

const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
  const body = JSON.parse(String(init?.body)) as ChatBody;
  if (body.model === MODERATION_MODEL) {
    const text = body.messages[0]?.content ?? "";
    checked.push(text);
    return Response.json({ choices: [{ message: { content: await guard(text) } }] });
  }
  const answer = { issues: ["Says what you were given"], questions: [], suggestion };
  return Response.json({
    choices: [{ finish_reason: "stop", message: { content: JSON.stringify(answer) } }],
    usage: { prompt_tokens: 100, completion_tokens: 20 },
  });
});

const SUMMARY = "I build fast, friendly web apps.\n\nI like small teams.";

const flagsExplicit = (text: string) => (text.includes(EXPLICIT) ? "unsafe\nS12" : "unsafe\nS7");

async function errorOf(res: Response): Promise<ApiErrorBody["error"]> {
  return ((await res.json()) as ApiErrorBody).error;
}

function send(handler: (req: Request) => Promise<Response>, method: string, path: string, body: unknown) {
  return handler(
    new Request(`http://localhost${path}`, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

async function proWithPortfolio() {
  const user = await setPlan(await signInAs("maya@example.com"), "pro");
  expect((await createPortfolio(jsonRequest("/api/portfolio", { resume: sampleResume() }))).status).toBe(201);
  return user;
}

function logs(): string {
  return JSON.stringify([...vi.mocked(console.warn).mock.calls, ...vi.mocked(console.info).mock.calls]);
}

beforeEach(async () => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockClear();
  checked.length = 0;
  guard = () => "safe";
  suggestion = "Ran the company blog";
  vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test");
  resetEnvForTests();
  await resetDb();
  cookieJar.clear();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  resetEnvForTests();
});

describe("what Otto writes", () => {
  it("refuses a line fix the safety check blocks, like any refusal, and gives the fix back", async () => {
    const user = await signInAs("free@example.com");
    suggestion = `Wrote a ${EXPLICIT} for the blog`;
    guard = flagsExplicit;

    const res = await fixRoute(jsonRequest("/api/fix", FIX_BODY));
    expect(res.status).toBe(422);
    expect(await errorOf(res)).toMatchObject({
      code: "ai_refused",
      message: "Otto can't help with that line. Try rewording it.",
    });
    expect((await getUsage(user)).fix.used).toBe(0);
    expect(checked.join("\n")).toContain(EXPLICIT);
    expect(logs()).toContain("moderation.blocked");
    expect(logs()).toContain("ai.fix");
    expect(logs()).not.toContain(EXPLICIT);
  });

  it("still answers when the safety model times out", async () => {
    await signInAs("free@example.com");
    guard = () => Promise.reject(new DOMException("timed out", "TimeoutError"));

    const res = await fixRoute(jsonRequest("/api/fix", FIX_BODY));
    expect(res.status).toBe(200);
    expect(((await res.json()) as FixResponse).result.suggestion).toBe("Ran the company blog");
    expect(logs()).toContain("moderation.unavailable");
  });
});

describe("public pages", () => {
  it("won't publish a portfolio with explicit text, and keeps it private", async () => {
    const user = await setPlan(await signInAs("maya@example.com"), "pro");
    const resume = sampleResume({ summary: `I write ${EXPLICIT}s.` });
    expect((await createPortfolio(jsonRequest("/api/portfolio", { resume }))).status).toBe(201);
    expect(checked).toHaveLength(0);
    guard = flagsExplicit;

    const res = await send(patchPortfolio, "PATCH", "/api/portfolio", { published: true });
    expect(res.status).toBe(422);
    expect(await errorOf(res)).toEqual({ code: "content_blocked", message: PAGE_BLOCKED });
    expect(await getPortfolio(user.id)).toMatchObject({ published: false, publishedAt: null });
    expect(logs()).toContain("portfolio.update");
  });

  it("publishes a clean portfolio after checking its whole page", async () => {
    const user = await proWithPortfolio();
    guard = flagsExplicit;
    expect((await send(patchPortfolio, "PATCH", "/api/portfolio", { published: true })).status).toBe(200);
    expect(await getPortfolio(user.id)).toMatchObject({ published: true });
    expect(checked.join("\n")).toContain("I build fast, friendly web apps.");
    expect(checked.join("\n")).toContain("maya-chen");
    expect(checked.join("\n")).not.toContain("maya@example.com");
  });

  it("checks edits that go live on a published page, and only those", async () => {
    const user = await proWithPortfolio();
    guard = flagsExplicit;
    await send(putContent, "PUT", "/api/portfolio/content", { content: { pitch: "Draft pitch" } });
    expect(checked).toHaveLength(0);
    expect((await send(patchPortfolio, "PATCH", "/api/portfolio", { published: true })).status).toBe(200);
    checked.length = 0;

    const blocked = await send(putContent, "PUT", "/api/portfolio/content", {
      content: { pitch: `Ask me about my ${EXPLICIT}` },
    });
    expect(blocked.status).toBe(422);
    expect((await errorOf(blocked)).code).toBe("content_blocked");
    expect((await getPortfolio(user.id))?.content.pitch).toBe("Draft pitch");

    const resynced = await send(patchPortfolio, "PATCH", "/api/portfolio", {
      resume: sampleResume({ summary: `Now with a ${EXPLICIT}` }),
    });
    expect(resynced.status).toBe(422);
    expect((await getPortfolio(user.id))?.snapshot.summary).toBe(SUMMARY);

    checked.length = 0;
    expect((await send(patchPortfolio, "PATCH", "/api/portfolio", { template: "reel" })).status).toBe(200);
    expect(checked).toHaveLength(0);
  });

  it("checks again when the page changes while it's being checked", async () => {
    const user = await proWithPortfolio();
    let first = true;
    guard = async (text) => {
      if (first) {
        first = false;
        const later = (await getPortfolio(user.id))!.updatedAt + 1;
        await saveContent(user.id, { ...emptyContent(), pitch: `My ${EXPLICIT}` }, later);
      }
      return flagsExplicit(text);
    };

    const res = await send(patchPortfolio, "PATCH", "/api/portfolio", { published: true });
    expect(res.status).toBe(422);
    expect(checked.length).toBeGreaterThanOrEqual(2);
    expect(await getPortfolio(user.id)).toMatchObject({ published: false });
  });

  it("keeps the last checked copy live when a synced resume edit is blocked", async () => {
    const user = await proWithPortfolio();
    expect((await send(patchPortfolio, "PATCH", "/api/portfolio", { published: true })).status).toBe(200);
    guard = flagsExplicit;
    const edited = sampleResume({ summary: `A ${EXPLICIT}`, updatedAt: 9_000 });

    const res = await putResume(
      new Request(`http://localhost/api/resumes/${edited.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(edited),
      }),
      { params: Promise.resolve({ id: edited.id }) },
    );
    expect(res.status).toBe(200);
    expect((await getPortfolio(user.id))?.snapshot.summary).toBe(SUMMARY);
    expect(logs()).toContain("portfolio.sync");
  });

  it("won't make a share link for a resume with explicit text", async () => {
    const user = await setPlan(await signInAs("maya@example.com"), "pro");
    guard = flagsExplicit;
    const resume = sampleResume({ summary: `I write ${EXPLICIT}s.` });

    const res = await createShare(jsonRequest("/api/share", { resume }));
    expect(res.status).toBe(422);
    expect(await errorOf(res)).toEqual({ code: "content_blocked", message: PAGE_BLOCKED });
    expect(await listShares(user.id)).toEqual([]);

    expect((await createShare(jsonRequest("/api/share", { resume: sampleResume() }))).status).toBe(201);
    expect(checked.at(-1)).not.toContain("+1 415 555 0100");
  });
});
