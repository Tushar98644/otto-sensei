import { runCleanup } from "@/lib/cron/cleanup";
import { runCronRoute } from "@/lib/cron/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function GET(req: Request): Promise<Response> {
  return runCronRoute(req, "cleanup", runCleanup);
}

export const POST = GET;
