import { runJobsIngest } from "@/lib/job-feed/ingest";
import { dropJobsCache } from "@/lib/job-feed/public-cache";
import { runCronRoute } from "@/lib/cron/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Fluid compute allows 300 s on every plan; a shorter limit still saves board by board.
export const maxDuration = 300;

const INGEST_BUDGET_MS = 240_000;

export function GET(req: Request): Promise<Response> {
  return runCronRoute(req, "jobs", async (context) => {
    const outcome = await runJobsIngest({
      now: context.now,
      deadline: context.now + INGEST_BUDGET_MS,
    });
    dropJobsCache();
    return outcome;
  });
}

export const POST = GET;
