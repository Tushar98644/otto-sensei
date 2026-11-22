import { fail, ok } from "@/lib/api/respond";
import { rejectNonJson } from "@/lib/auth/route-guards";
import { savedPostBoardPath } from "@/lib/extension/links";
import { savePost } from "@/lib/extension/posts";
import { extensionPreflight, extensionRoute, SIGNED_OUT } from "@/lib/extension/route";
import { EXTENSION_LIMITS, type SavePostResponse } from "@/lib/extension/types";
import { SavePostSchema } from "@/lib/extension/validation";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { HOUR_MS } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMIT = { name: "save", limit: 120, windowMs: HOUR_MS };

// Save from the badge: a card in To apply with a copy of the post, one per job link.
export async function POST(req: Request): Promise<Response> {
  return extensionRoute(req, LIMIT, async ({ user }, headers) => {
    const wrongType = rejectNonJson(req);
    if (wrongType) return wrongType;
    const body = await readJson(req, SavePostSchema);
    if (!body.ok) {
      log.info("extension.save_bad_request", { reason: body.message });
      return fail(
        "bad_request",
        "Otto couldn't read this job. Reload the page and try again.",
        400,
        headers,
      );
    }
    const result = await savePost(user.id, body.data);
    if (result.status === "no_user") return fail("unauthorized", SIGNED_OUT, 401, headers);
    if (result.status === "bad_url") {
      return fail(
        "bad_request",
        "This page's link can't be saved. Open the job's own page and try again.",
        400,
        headers,
      );
    }
    if (result.status === "limit_reached") {
      return fail(
        "limit_reached",
        `You can keep up to ${EXTENSION_LIMITS.savedPosts.toLocaleString("en-US")} saved jobs. Remove some from To apply to save more.`,
        429,
        headers,
      );
    }
    log.info("extension.saved", { site: body.data.site, created: result.created });
    const response: Omit<SavePostResponse, "ok"> = {
      post: { ...result.ref, created: result.created },
      boardPath: savedPostBoardPath(result.ref.id),
    };
    return ok(response, { headers, status: result.created ? 201 : 200 });
  });
}

export function OPTIONS(req: Request): Response {
  return extensionPreflight(req);
}
