import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetEnvForTests } from "@/lib/env";
import { checkContent, MODERATION_MODEL, parseVerdict, textsOf } from "./moderation";

const fetchMock = vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>();
const CONTEXT = { source: "test.route" };
const SECRET_LINE = "Jane Doe, jane@example.com, wrote the secret line";

function guardReply(content: string): Response {
  return Response.json({ provider: "DeepInfra", choices: [{ message: { content } }] });
}

function guardSays(content: string) {
  fetchMock.mockResolvedValueOnce(guardReply(content));
}

function sentBody(call = 0): Record<string, unknown> {
  return JSON.parse(String(fetchMock.mock.calls[call]?.[1]?.body)) as Record<string, unknown>;
}

function sentText(call: number): string {
  return (sentBody(call).messages as { content: string }[])[0]?.content ?? "";
}

function logged(): string {
  return JSON.stringify([
    ...vi.mocked(console.warn).mock.calls,
    ...vi.mocked(console.info).mock.calls,
  ]);
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  process.env.OPENROUTER_API_KEY = "sk-or-test";
  resetEnvForTests();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  delete process.env.OPENROUTER_API_KEY;
  resetEnvForTests();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("parseVerdict", () => {
  it("reads Llama Guard's safe and unsafe answers", () => {
    expect(parseVerdict("\n\nsafe")).toEqual({ allowed: true, categories: [] });
    expect(parseVerdict("\n\nunsafe\nS12")).toEqual({ allowed: false, categories: ["S12"] });
    expect(parseVerdict("unsafe\nS1,S4")).toEqual({ allowed: false, categories: ["S1", "S4"] });
    expect(parseVerdict("unsafe\nS3")).toMatchObject({ allowed: false });
  });

  it("allows categories outside sexual content, keeping their ids", () => {
    expect(parseVerdict("unsafe\nS7")).toEqual({ allowed: true, categories: ["S7"] });
    expect(parseVerdict("unsafe\nS6,S8")).toEqual({ allowed: true, categories: ["S6", "S8"] });
  });

  it("returns null for anything else", () => {
    expect(parseVerdict("")).toBeNull();
    expect(parseVerdict("I can't classify this.")).toBeNull();
    expect(parseVerdict("unsafe")).toBeNull();
    expect(parseVerdict("safety first")).toBeNull();
  });
});

describe("textsOf", () => {
  it("collects every string in an answer, however deep", () => {
    expect(textsOf({ a: "one", b: [{ c: "two", d: 3 }, null], e: { f: ["three"] } })).toEqual([
      "one",
      "two",
      "three",
    ]);
  });
});

describe("checkContent", () => {
  it("asks Llama Guard privately and deterministically, with the texts joined", async () => {
    guardSays("safe");
    expect(await checkContent(["Ran the blog", "  ", "Wrote the newsletter"], CONTEXT)).toEqual({
      allowed: true,
      categories: [],
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(sentBody()).toMatchObject({
      model: MODERATION_MODEL,
      messages: [{ role: "user", content: "Ran the blog\nWrote the newsletter" }],
      temperature: 0,
      provider: { data_collection: "deny" },
    });
    expect(sentBody().max_tokens).toBeLessThanOrEqual(64);
  });

  it("blocks sexual content and logs only the category ids", async () => {
    guardSays("unsafe\nS12");
    expect(await checkContent([SECRET_LINE], CONTEXT)).toEqual({ allowed: false, categories: ["S12"] });
    expect(logged()).toContain("moderation.blocked");
    expect(logged()).toContain("S12");
    expect(logged()).toContain("test.route");
    expect(logged()).not.toContain("secret line");
  });

  it("allows privacy flags, which every resume trips, but logs them", async () => {
    guardSays("unsafe\nS7");
    expect(await checkContent([SECRET_LINE], CONTEXT)).toEqual({ allowed: true, categories: ["S7"] });
    expect(logged()).toContain("moderation.flagged");
    expect(logged()).not.toContain("secret line");
  });

  it("skips the call for empty text or without an API key", async () => {
    expect(await checkContent([], CONTEXT)).toMatchObject({ allowed: true });
    expect(await checkContent(["", "   "], CONTEXT)).toMatchObject({ allowed: true });
    delete process.env.OPENROUTER_API_KEY;
    resetEnvForTests();
    expect(await checkContent(["Ran the blog"], CONTEXT)).toMatchObject({ allowed: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["a timeout", () => fetchMock.mockRejectedValueOnce(new DOMException("timed out", "TimeoutError")), "timeout"],
    ["a network error", () => fetchMock.mockRejectedValueOnce(new TypeError("fetch failed")), "network"],
    ["a provider error", () => fetchMock.mockResolvedValueOnce(new Response("{}", { status: 503 })), "503"],
    ["a malformed answer", () => guardSays("Sure, here is my analysis"), "malformed"],
    ["an empty reply", () => fetchMock.mockResolvedValueOnce(Response.json({ choices: [] })), "malformed"],
  ])("fails open on %s and logs it", async (_label, arrange, reason) => {
    arrange();
    expect(await checkContent([SECRET_LINE], CONTEXT)).toEqual({ allowed: true, categories: [] });
    expect(logged()).toContain("moderation.unavailable");
    expect(logged()).toContain(reason);
    expect(logged()).not.toContain("secret line");
  });

  it("splits a long page into chunks and blocks if any chunk is unsafe", async () => {
    const paragraph = "Shipped the checkout redesign for the store. ".repeat(40).trim();
    const page = Array.from({ length: 12 }, () => paragraph);
    fetchMock.mockImplementation(async () => guardReply("safe"));
    expect(await checkContent(page, CONTEXT)).toMatchObject({ allowed: true });
    const sent = fetchMock.mock.calls.map((_, index) => sentText(index));
    expect(sent.length).toBeGreaterThan(1);
    expect(sent.every((chunk) => chunk.length <= 8_000)).toBe(true);
    expect(sent.join("\n")).toBe(page.join("\n"));

    fetchMock.mockReset();
    let calls = 0;
    fetchMock.mockImplementation(async () => guardReply(calls++ === 0 ? "safe" : "unsafe\nS12"));
    expect(await checkContent(page, CONTEXT)).toEqual({ allowed: false, categories: ["S12"] });
  });

  it("hard-splits a single line longer than a chunk", async () => {
    fetchMock.mockImplementation(async () => guardReply("safe"));
    await checkContent(["x".repeat(20_000)], CONTEXT);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
