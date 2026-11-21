import { describe, expect, it } from "vitest";
import { parseArgs, USAGE } from "../../../scripts/evals/args";

const DEFAULTS = { model: "lab/default", judge: "lab/judge-1" };

describe("parseArgs", () => {
  it("fills in the defaults", () => {
    expect(parseArgs([], DEFAULTS)).toEqual({
      ok: true,
      options: {
        features: "all",
        models: ["lab/default"],
        cases: "all",
        judge: "lab/judge-1",
        maxUsd: 2,
        dryRun: false,
        compare: null,
        concurrency: 4,
        liftPriceCap: false,
        verbose: false,
      },
    });
  });

  it("reads every option, in both spellings", () => {
    const parsed = parseArgs(
      [
        "--feature=fix,tailor",
        "--models",
        "lab/a, lab/b,lab/a",
        "--cases",
        "3",
        "--judge=none",
        "--max-usd",
        "0.5",
        "--dry-run",
        "--compare",
        "../otto-sensei-evals/2026-11-20T10-00-00Z",
        "--concurrency=2",
        "--lift-price-cap",
        "--verbose",
      ],
      DEFAULTS,
    );
    expect(parsed).toEqual({
      ok: true,
      options: {
        features: ["fix", "tailor"],
        models: ["lab/a", "lab/b"],
        cases: 3,
        judge: null,
        maxUsd: 0.5,
        dryRun: true,
        compare: "../otto-sensei-evals/2026-11-20T10-00-00Z",
        concurrency: 2,
        liftPriceCap: true,
        verbose: true,
      },
    });
  });

  it.each([
    [["--cases", "0"], "--cases must be"],
    [["--cases", "two"], "--cases must be"],
    [["--max-usd", "-1"], "--max-usd must be"],
    [["--concurrency", "40"], "--concurrency must be"],
    [["--models", ","], "--models is empty"],
    [["--judge"], "--judge needs a value"],
    [["--judge", "--dry-run"], "--judge needs a value"],
    [["--model", "lab/a"], "Unknown option --model"],
  ])("rejects %j", (argv, message) => {
    const parsed = parseArgs(argv, DEFAULTS);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error).toContain(message);
  });

  it("answers --help with the usage", () => {
    expect(parseArgs(["--help"], DEFAULTS)).toEqual({ ok: false, error: USAGE });
  });
});
