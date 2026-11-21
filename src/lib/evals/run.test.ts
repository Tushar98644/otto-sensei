import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { MODERATION_MODEL } from "@/lib/ai/moderation";
import { env, resetEnvForTests } from "@/lib/env";
import type { RunFile } from "../../../scripts/evals/report";
import { main } from "../../../scripts/evals/run";
import { SUITES } from "../../../scripts/evals/suites";

const KEY = "sk-or-v1-ci-test";
const JUDGE = "lab/judge-1";
const MODELS_URL = "https://openrouter.ai/api/v1/models";
const CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
const MATCH_CASES = SUITES.find((suite) => suite.name === "match-check")!.cases.length;
const CRITERIA = SUITES.flatMap((suite) => suite.rubric.criteria.map((criterion) => criterion.id));
// A CI runner has no .env.local: the workflow sets OPENROUTER_API_KEY and nothing else the runner reads.
const CI_ENV = [
  "OPENROUTER_API_KEY",
  "AI_MODEL",
  "AI_STRUCTURE_MODEL",
  "NEXT_PUBLIC_POSTHOG_KEY",
  "SENTRY_DSN",
  "NEXT_PUBLIC_SENTRY_DSN",
];
const FIX_REPLY = {
  issues: ["Lists a duty, not a result."],
  questions: ["How many conversations a day?"],
  suggestion: "Answered [number] customer emails and chats a day in Zendesk",
};

type Sent = { url: string; auth: string | null; model: string | null; maxPrice: unknown };

function fakeOpenRouter(judgeScore: number) {
  const sent: Sent[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const body = init?.body
      ? (JSON.parse(String(init.body)) as { model?: string; provider?: { max_price?: unknown } })
      : null;
    sent.push({
      url,
      auth: new Headers(init?.headers).get("authorization"),
      model: body?.model ?? null,
      maxPrice: body?.provider?.max_price,
    });
    if (url === MODELS_URL) {
      return Response.json({
        data: [{ id: JUDGE, pricing: { prompt: "0.0000001", completion: "0.0000005" } }],
      });
    }
    const content =
      body?.model === JUDGE
        ? JSON.stringify({
            scores: Object.fromEntries(CRITERIA.map((id) => [id, judgeScore])),
            why: "Fine.",
          })
        : body?.model === MODERATION_MODEL
          ? "safe"
          : JSON.stringify(FIX_REPLY);
    return Response.json({
      choices: [{ finish_reason: "stop", message: { content } }],
      usage: { prompt_tokens: 800, completion_tokens: 40, cost: 0.0001 },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, sent };
}

const readRun = (dir: string) =>
  JSON.parse(readFileSync(path.join(dir, "results.json"), "utf8")) as RunFile;

let saved: Record<string, string | undefined>;
let root: string;
let errors: MockInstance<typeof console.error>;

beforeEach(() => {
  saved = Object.fromEntries(CI_ENV.map((name) => [name, process.env[name]]));
  for (const name of CI_ENV) delete process.env[name];
  process.env.OPENROUTER_API_KEY = KEY;
  resetEnvForTests();
  root = mkdtempSync(path.join(tmpdir(), "otto-evals-run-"));
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  errors = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  for (const [name, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  resetEnvForTests();
  rmSync(root, { recursive: true, force: true });
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the eval runner as CI runs it", () => {
  it("runs with only OPENROUTER_API_KEY set and writes the report into --out", async () => {
    const { sent } = fakeOpenRouter(4);
    const out = path.join(root, "eval-report");

    const code = await main([
      "--feature",
      "match-check",
      "--judge",
      JUDGE,
      "--max-usd",
      "0.50",
      "--out",
      out,
    ]);

    expect(code).toBe(0);
    expect(existsSync(path.join(out, "report.md"))).toBe(true);
    const run = readRun(out);
    expect(run.options.models).toEqual([env().AI_MODEL]);
    expect(run.maxUsd).toBe(0.5);
    expect(run.spentUsd).toBeCloseTo(MATCH_CASES * 0.0001, 8);
    expect(run.rows).toHaveLength(1);
    expect(run.rows[0]).toMatchObject({
      feature: "match-check",
      cases: MATCH_CASES,
      errors: 0,
      skipped: 0,
      passRate: 1,
      judgeMean: 4,
      judged: MATCH_CASES,
    });
    const report = readFileSync(path.join(out, "report.md"), "utf8");
    expect(report).toContain("## Summary");
    expect(report).toContain("## match-check");
    expect(report).toContain("of $0.50.");

    expect(sent.every((call) => new URL(call.url).hostname === "openrouter.ai")).toBe(true);
    expect(sent.filter((call) => call.url === MODELS_URL)).toHaveLength(1);
    const chats = sent.filter((call) => call.url === CHAT_URL);
    expect(chats).toHaveLength(MATCH_CASES);
    expect(chats.every((call) => call.model === JUDGE && call.auth === `Bearer ${KEY}`)).toBe(true);
  });

  it("sends product calls to the default AI_MODEL under the product's price cap", async () => {
    const { sent } = fakeOpenRouter(4);
    const out = path.join(root, "fix");

    const code = await main(["--feature", "fix", "--cases", "1", "--judge", "none", "--out", out]);

    expect(code).toBe(0);
    const run = readRun(out);
    expect(run.results).toHaveLength(1);
    expect(run.results[0]).toMatchObject({ feature: "fix", status: "ok", error: null, calls: 1 });
    const product = sent.filter((call) => call.url === CHAT_URL && call.model !== MODERATION_MODEL);
    expect(product).toHaveLength(1);
    expect(product[0]).toMatchObject({ model: env().AI_MODEL, auth: `Bearer ${KEY}` });
    expect(product[0]!.maxPrice).toEqual(expect.objectContaining({ prompt: expect.any(Number) }));
  });

  it("exits 2 when --compare flags a regression against the baseline, and 0 when nothing regressed", async () => {
    // Latency is wall-clock time, which a busy machine could stretch into a flag; frozen, only the judge differs.
    vi.spyOn(performance, "now").mockReturnValue(0);
    const baseline = path.join(root, "baseline");
    const options = ["--feature", "match-check", "--judge", JUDGE];

    fakeOpenRouter(5);
    expect(await main([...options, "--out", baseline])).toBe(0);

    fakeOpenRouter(5);
    const steady = path.join(root, "steady");
    expect(
      await main([...options, "--compare", path.join(baseline, "results.json"), "--out", steady]),
    ).toBe(0);
    expect(readFileSync(path.join(steady, "report.md"), "utf8")).toContain("## Compared with");

    fakeOpenRouter(3);
    const worse = path.join(root, "worse");
    expect(await main([...options, "--compare", baseline, "--out", worse])).toBe(2);
    expect(readRun(worse).rows[0]!.judgeMean).toBe(3);
    expect(readFileSync(path.join(worse, "report.md"), "utf8")).toContain(
      `## Compared with ${baseline}`,
    );
  });

  it("stops before any call when the key is missing", async () => {
    delete process.env.OPENROUTER_API_KEY;
    resetEnvForTests();
    const { fetchMock } = fakeOpenRouter(4);
    const out = path.join(root, "none");

    expect(await main(["--feature", "match-check", "--out", out])).toBe(1);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(existsSync(out)).toBe(false);
    expect(String(errors.mock.calls[0]?.[0])).toContain("OPENROUTER_API_KEY isn't set");
  });

  it("refuses --out without a folder", async () => {
    const { fetchMock } = fakeOpenRouter(4);
    expect(await main(["--out"])).toBe(1);
    expect(String(errors.mock.calls[0]?.[0])).toContain("--out needs a value");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
