# AI feature evals

Runs the real product AI functions (fix, tailor, letters and so on) on synthetic cases, for one or more OpenRouter models, and grades every output two ways:

- **Deterministic checks**: schema, length limits, invented numbers, words not in the input, banned phrases. Free and exact.
- **A blind LLM judge**: a 1 to 5 score per rubric criterion. It never sees which model wrote the output.

Each run writes `results.json` and `report.md` to `../otto-sensei-evals/<timestamp>/`, next to the repo and outside it, like `scripts/match-eval.ts`, or to the folder `--out` names. CI runs them on its own: see [Running in CI](#running-in-ci).

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

Run from the repo root, so bun loads `OPENROUTER_API_KEY` from `.env.local`. CI has no `.env.local`: it sets `OPENROUTER_API_KEY` alone, and everything else, `AI_MODEL` included, takes its default from `src/lib/env.ts`.

```bash
bun scripts/evals/run.ts --dry-run                       # offline: checks cases and graders, prints the cost estimate
bun scripts/evals/run.ts --feature fix --cases 3         # a small real run on AI_MODEL
bun scripts/evals/run.ts --models z-ai/glm-5.3-flash,lab/other-model --max-usd 1
bun scripts/evals/run.ts --compare ../otto-sensei-evals/2026-11-20T10-00-00Z
bun scripts/evals/run.ts --max-usd 0.50 --out scripts/evals/baseline   # record the CI baseline
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
| `--out <dir>`           | a new timestamped folder     | the folder `results.json` and `report.md` go into, created if missing; overwrites what's there    |
| `--concurrency <n>`     | `4`                          | cases in flight at once for one model                                                             |
| `--lift-price-cap`      | off                          | drops the product's `provider.max_price` so models priced above `AI_MAX_PRICE` can answer         |
| `--verbose`             | off                          | keeps the product's `[info]` logs                                                                 |

Exit codes: 0 ok, 1 a problem (bad options, a dry-run problem, an error), 2 a real run with `--compare` that flagged a regression.

## The report

The summary table has one row per feature and model: cases, pass rate (the share of cases where every deterministic check passed, with errors counted as fails), mean judge score, p50 latency, cost per call (product spend per case, judge excluded), errors and skipped cases.

Each feature then gets two tables that show where models differ:

- **Judge score per criterion**: one row per model and one column per rubric criterion, each the mean 1 to 5 score over the cases the judge scored. `-` means no case was scored on it.
- **Pass rate per check**: one row per deterministic check (grade name) and one column per model. A rate counts only the outputs that check graded, since some checks apply to some cases only, so errors are left out here (they are in the summary's Errors column). When a check grades one output more than once, that output passes only if every grade passed.

Under those, per model, it lists the failing checks and the worst cases with their reasons.

With `--compare`, the report adds the summary's changes and, under each feature, the change per criterion and per check. These count as regressions:

- pass rate, overall or for one check, down 5 points or more
- judge mean, overall or for one criterion, down 0.25 or more
- p50 latency or cost per call up 25% or more (latency also by at least 250 ms)

Every regression counts toward exit code 2, and the report says how many came from criteria and checks. A criterion or check that only one of the two runs has is unknown on the other side: it shows the value it has, with no change and no flag.

`results.json` keeps each case's scores per criterion under `results[].judge.scores`, and each summary row's means under `rows[].criteria` (criterion id to mean, or `null` when no case was scored) and pass rates under `rows[].checks` (grade name to a share from 0 to 1). Results files written before these existed still load with `--compare`: their criteria and checks read as unknown, so nothing is flagged for them.

## Cost

- A real run first reads live prices from OpenRouter's public model list (free), prints an estimate per feature and model, then runs.
- Every request goes through a meter that allows only OpenRouter, asks OpenRouter for the real cost of each call (`usage.include`), and adds it to the budget. Before a case starts it reserves its estimated cost. A case that doesn't fit is skipped, and once spending reaches `--max-usd` every further call is refused. A case whose call was refused counts as skipped, even when the product falls back instead of failing. At worst the run overshoots by the calls already in flight.
- Product calls keep the product's own `provider.max_price` (`AI_MAX_PRICE` in `src/lib/ai/client.ts`), so none costs more than that per token. A model with no endpoint under the cap fails with "no provider". Pass `--lift-price-cap` to evaluate pricier models.
- The dry-run estimate is offline. It prices product calls at the cap, an upper bound, and the judge at match-eval's figure. Estimates assume one call per case and no retries, though `letters` makes a second call when its first draft fails the product's own checks; reasoning tokens are billed as output.
- Analytics and error-report keys are removed from the process env, so eval traffic never reaches PostHog or Sentry.

## Running in CI

`.github/workflows/evals.yml` runs every suite on `AI_MODEL`'s default model, with the judge on and `--max-usd 0.50`:

- **On a push to `main`** that changes code the suites exercise: `src/lib/ai/**` (fix, tailor, structure, the letters and outreach writer in `writing.ts`, the prompts and the client), `src/lib/tailor/**`, `src/lib/match-check/**`, `src/lib/writing-style/**`, `src/lib/writings/schema.ts`, `src/lib/evals/graders.ts`, `scripts/evals/**`, `scripts/match-eval/resumes.ts` or the workflow itself. Markdown, `*.test.ts` and `scripts/evals/baseline/**` don't count.
- **Every Monday** at 06:17 UTC.
- **By hand**: Actions > Evals > Run workflow, with `models` (a comma list; empty means `AI_MODEL`'s default), `feature` (`all`, a suite or a comma list) and `max-usd`.

Runs go one at a time: a newer one waits instead of cancelling one that has already spent money. The job reads the key from the repository secret `OPENROUTER_EVAL_KEY` and passes it as `OPENROUTER_API_KEY`. Without the secret the job ends green after its first step, with "Evals skipped" in the job summary: no checkout, no install, no call.

A run writes `report.md` to the job summary and uploads `results.json` and `report.md` as the `eval-report` artifact, kept 90 days. The job fails when the runner exits 1 (bad inputs, an unknown model, OpenRouter's model list unreachable) or 2 (a regression, below). Cases that error don't fail it by themselves: they show in the report, and against a baseline they lower the pass rate.

### The key

Give CI a key of its own, never the product's, with a spending limit:

1. On openrouter.ai, open Settings > API Keys and create a key, for example `otto-evals-ci`.
2. Set its credit limit to a few dollars, say $5. OpenRouter refuses the key's calls once it has spent that, whatever `--max-usd` says. The account needs credits as well.
3. On GitHub, open Settings > Secrets and variables > Actions > New repository secret, name it `OPENROUTER_EVAL_KEY` and paste the key. Or run `gh secret set OPENROUTER_EVAL_KEY` and paste it at the prompt.
4. Start one run by hand to check it.

To stop the evals, delete the secret (runs then end green and call nothing) or disable the workflow. Once the key's limit is spent, every case errors; raise the limit on OpenRouter.

### The baseline

When `scripts/evals/baseline/results.json` is committed, every run passes `--compare` with it and the job fails on exit code 2, that is when anything counts as a regression (see [The report](#the-report)). Without it, runs only report.

To record the baseline, or to update it after a change you accept (a new default model, a reworded prompt, new cases):

1. Run the workflow by hand on `main` with the default inputs, so the baseline has the features, model and judge the push and weekly runs use.
2. Download that run's `eval-report` artifact and copy its `results.json` and `report.md` into `scripts/evals/baseline/`.
3. Commit both. A change under `scripts/evals/baseline/` doesn't start a run.

Locally, `bun scripts/evals/run.ts --max-usd 0.50 --out scripts/evals/baseline` records one too (it needs the key in `.env.local`), but a CI run matches what later CI runs measure. Rows are matched by feature and model, so a run on other models shows them as new and flags nothing. Latency varies from run to run: if a run flags only p50 latency, run it again before treating it as a regression.

### Cost per run

The dry run puts the CI run at about $0.09: $0.067 for product calls, priced at the product's cap (`AI_MAX_PRICE`), so an upper bound, and $0.022 for the judge (`anthropic/claude-haiku-5.5`, $0.10 in and $0.50 out per million tokens). `match-check` makes no product call, so it costs only its judge calls. Retries, the second letter draft and moderation calls add a little. The run prints a live estimate before it starts, and the report says what it spent.

That makes the weekly run about $0.40 a month, plus about $0.09 for each push that changes the AI code. A run by hand costs about that per model; raise `max-usd` for several models or pricier ones. `bun scripts/evals/run.ts --dry-run` prints the current estimate.

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

Tests for the harness live in `src/lib/evals/*.test.ts`, because vitest only collects tests under `src/`. They mock fetch and make no network calls. `match-check-regression.test.ts` runs the whole match-check suite on the product's real output, and `run.test.ts` runs the CLI the way CI does: `OPENROUTER_API_KEY` alone, a fake OpenRouter, `--out`, and exit code 2 on a regression.
