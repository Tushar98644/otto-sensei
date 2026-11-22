import { runCronRoute } from "@/lib/cron/run";
import { runInterviewAutopilot } from "@/lib/interviews/autopilot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function GET(req: Request): Promise<Response> {
  return runCronRoute(req, "interview_briefs", runInterviewAutopilot);
}

export const POST = GET;
