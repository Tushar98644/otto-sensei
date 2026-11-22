import { runCronRoute } from "@/lib/cron/run";
import { runInterviewAutopilot } from "@/lib/interviews/autopilot";
import { emailSender } from "@/lib/notifications/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function GET(req: Request): Promise<Response> {
  return runCronRoute(req, "interview_briefs", (context) =>
    runInterviewAutopilot(context, { sender: emailSender() }),
  );
}

export const POST = GET;
