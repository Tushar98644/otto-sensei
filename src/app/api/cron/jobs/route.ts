import { runJobsIngest } from "@/lib/job-feed/ingest";
import { dropJobsCache } from "@/lib/job-feed/public-cache";
import { runCronRoute } from "@/lib/cron/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Reading a few hundred company boards takes minutes, not seconds. Fluid compute allows 300 s on
// every plan; with a shorter limit a run still saves board by board and the next run resumes.
export const maxDuration = 300;

// Stops starting new boards after this, leaving room for the last reads and the tidy-up.
const INGEST_BUDGET_MS = 240_000;

// Vercel Cron calls GET (vercel.json); POST is for manual runs. Both need Bearer CRON_SECRET.
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
