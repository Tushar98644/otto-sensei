import { describe, expect, it, vi } from "vitest";
import { BudgetError } from "../../../scripts/evals/cost";
import {
  blind,
  DEFAULT_SCALE,
  judge,
  judgeSystem,
  parseVerdict,
  type JudgeRequest,
} from "../../../scripts/evals/judge";
import type { Rubric } from "../../../scripts/evals/suite";

const RUBRIC: Rubric = {
  task: "Rewrite one resume line.",
  criteria: [
    { id: "truthful", description: "Adds no facts." },
    { id: "stronger", description: "Reads better." },
  ],
};

const reply = (content: string, status = 200) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }], usage: { cost: 0.001 } }), {
    status,
  });

function request(fetchImpl: typeof fetch, overrides: Partial<JudgeRequest> = {}): JudgeRequest {
  return {
    apiKey: "test-key",
    model: "lab/judge-1",
    rubric: RUBRIC,
    input: "Line: Helped with billing",
    output: "Suggestion: Moved billing to a new system",
    hide: ["z-lab/fast-model-2"],
    fetchImpl,
    wait: async () => {},
    ...overrides,
  };
}

describe("judgeSystem", () => {
  it("lists the task, every criterion, the scale and the reply shape", () => {
    const text = judgeSystem(RUBRIC);
    expect(text).toContain("Rewrite one resume line.");
    expect(text).toContain("- truthful: Adds no facts.");
    expect(text).toContain(`1 = ${DEFAULT_SCALE[1]}`);
    expect(text).toContain('"truthful": <1-5>, "stronger": <1-5>');
  });
});

describe("blind", () => {
  it("hides the model id and its short name, any case", () => {
    expect(blind("Written by z-lab/fast-model-2 (Fast-Model-2)", ["z-lab/fast-model-2"])).toBe(
      "Written by [hidden] ([hidden])",
    );
  });
});

describe("parseVerdict", () => {
  it("averages the criteria and reads a fenced reply", () => {
    const verdict = parseVerdict(
      '```json\n{"scores": {"truthful": 5, "stronger": 2}, "why": " Flat verbs. "}\n```',
      RUBRIC,
    );
    expect(verdict).toEqual({
      score: 3.5,
      scores: { truthful: 5, stronger: 2 },
      why: "Flat verbs.",
    });
  });

  it("rejects missing, out-of-range or fractional scores", () => {
    expect(parseVerdict('{"scores": {"truthful": 5}}', RUBRIC)).toBeNull();
    expect(parseVerdict('{"scores": {"truthful": 5, "stronger": 6}}', RUBRIC)).toBeNull();
    expect(parseVerdict('{"scores": {"truthful": 4.5, "stronger": 3}}', RUBRIC)).toBeNull();
    expect(parseVerdict("Looks good to me", RUBRIC)).toBeNull();
  });
});

describe("judge", () => {
  it("sends a blind request and returns the verdict", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      reply('{"scores": {"truthful": 4, "stronger": 4}, "why": "Solid."}'),
    );
    const result = await judge(
      request(fetchMock, { output: "Made by z-lab/fast-model-2: Moved billing" }),
    );
    expect(result).toEqual({
      verdict: { score: 4, scores: { truthful: 4, stronger: 4 }, why: "Solid." },
      error: null,
    });
    const body = String(fetchMock.mock.calls[0]![1]!.body);
    expect(body).not.toContain("fast-model-2");
    expect(JSON.parse(body)).toMatchObject({
      model: "lab/judge-1",
      temperature: 0,
      reasoning: { enabled: false },
      usage: { include: true },
    });
  });

  it("retries rate limits and network errors, then gives up", async () => {
    const flaky = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(reply("", 429))
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(reply('{"scores": {"truthful": 3, "stronger": 3}}'));
    expect((await judge(request(flaky))).verdict?.score).toBe(3);
    expect(flaky).toHaveBeenCalledTimes(3);

    const down = vi.fn<typeof fetch>(async () => reply("", 503));
    expect(await judge(request(down))).toEqual({ verdict: null, error: "HTTP 503" });
    expect(down).toHaveBeenCalledTimes(4);
  });

  it("stops at once on a budget stop or a client error", async () => {
    const broke = vi.fn<typeof fetch>().mockRejectedValue(new BudgetError());
    expect(await judge(request(broke))).toEqual({ verdict: null, error: "budget" });
    expect(broke).toHaveBeenCalledTimes(1);

    const bad = vi.fn<typeof fetch>(async () => reply("", 400));
    expect(await judge(request(bad))).toEqual({ verdict: null, error: "HTTP 400" });
    expect(bad).toHaveBeenCalledTimes(1);
  });

  it("reports an unreadable verdict", async () => {
    const vague = vi.fn<typeof fetch>(async () => reply("Pretty good overall."));
    expect(await judge(request(vague))).toEqual({ verdict: null, error: "unreadable verdict" });
  });
});
