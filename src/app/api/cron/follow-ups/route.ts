import { runFollowUps } from "@/lib/cron/follow-ups";
import { runCronRoute } from "@/lib/cron/run";
import { emailSender } from "@/lib/notifications/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Vercel Cron calls GET (schedule in vercel.json); POST is for a manual run or another scheduler.
// Both need "Authorization: Bearer <CRON_SECRET>".
export function GET(req: Request): Promise<Response> {
  return runCronRoute(req, "follow_ups", (context) =>
    runFollowUps(context, { sender: emailSender() }),
  );
}

export const POST = GET;
