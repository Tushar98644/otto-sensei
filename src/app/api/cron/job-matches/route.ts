import { runCronRoute } from "@/lib/cron/run";
import { runWeeklyMatches } from "@/lib/notifications/weekly-jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function GET(req: Request): Promise<Response> {
  return runCronRoute(req, "job_matches", runWeeklyMatches);
}

export const POST = GET;
