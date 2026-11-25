import { runCronRoute } from "@/lib/cron/run";
import { runJobAlerts } from "@/lib/job-feed/alerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function GET(req: Request): Promise<Response> {
  return runCronRoute(req, "job_alerts", runJobAlerts);
}

export const POST = GET;
