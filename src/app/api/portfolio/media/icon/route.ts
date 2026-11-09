import { z } from "zod";
import { fail } from "@/lib/api/respond";
import { rejectNonJson } from "@/lib/auth/route-guards";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { CONTENT_LIMITS } from "@/lib/portfolio/content";
import { fetchSiteIcon } from "@/lib/portfolio/media-upload";
import { keepPicture, uploadGate } from "../shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IconSchema = z.object({ url: z.string().trim().min(3).max(CONTENT_LIMITS.url) });

// POST /api/portfolio/media/icon { url }: keeps the website's icon as a logo, so a company or
// project gets its mark without the owner finding one. 404 when the site has none (the page then
// draws the monogram).
export async function POST(req: Request): Promise<Response> {
  const blocked = rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const user = await uploadGate(req);
    if (user instanceof Response) return user;
    const body = await readJson(req, IconSchema);
    if (!body.ok) return fail("bad_request", "That isn't a website address.", 400);
    const bytes = await fetchSiteIcon(body.data.url);
    if (!bytes)
      return fail("not_found", "That site has no icon we could use. Upload a logo instead.", 404);
    return await keepPicture(user, bytes, "logo");
  } catch (error) {
    log.error("portfolio.media_icon_failed", error);
    return fail("server_error", "Couldn't get that site's icon. Please try again.", 500);
  }
}
