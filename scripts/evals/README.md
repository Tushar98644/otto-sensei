# AI feature evals

Runs the real product AI functions (fix, tailor, letters and so on) on synthetic cases, for one or more OpenRouter models, and grades every output two ways:

- **Deterministic checks**: schema, length limits, invented numbers, words not in the input, banned phrases. Free and exact.
- **A blind LLM judge**: a 1 to 5 score per rubric criterion. It never sees which model wrote the output.

Each run writes `results.json` and `report.md` to `../otto-sensei-evals/<timestamp>/`, next to the repo and outside it, like `scripts/match-eval.ts`.

## Suites

| `--feature`   | Calls                                                                             | Cases                       |
| ------------- | --------------------------------------------------------------------------------- | --------------------------- |
| `fix`         | `fixBullet`, as `/api/fix` does                                                   | 25                          |
| `letters`     | `writeCoverLetter` and `writeOutreach`, as `/api/letter` and `/api/outreach` do   | 22 (13 letters, 9 outreach) |
| `match-check` | `matchCheck` and `matchCheckFromText` (no AI call, so only the judge costs money) | 22                          |
| `structure`   | `structureResume`, as `/api/import` does                                          | 22                          |
| `tailor`      | `tailorResume`, as `/api/tailor` does                                             | 23                          |

When the product falls back to its demo or rule-based result, the case counts as an error, not a pass, except where an empty read is the right answer (text that isn't a resume).

## Running

Run from the repo root, so bun loads `OPENROUTER_API_KEY` from `.env.local`.

```bash
bun scripts/evals/run.ts --dry-run                       # offline: checks cases and graders, prints the cost estimate
bun scripts/evals/run.ts --feature fix --cases 3         # a small real run on AI_MODEL
bun scripts/evals/run.ts --models z-ai/glm-5.3-flash,lab/other-model --max-usd 1
bun scripts/evals/run.ts --compare ../otto-sensei-evals/2026-11-20T10-00-00Z
```

| Option                  | Default                      | Meaning                                                                                           |
| ----------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------- |
| `--feature <name\|all>` | `all`                        | one suite, a comma list, or all                                                                   |
| `--models <ids>`        | `AI_MODEL`                   | comma list of OpenRouter model ids; they run one after another                                    |
| `--cases <n\|all>`      | `all`                        | the first n cases of each suite                                                                   |
| `--judge <id\|none>`    | `anthropic/claude-haiku-5.5` | judge model; `none` skips judging                                                                 |
| `--max-usd <usd>`       | `2`                          | hard cap on everything the run spends, product calls and judge together                           |
| `--dry-run`             | off                          | no network at all: validates every suite, grades each case's `golden` output, prints the estimate |
| `--compare <dir>`       | none                         | an older results folder (or its `results.json`); changes are shown and regressions flagged        |
| `--concurrency <n>`     | `4`                          | cases in flight at once for one model                                                             |
| `--lift-price-cap`      | off                          | drops the product's `provider.max_price` so models priced above `AI_MAX_PRICE` can answer         |
| `--verbose`             | off                          | keeps the product's `[info]` logs                                                                 |

Exit codes: 0 ok, 1 a problem (bad options, a dry-run problem, an error), 2 a real run with `--compare` that flagged a regression.

The report has one row per feature and model: cases, pass rate (the share of cases where every deterministic check passed, with errors counted as fails), mean judge score, p50 latency, cost per call (product spend per case, judge excluded), errors and skipped cases. Under it, per feature and model, it lists the failing checks and the worst cases with their reasons. With `--compare`, these changes count as regressions: pass rate down 5 points or more, judge mean down 0.25 or more, and p50 latency or cost per call up 25% or more.

## Cost

- A real run first reads live prices from OpenRouter's public model list (free), prints an estimate per feature and model, then runs.
- Every request goes through a meter that allows only OpenRouter, asks OpenRouter for the real cost of each call (`usage.include`), and adds it to the budget. Before a case starts it reserves its estimated cost. A case that doesn't fit is skipped, and once spending reaches `--max-usd` every further call is refused. A case whose call was refused counts as skipped, even when the product falls back instead of failing. At worst the run overshoots by the calls already in flight.
- Product calls keep the product's own `provider.max_price` (`AI_MAX_PRICE` in `src/lib/ai/client.ts`), so none costs more than that per token. A model with no endpoint under the cap fails with "no provider". Pass `--lift-price-cap` to evaluate pricier models.
- The dry-run estimate is offline. It prices product calls at the cap, an upper bound, and the judge at match-eval's figure. Estimates assume one call per case and no retries, though `letters` makes a second call when its first draft fails the product's own checks; reasoning tokens are billed as output.
- Analytics and error-report keys are removed from the process env, so eval traffic never reaches PostHog or Sentry.

## Adding a suite

1. Create `scripts/evals/suites/<feature>.ts` and export a suite made with `defineSuite` from `../suite`. See `suites/fix.ts`.
2. Add one import and one entry to `SUITES` in `scripts/evals/suites/index.ts`, in name order.
3. Run `bun scripts/evals/run.ts --dry-run --feature <feature>` until it says "Dry run passed."

A suite has:

- `name`: lowercase-with-dashes, used by `--feature`. Also `description`.
- `cases`: `{ id, input, expect?, golden?, note? }`. Use synthetic people and companies only. `golden` is a good output in the product's result shape, which the dry run grades. Give most cases one.
- `inputSchema` (optional): a zod schema each case input must pass, ideally the route's own request schema from `@/lib/api/types`.
- `run(kase, model)`: calls the real product function, for example `fixBullet(kase.input)`. Never copy a prompt. The harness has already pointed `AI_MODEL` and `AI_STRUCTURE_MODEL` at `model`. If the product swallows an AI failure and returns a fallback (for example `usedAI: false`), throw, so the case counts as an error.
- `graders`: `(output, kase) => Grade | Grade[]`, where `Grade` is `{ name, pass, detail }`. Build them from the shared graders in `src/lib/evals/graders.ts`: `matchesSchema`, `withinLength`, `noInventedNumbers`, `novelWordsAtMost`, `noBannedPhrases` (with `AI_TELLS`, or `CLICHES` from `@/lib/ai/writing-guards`).
- `rubric`: `{ task, criteria: [{ id, description }], scale? }`. Criterion ids are lowercase_with_underscores. The default scale runs from 1 (unusable) to 5 (excellent).
- `judgeInput(kase)` and `judgeOutput(output, kase)` (optional, default JSON): the text the judge reads.
- `estimate(kase)` (optional): `{ calls, inputTokens, outputTokens }` per case for the cost estimate. Use the product's prompt constant, for example `tokensOf(FIX_SYSTEM_PROMPT)`.

Tests for the harness live in `src/lib/evals/*.test.ts`, because vitest only collects tests under `src/`. They mock fetch and make no network calls.
