import { rejectCrossSite } from "@/lib/auth/route-guards";
import { log } from "@/lib/log";
import { runMetered } from "../fix/metered";
import { ANSWER_ROUTE } from "./metered";
import { withApiLocale } from "@/lib/api/localize";

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = withApiLocale(async function POST(req: Request): Promise<Response> {
  const crossSite = rejectCrossSite(req);
  if (crossSite) {
    log.warn("answer.cross_site");
    return crossSite;
  }
  return runMetered(req, ANSWER_ROUTE);
});
