import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { getCurrentUser } from "@/lib/auth/session";
import { log } from "@/lib/log";
import { readRecap } from "@/lib/recap/records";
import type { RecapResponse } from "@/lib/recap/types";
import { RecapWeekSchema } from "@/lib/recap/validation";
import { withApiLocale } from "@/lib/api/localize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ week: string }> };

const NOT_FOUND = "That week isn't here any more.";

export const GET = withApiLocale(async function GET(
  _req: Request,
  { params }: Context,
): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", "Sign in to see your week with Otto.", 401, NO_STORE);
    const { week } = await params;
    const recap = RecapWeekSchema.safeParse(week).success ? await readRecap(user.id, week) : null;
    if (!recap) return fail("not_found", NOT_FOUND, 404, NO_STORE);
    const response: Omit<RecapResponse, "ok"> = { recap };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("recap.read_failed", error);
    return fail("server_error", "Couldn't load that week. Please try again.", 500, NO_STORE);
  }
});
