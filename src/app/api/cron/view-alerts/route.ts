import { runCronRoute } from "@/lib/cron/run";
import { emailSender } from "@/lib/notifications/email";
import { runViewAlerts } from "@/lib/notifications/view-alerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function GET(req: Request): Promise<Response> {
  return runCronRoute(req, "view_alerts", (context) =>
    runViewAlerts(context, { sender: emailSender() }),
  );
}

export const POST = GET;
