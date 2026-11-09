import { fail, ok } from "@/lib/api/respond";
import { rejectCrossSite } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { log } from "@/lib/log";
import { deleteMedia, mediaUsage } from "@/lib/portfolio/media-records";
import { readImageUpload } from "@/lib/portfolio/media-upload";
import { NO_STORE, SIGN_IN } from "../limits";
import { keepPicture, uploadGate } from "./shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Decoding and re-encoding a 4 MB picture takes well under a second; this leaves room for a slow store.
export const maxDuration = 30;

// POST /api/portfolio/media (multipart: file, kind): one picture for the portfolio. Answers with
// the reference to put in the content document; until a save uses it, it's swept after a while.
export async function POST(req: Request): Promise<Response> {
  try {
    const user = await uploadGate(req);
    if (user instanceof Response) return user;
    const upload = await readImageUpload(req);
    if (upload instanceof Response) return upload;
    return await keepPicture(user, upload.bytes, upload.kind);
  } catch (error) {
    log.error("portfolio.media_upload_failed", error);
    return fail("server_error", "Couldn't keep that picture. Please try again.", 500);
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// DELETE /api/portfolio/media?id=: deletes one of the account's pictures now. The editor's Remove
// doesn't need it (removed pictures are swept), but an upload that never made it into the page does.
export async function DELETE(req: Request): Promise<Response> {
  const crossSite = rejectCrossSite(req);
  if (crossSite) return crossSite;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401);
    const id = new URL(req.url).searchParams.get("id") ?? "";
    if (!UUID.test(id)) return fail("bad_request", "That isn't one of your pictures.", 400);
    const deleted = await deleteMedia(user.id, id);
    if (!deleted) return fail("not_found", "That picture is already gone.", 404);
    return ok({ media: await mediaUsage(user.id) }, { headers: NO_STORE });
  } catch (error) {
    log.error("portfolio.media_delete_failed", error);
    return fail("server_error", "Couldn't delete that picture. Please try again.", 500);
  }
}
