import { runCareerCheckins } from "@/lib/career-log/checkins";
import { runCronRoute } from "@/lib/cron/run";
import { emailSender } from "@/lib/notifications/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function GET(req: Request): Promise<Response> {
  return runCronRoute(req, "career_checkins", (context) =>
    runCareerCheckins(context, { sender: emailSender() }),
  );
}

export const POST = GET;
