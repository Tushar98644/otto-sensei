import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { resetEnvForTests } from "@/lib/env";
import { billedTokens, jsonSchemaFor, runStructured, type StructuredRequest } from "./client";
import { checkContent } from "./moderation";
import { metered } from "./token-meter";
import { AIError } from "./types";

vi.mock("./moderation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./moderation")>()),
  checkContent: vi.fn(),
}));

const fetchMock = vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>();
vi.stubGlobal("fetch", fetchMock);

const Answer = z.object({ answer: z.string() });
type Answer = z.infer<typeof Answer>;
const BodySchema = z.record(z.string(), z.unknown());

function request(overrides: Partial<StructuredRequest<Answer>> = {}): StructuredRequest<Answer> {
  return {
    task: "fix",
    system: "SYSTEM",
    user: "USER",
    schema: Answer,
    effort: "low",
    ...overrides,
  };
}

function respond(status: number, body: unknown, headers: Record<string, string> = {}) {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json", ...headers },
    }),
  );
}

function completion(content: string | null, choice: Record<string, unknown> = {}) {
  return {
    id: "gen-test",
    provider: "Anthropic",
    model: "anthropic/claude-opus-5.5",
    choices: [
      {
        finish_reason: "stop",
        native_finish_reason: "end_turn",
        message: { role: "assistant", content },
        ...choice,
      },
    ],
    usage: {
      prompt_tokens: 120,
      completion_tokens: 40,
      prompt_tokens_details: { cached_tokens: 0 },
    },
  };
}

function apiError(code: number, message: string, metadata?: Record<string, unknown>) {
  return { error: { code, message, ...(metadata ? { metadata } : {}) } };
}

function sent(call = -1) {
  const [url, init] = fetchMock.mock.calls.at(call) ?? [];
  return {
    url: String(url),
    body: BodySchema.parse(JSON.parse(String(init?.body))),
    headers: new Headers(init?.headers),
  };
}

function useModel(model: string) {
  process.env.AI_MODEL = model;
  resetEnvForTests();
}

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = "sk-or-test";
  useModel("anthropic/claude-opus-5.5");
  fetchMock.mockReset();
  vi.mocked(checkContent).mockReset().mockResolvedValue({ allowed: true, categories: [] });
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(() => {
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.AI_MODEL;
  delete process.env.AI_STRUCTURE_MODEL;
  resetEnvForTests();
  vi.unstubAllGlobals();
});

describe("runStructured request", () => {
  it("posts a strict JSON schema, effort, private routing and a cached system prompt", async () => {
    respond(200, completion('{"answer":"ok"}'));
    await expect(runStructured(request())).resolves.toEqual({ answer: "ok" });

    const { url, body, headers } = sent();
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(headers.get("authorization")).toBe("Bearer sk-or-test");
    expect(body).toMatchObject({
      model: "anthropic/claude-opus-5.5",
      max_tokens: 4_000,
      messages: [
        {
          role: "system",
          content: [{ type: "text", text: "SYSTEM", cache_control: { type: "ephemeral" } }],
        },
        { role: "user", content: "USER" },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "fix",
          strict: true,
          schema: {
            type: "object",
            properties: { answer: { type: "string" } },
            required: ["answer"],
            additionalProperties: false,
          },
        },
      },
      reasoning: { effort: "low", exclude: true },
      provider: {
        require_parameters: true,
        data_collection: "deny",
        sort: "price",
        max_price: { prompt: 0.1, completion: 0.3 },
      },
    });
  });

  it("never sends sampling settings and honors maxTokens and effort", async () => {
    respond(200, completion('{"answer":"ok"}'));
    await runStructured(request({ effort: "medium", maxTokens: 2_000 }));
    const { body } = sent();
    for (const key of ["temperature", "top_p", "top_k"]) expect(body).not.toHaveProperty(key);
    expect(body).toMatchObject({ max_tokens: 2_000, reasoning: { effort: "medium" } });
  });

  it("sizes max_tokens per task", async () => {
    respond(200, completion('{"answer":"ok"}'));
    await runStructured(request({ task: "tailor" }));
    expect(sent().body).toMatchObject({ max_tokens: 8_000 });
  });

  it("structures resumes on the faster structure model", async () => {
    respond(200, completion('{"answer":"ok"}'));
    await runStructured(request({ task: "structure" }));
    expect(sent().body).toMatchObject({ model: "z-ai/glm-5.3-flash", max_tokens: 16_000 });

    process.env.AI_STRUCTURE_MODEL = "google/gemini-2.5-flash";
    resetEnvForTests();
    respond(200, completion('{"answer":"ok"}'));
    await runStructured(request({ task: "structure" }));
    expect(sent().body).toMatchObject({ model: "google/gemini-2.5-flash" });
    delete process.env.AI_STRUCTURE_MODEL;
    resetEnvForTests();
  });

  it("writes the interview's technical round on its own model, under its own price cap", async () => {
    respond(200, completion('{"answer":"ok"}'));
    await runStructured(request({ task: "interview" }));
    expect(sent().body).toMatchObject({
      model: "anthropic/claude-haiku-5.5",
      max_tokens: 10_000,
      provider: { max_price: { prompt: 0.2, completion: 1 } },
    });

    process.env.AI_INTERVIEW_MODEL = "google/gemini-3.5-flash-lite";
    resetEnvForTests();
    respond(200, completion('{"answer":"ok"}'));
    await runStructured(request({ task: "interview" }));
    expect(sent().body).toMatchObject({ model: "google/gemini-3.5-flash-lite" });
    delete process.env.AI_INTERVIEW_MODEL;
    resetEnvForTests();
  });

  it("sends a plain system prompt to non-Claude models", async () => {
    useModel("google/gemini-2.5-flash");
    respond(200, completion('{"answer":"ok"}'));
    await runStructured(request());
    expect(sent().body).toMatchObject({
      messages: [
        { role: "system", content: "SYSTEM" },
        { role: "user", content: "USER" },
      ],
    });
  });

  it("builds the JSON schema without the meta-schema keyword", () => {
    const schema = jsonSchemaFor(z.object({ items: z.array(z.object({ term: z.string() })) }));
    expect(schema).not.toHaveProperty("$schema");
    expect(schema).toMatchObject({
      additionalProperties: false,
      properties: { items: { items: { additionalProperties: false, required: ["term"] } } },
    });
  });

  it("fails without an API key and never calls the API", async () => {
    delete process.env.OPENROUTER_API_KEY;
    resetEnvForTests();
    await expect(runStructured(request())).rejects.toMatchObject({ code: "unavailable" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("runStructured answers", () => {
  it("accepts JSON wrapped in a markdown fence", async () => {
    respond(200, completion('```json\n{"answer":"ok"}\n```'));
    await expect(runStructured(request())).resolves.toEqual({ answer: "ok" });
  });

  it("joins content sent as text parts", async () => {
    respond(
      200,
      completion(null, {
        message: {
          content: [
            { type: "text", text: '{"answer":' },
            { type: "text", text: '"ok"}' },
          ],
        },
      }),
    );
    await expect(runStructured(request())).resolves.toEqual({ answer: "ok" });
  });

  it.each([
    ["a refusal message", { message: { content: null, refusal: "I can't help with that." } }],
    ["a content filter stop", { finish_reason: "content_filter" }],
    ["a native refusal stop", { native_finish_reason: "refusal" }],
  ])("maps %s to refused", async (_label, choice) => {
    respond(200, completion('{"answ', choice));
    const error = await runStructured(request()).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(AIError);
    expect(error).toMatchObject({ code: "refused" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("maps truncated output to invalid_output", async () => {
    respond(200, completion('{"answer":"o', { finish_reason: "length" }));
    await expect(runStructured(request())).rejects.toMatchObject({ code: "invalid_output" });
  });

  it.each([
    ["fails the schema", '{"wrong":1}'],
    ["isn't JSON", "Sure! Here is your answer."],
    ["is empty", null],
  ])("maps output that %s to invalid_output", async (_label, content) => {
    respond(200, completion(content));
    await expect(runStructured(request())).rejects.toMatchObject({ code: "invalid_output" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("maps a reply without choices to invalid_output", async () => {
    respond(200, { id: "gen-test", choices: [] });
    await expect(runStructured(request())).rejects.toMatchObject({ code: "invalid_output" });
  });
});

describe("runStructured safety check", () => {
  const Lines = z.object({ lines: z.array(z.object({ text: z.string(), note: z.string() })) });
  const output = { lines: [{ text: "Ran the blog", note: "Shows ownership" }] };

  it("checks every piece of text Otto wrote before returning it", async () => {
    respond(200, completion(JSON.stringify(output)));
    await expect(runStructured({ ...request(), schema: Lines })).resolves.toEqual(output);
    expect(checkContent).toHaveBeenCalledWith(["Ran the blog", "Shows ownership"], {
      source: "ai.fix",
    });
  });

  it("refuses an answer the safety check blocks, without retrying", async () => {
    vi.mocked(checkContent).mockResolvedValueOnce({ allowed: false, categories: ["S12"] });
    respond(200, completion('{"answer":"explicit"}'));
    const error = await runStructured(request({ task: "letter" })).catch(
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(AIError);
    expect(error).toMatchObject({ code: "refused" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("doesn't check imports, which only sort the person's own resume", async () => {
    respond(200, completion('{"answer":"ok"}'));
    await runStructured(request({ task: "structure" }));
    expect(checkContent).not.toHaveBeenCalled();
  });
});

describe("runStructured errors and retries", () => {
  it.each([
    [401, "unavailable"],
    [402, "unavailable"],
    [403, "unavailable"],
    [404, "unavailable"],
    [400, "invalid_output"],
    [413, "too_long"],
  ])("maps HTTP %i to %s without retrying", async (status, code) => {
    respond(status, apiError(status, "Nope"));
    await expect(runStructured(request())).rejects.toMatchObject({ code });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("maps a moderation block to refused and never logs the flagged text", async () => {
    respond(
      403,
      apiError(403, "Flagged", { reasons: ["harassment"], flagged_input: "Jane Doe, 555-0100" }),
    );
    await expect(runStructured(request())).rejects.toMatchObject({ code: "refused" });
    const logged = JSON.stringify(vi.mocked(console.warn).mock.calls);
    expect(logged).toContain("harassment");
    expect(logged).not.toContain("Jane Doe");
  });

  it("logs a rejected key and an empty account as errors", async () => {
    respond(401, apiError(401, "No auth credentials found"));
    await runStructured(request()).catch(() => undefined);
    respond(402, apiError(402, "Insufficient credits"));
    await runStructured(request()).catch(() => undefined);
    const events = vi.mocked(console.error).mock.calls.map(([line]) => String(line));
    expect(events.some((line) => line.includes("ai.auth_failed"))).toBe(true);
    expect(events.some((line) => line.includes("ai.out_of_credits"))).toBe(true);
  });

  it("retries a rate limit after Retry-After and then succeeds", async () => {
    respond(429, apiError(429, "Rate limit exceeded"), { "retry-after": "0" });
    respond(200, completion('{"answer":"ok"}'));
    await expect(runStructured(request())).resolves.toEqual({ answer: "ok" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sent(0).body).toEqual(sent(1).body);
  });

  it("gives up after three rate-limited attempts", async () => {
    for (let i = 0; i < 3; i++)
      respond(429, apiError(429, "Rate limit exceeded"), { "retry-after": "0" });
    await expect(runStructured(request())).rejects.toMatchObject({ code: "rate_limited" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("retries a provider failure reported inside a 200", async () => {
    respond(200, apiError(502, "Provider returned error", { error_type: "provider_unavailable" }));
    respond(200, completion('{"answer":"ok"}'));
    await expect(runStructured(request())).resolves.toEqual({ answer: "ok" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries a network failure, then reports unavailable", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    await expect(runStructured(request())).rejects.toMatchObject({ code: "unavailable" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("stops at the deadline", async () => {
    fetchMock.mockImplementation(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    );
    await expect(runStructured(request(), { deadlineMs: 30 })).rejects.toMatchObject({
      code: "unavailable",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gives up instead of retrying sooner than a long Retry-After", async () => {
    respond(429, apiError(429, "Rate limit exceeded"), { "retry-after": "20" });
    await expect(runStructured(request())).rejects.toMatchObject({ code: "rate_limited" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries when the in-flight spending budget is full", async () => {
    respond(
      402,
      apiError(402, "In-flight budget exhausted", { limit_source: "openrouter_in_flight_budget" }),
      {
        "retry-after": "0",
      },
    );
    respond(200, completion('{"answer":"ok"}'));
    await expect(runStructured(request())).resolves.toEqual({ answer: "ok" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("never retries after the request was accepted, so a running call isn't paid twice", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        new ReadableStream({
          start(controller) {
            controller.error(new TypeError("terminated"));
          },
        }),
        { status: 200 },
      ),
    );
    await expect(runStructured(request())).rejects.toMatchObject({ code: "unavailable" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("doesn't start a retry that couldn't finish before the deadline", async () => {
    respond(502, apiError(502, "Provider returned error"), { "retry-after": "0" });
    await expect(runStructured(request(), { deadlineMs: 5_000 })).rejects.toMatchObject({
      code: "unavailable",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("flags a model no provider can serve as a setup error", async () => {
    for (let i = 0; i < 3; i++)
      respond(503, apiError(503, "No available providers"), { "retry-after": "0" });
    await expect(runStructured(request())).rejects.toMatchObject({ code: "unavailable" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const events = vi.mocked(console.error).mock.calls.map(([line]) => String(line));
    expect(events.some((line) => line.includes("ai.no_provider"))).toBe(true);
  });

  it("never logs the API key from a header error", async () => {
    process.env.OPENROUTER_API_KEY = "sk-or-secret-123";
    resetEnvForTests();
    fetchMock.mockRejectedValue(
      new TypeError('Headers.append: "Bearer sk-or-secret-123" is an invalid header value.'),
    );
    await runStructured(request()).catch(() => undefined);
    const logged = JSON.stringify([
      vi.mocked(console.warn).mock.calls,
      vi.mocked(console.error).mock.calls,
    ]);
    expect(logged).not.toContain("sk-or-secret");
  });

  it("doesn't retry when the wait would pass the deadline", async () => {
    respond(503, apiError(503, "No available providers"), { "retry-after": "3" });
    await expect(runStructured(request(), { deadlineMs: 1_000 })).rejects.toMatchObject({
      code: "unavailable",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("runStructured usage log", () => {
  function reasoned(content: string) {
    const reply = completion(content);
    return {
      ...reply,
      usage: { ...reply.usage, completion_tokens_details: { reasoning_tokens: 25 } },
    };
  }

  it("logs one counts-only line per answer in production, with the host, attempt and time", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    try {
      respond(429, apiError(429, "Rate limit exceeded"), { "retry-after": "0" });
      respond(200, reasoned('{"answer":"Ran the Jane Doe fan club"}'));
      await runStructured(request({ user: "Jane Doe, jane@example.com" }));
    } finally {
      vi.unstubAllEnvs();
    }

    const lines = info.mock.calls.map(([line]) => String(line));
    const usage = lines.filter((line) => line.includes('"ai.usage"'));
    expect(usage).toHaveLength(1);
    expect(JSON.parse(usage[0] ?? "{}")).toEqual({
      ts: expect.any(String),
      level: "info",
      event: "ai.usage",
      task: "fix",
      model: "anthropic/claude-opus-5.5",
      provider: "Anthropic",
      attempt: 2,
      durationMs: expect.any(Number),
      inputTokens: 120,
      outputTokens: 40,
      reasoningTokens: 25,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    });
    expect(lines.join("\n")).not.toMatch(/Jane Doe|jane@example\.com|SYSTEM|gen-test/);
  });

  it("logs the usage of an answer that is cut off, which is still billed", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    respond(200, completion('{"answer":"o', { finish_reason: "length" }));
    await expect(runStructured(request({ task: "tailor" }))).rejects.toMatchObject({
      code: "invalid_output",
    });
    expect(info).toHaveBeenCalledWith(
      "[info] ai.usage",
      expect.objectContaining({ task: "tailor", attempt: 1, outputTokens: 40 }),
    );
  });
});

describe("runStructured billed tokens", () => {
  async function billed(run: () => Promise<unknown>): Promise<number> {
    let tokens = -1;
    await metered(run, async (total) => {
      tokens = total;
    }).catch(() => undefined);
    return tokens;
  }

  it("reports prompt plus completion, or the provider's own total when it sends one", async () => {
    respond(200, completion('{"answer":"ok"}'));
    expect(await billed(() => runStructured(request()))).toBe(160);
    expect(
      billedTokens({ usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 175 } }),
    ).toBe(175);
  });

  it("counts every billed attempt, including a refused or cut-off answer", async () => {
    respond(200, completion(null, { message: { content: null, refusal: "No." } }));
    expect(await billed(() => runStructured(request()))).toBe(160);

    respond(200, apiError(502, "Provider returned error", { error_type: "provider_unavailable" }));
    respond(200, completion('{"answer":"o', { finish_reason: "length" }));
    respond(200, completion('{"answer":"ok"}'));
    const twoCalls = async () => {
      await runStructured(request()).catch(() => undefined);
      await runStructured(request());
    };
    expect(await billed(twoCalls)).toBe(320);
  });

  it("counts nothing for a call turned away with no usage, or outside a meter", async () => {
    respond(429, apiError(429, "Rate limit exceeded"), { "retry-after": "60" });
    expect(await billed(() => runStructured(request()))).toBe(0);
    respond(200, completion('{"answer":"ok"}'));
    await expect(runStructured(request())).resolves.toEqual({ answer: "ok" });
    expect(billedTokens({ usage: { prompt_tokens: "lots" } })).toBe(0);
    expect(billedTokens(null)).toBe(0);
  });
});
