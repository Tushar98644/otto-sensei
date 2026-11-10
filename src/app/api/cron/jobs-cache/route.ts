import { runCronRoute } from "@/lib/cron/run";
import { dropJobsCache } from "@/lib/job-feed/public-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The daily job read runs in GitHub Actions (.github/workflows/jobs-ingest.yml), outside Vercel, so
// it can't clear this deployment's cached /jobs pages itself. It calls this when it's done.
// Needs "Authorization: Bearer <CRON_SECRET>", like every cron route.
export function POST(req: Request): Promise<Response> {
  return runCronRoute(req, "jobs-cache", async () => {
    dropJobsCache();
    return { stats: {}, complete: true, failed: [] };
  });
}
