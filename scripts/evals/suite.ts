import type { z } from "zod";
import type { Grade } from "@/lib/evals/graders";

export type { Grade };

export type EvalCase<I, O, E = undefined> = {
  id: string;
  input: I;
  expect?: E;
  golden?: O;
  note?: string;
};

export type Grader<I, O, E = undefined> = (
  output: O,
  kase: EvalCase<I, O, E>,
) => Grade | readonly Grade[];

export type Criterion = { id: string; description: string };

export type Scale = Readonly<Record<1 | 2 | 3 | 4 | 5, string>>;

export type Rubric = { task: string; criteria: readonly Criterion[]; scale?: Scale };

export type CallEstimate = { calls: number; inputTokens: number; outputTokens: number };

export type EvalSuite<I, O, E = undefined> = {
  name: string;
  description: string;
  inputSchema?: z.ZodType<I>;
  cases: readonly EvalCase<I, O, E>[];
  run: (kase: EvalCase<I, O, E>, model: string) => Promise<O>;
  graders: readonly Grader<I, O, E>[];
  rubric: Rubric;
  judgeInput?: (kase: EvalCase<I, O, E>) => string;
  judgeOutput?: (output: O, kase: EvalCase<I, O, E>) => string;
  estimate?: (kase: EvalCase<I, O, E>) => CallEstimate;
};

export type AnySuite = EvalSuite<unknown, unknown, unknown>;

export type AnyCase = EvalCase<unknown, unknown, unknown>;

// The registry holds suites of different types, so each one is stored type-erased.
export function defineSuite<I, O, E = undefined>(suite: EvalSuite<I, O, E>): AnySuite {
  return suite as unknown as AnySuite;
}
