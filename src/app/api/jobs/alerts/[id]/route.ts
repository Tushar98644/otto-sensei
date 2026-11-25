import { z } from "zod";
import { getDb } from "@/db/client";
import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { withApiLocale } from "@/lib/api/localize";
import { rejectCrossSite } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { listAlerts, removeAlert, type JobAlertsResponse } from "@/lib/job-feed/alerts";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IdSchema = z.uuid();

type Context = { params: Promise<{ id: string }> };

export const DELETE = withApiLocale(async function DELETE(
  req: Request,
  context: Context,
): Promise<Response> {
  const blocked = rejectCrossSite(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", "Sign in to see your job alerts.", 401, NO_STORE);
    const id = IdSchema.safeParse((await context.params).id);
    const db = await getDb();
    const response: Omit<JobAlertsResponse, "ok"> = {
      alerts: id.success
        ? await removeAlert(db, user.id, id.data, Date.now())
        : await listAlerts(db, user.id),
    };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("jobs.alert_remove_failed", error);
    return fail("server_error", "Couldn't remove that job alert. Please try again.", 500, NO_STORE);
  }
});
