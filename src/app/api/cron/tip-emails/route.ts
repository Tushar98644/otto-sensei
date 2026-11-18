import { runCronRoute } from "@/lib/cron/run";
import { emailSender } from "@/lib/notifications/email";
import { runTipEmails } from "@/lib/notifications/tips";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function GET(req: Request): Promise<Response> {
  return runCronRoute(req, "tip_emails", (context) =>
    runTipEmails(context, { sender: emailSender() }),
  );
}

export const POST = GET;
