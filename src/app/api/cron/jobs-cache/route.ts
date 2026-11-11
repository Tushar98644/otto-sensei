import { runCronRoute } from "@/lib/cron/run";
import { dropJobsCache } from "@/lib/job-feed/public-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(req: Request): Promise<Response> {
  return runCronRoute(req, "jobs-cache", async () => {
    dropJobsCache();
    return { stats: {}, complete: true, failed: [] };
  });
}
