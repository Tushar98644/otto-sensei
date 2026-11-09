import { fail, ok } from "@/lib/api/respond";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { countView, findViewTarget } from "@/lib/portfolio/records";
import { PortfolioViewSchema } from "@/lib/portfolio/types";
import { isAutomatedAgent } from "@/lib/share/visits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COUNTED = { counted: true };
const NOT_COUNTED = { counted: false };

// Signed-in owners checking their own page shouldn't add to it. Only a visitor with a session
// cookie costs a call to Supabase; a failure just means "count it".
async function ownerIsReading(ownerId: string): Promise<boolean> {
  try {
    return (await getCurrentUser())?.id === ownerId;
  } catch {
    return false;
  }
}

// POST /api/portfolio/views (body { slug }): sent once per tab by a published page after it
// loads, because the page itself is served from the cache. Always 200 for a well-formed body, so
// the answer says nothing about which addresses exist.
export async function POST(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const body = await readJson(req, PortfolioViewSchema);
    if (!body.ok) return fail("bad_request", "That view couldn't be counted.", 400);
    if (isAutomatedAgent(req.headers.get("user-agent"))) return ok(NOT_COUNTED);
    const target = await findViewTarget(body.data.slug);
    if (!target || (await ownerIsReading(target.ownerId))) return ok(NOT_COUNTED);
    return ok((await countView(target.id)) ? COUNTED : NOT_COUNTED);
  } catch (error) {
    // A lost view is not worth an error on someone else's page.
    log.warn("portfolio.view_not_counted", {}, error);
    return ok(NOT_COUNTED);
  }
}
