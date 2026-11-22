import { runFollowUps } from "@/lib/cron/follow-ups";
import { runCronRoute } from "@/lib/cron/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function GET(req: Request): Promise<Response> {
  return runCronRoute(req, "follow_ups", runFollowUps);
}

export const POST = GET;
