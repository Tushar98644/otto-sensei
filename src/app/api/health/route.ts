import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { fail, ok } from "@/lib/api/respond";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// For uptime monitors: 200 only when the database answers.
export async function GET() {
  try {
    const db = await getDb();
    await db.execute(sql`select 1`);
    return ok({ db: "up" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    log.error("health.db_down", error);
    return fail("server_error", "Database unavailable.", 503, { "Cache-Control": "no-store" });
  }
}
