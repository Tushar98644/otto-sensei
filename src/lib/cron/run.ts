import { fail, ok } from "@/lib/api/respond";
import { log } from "@/lib/log";
import { isAuthorizedCron } from "./auth";

// Checks the secret, gives the job a time budget, logs one line, and answers 500 when any part
// failed so Vercel's cron log shows it. Vercel may deliver a call twice and a run can stop at its
// deadline, so every job is idempotent and picks up the rest next run.

export type CronStats = Record<string, number>;

export type CronOutcome = {
  stats: CronStats;
  // False when it stopped with work left for the next run.
  complete: boolean;
  // The steps that threw. The others still ran.
  failed: string[];
};

export type CronContext = {
  // For the job's own cutoffs ("older than 21 days").
  now: number;
  // Wall-clock time after which no new batch starts.
  deadline: number;
};

export type CronJob = (context: CronContext) => Promise<CronOutcome>;

export type CronResponse = {
  ok: true;
  job: string;
  complete: boolean;
  durationMs: number;
  stats: CronStats;
};

// Under the routes' 60-second maxDuration, with room for the last batch and the response.
export const CRON_BUDGET_MS = 45_000;

const NO_STORE = { "Cache-Control": "no-store" };

export async function runCronRoute(req: Request, name: string, job: CronJob): Promise<Response> {
  if (!isAuthorizedCron(req)) {
    log.warn("cron.unauthorized", { job: name });
    return fail("unauthorized", "Not allowed.", 401, NO_STORE);
  }
  const started = Date.now();
  try {
    const outcome = await job({ now: started, deadline: started + CRON_BUDGET_MS });
    const durationMs = Date.now() - started;
    const fields = { job: name, complete: outcome.complete, durationMs, ...outcome.stats };
    if (outcome.failed.length > 0) {
      // Each failed step already logged (and reported) its own error.
      log.warn(`cron.${name}.partial_failure`, { ...fields, failed: outcome.failed.join(",") });
      return fail("server_error", `Some steps failed: ${outcome.failed.join(", ")}.`, 500, NO_STORE);
    }
    log.info(`cron.${name}.done`, fields);
    const body: Omit<CronResponse, "ok"> = {
      job: name,
      complete: outcome.complete,
      durationMs,
      stats: outcome.stats,
    };
    return ok(body, { headers: NO_STORE });
  } catch (error) {
    log.error(`cron.${name}.failed`, error, { job: name, durationMs: Date.now() - started });
    return fail("server_error", "The job failed.", 500, NO_STORE);
  }
}

// Until a short batch (nothing left), the deadline, or `maxBatches`.
export async function drain(
  step: () => Promise<number>,
  { batchSize, maxBatches, deadline }: { batchSize: number; maxBatches: number; deadline: number },
): Promise<{ count: number; done: boolean }> {
  let count = 0;
  for (let batch = 0; batch < maxBatches; batch++) {
    if (Date.now() >= deadline) return { count, done: false };
    const handled = await step();
    count += handled;
    if (handled < batchSize) return { count, done: true };
  }
  return { count, done: false };
}
