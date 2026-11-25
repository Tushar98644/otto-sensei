import { limitReads } from "@/app/api/billing/read-limit";
import { BRAND } from "@/config/brand";
import { buildDataExport, zipStream } from "@/lib/account/data-export";
import { fail, NO_STORE } from "@/lib/api/respond";
import { rejectCrossSite } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { log } from "@/lib/log";
import { withApiLocale } from "@/lib/api/localize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiLocale(async function GET(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", "Sign in to download your data.", 401, NO_STORE);
    const limited = await limitReads("export", user.id);
    if (limited) return limited;
    const now = Date.now();
    const zip = await buildDataExport(user.id, now);
    const body = zipStream(zip, (end) => {
      if ("error" in end) log.error("account.export_stream_failed", end.error);
      else log.info("account.exported", { userId: user.id, bytes: end.bytes });
    });
    const name = `${BRAND.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-data-${new Date(now).toISOString().slice(0, 10)}.zip`;
    return new Response(body, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    log.error("account.export_failed", error);
    return fail(
      "server_error",
      "Couldn't put your data together. Please try again.",
      500,
      NO_STORE,
    );
  }
});
