import { runCronRoute } from "@/lib/cron/run";
import { runViewAlerts } from "@/lib/notifications/view-alerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function GET(req: Request): Promise<Response> {
  return runCronRoute(req, "view_alerts", runViewAlerts);
}

export const POST = GET;
