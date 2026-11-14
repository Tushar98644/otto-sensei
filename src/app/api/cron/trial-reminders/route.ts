import { runTrialReminders } from "@/lib/cron/trial-reminders";
import { runCronRoute } from "@/lib/cron/run";
import { emailSender } from "@/lib/notifications/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function GET(req: Request): Promise<Response> {
  return runCronRoute(req, "trial_reminders", (context) =>
    runTrialReminders(context, { sender: emailSender() }),
  );
}

export const POST = GET;
