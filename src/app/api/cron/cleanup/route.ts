import { runCleanup } from "@/lib/cron/cleanup";
import { runCronRoute } from "@/lib/cron/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Vercel Cron calls GET (vercel.json); POST is for manual runs. Both need Bearer CRON_SECRET.
export function GET(req: Request): Promise<Response> {
  return runCronRoute(req, "cleanup", runCleanup);
}

export const POST = GET;
