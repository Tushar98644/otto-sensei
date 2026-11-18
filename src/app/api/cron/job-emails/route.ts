import { runCronRoute } from "@/lib/cron/run";
import { emailSender } from "@/lib/notifications/email";
import { runWeeklyJobEmails } from "@/lib/notifications/weekly-jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function GET(req: Request): Promise<Response> {
  return runCronRoute(req, "job_emails", (context) =>
    runWeeklyJobEmails(context, { sender: emailSender() }),
  );
}

export const POST = GET;
