import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { rejectCrossSite } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { deleteSavedPost, getSavedPost } from "@/lib/extension/posts";
import type { SavedPostResponse } from "@/lib/extension/types";
import { PostIdSchema } from "@/lib/extension/validation";
import { log } from "@/lib/log";
import { withApiLocale } from "@/lib/api/localize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGN_IN = "Sign in to see your saved jobs.";
const MISSING = "That saved job isn't here any more.";

type Context = { params: Promise<{ id: string }> };

async function postId(context: Context): Promise<string | null> {
  const parsed = PostIdSchema.safeParse((await context.params).id);
  return parsed.success ? parsed.data : null;
}

// The saved copy of a post, for Tailor and Letter opened from the extension.
export const GET = withApiLocale(async function GET(
  _req: Request,
  context: Context,
): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const id = await postId(context);
    const post = id ? await getSavedPost(user.id, id) : null;
    if (!post) return fail("not_found", MISSING, 404, NO_STORE);
    const response: Omit<SavedPostResponse, "ok"> = { post };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("saved_posts.read_failed", error);
    return fail("server_error", "Couldn't open that saved job. Please try again.", 500, NO_STORE);
  }
});

export const DELETE = withApiLocale(async function DELETE(
  req: Request,
  context: Context,
): Promise<Response> {
  const blocked = rejectCrossSite(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const id = await postId(context);
    if (id) await deleteSavedPost(user.id, id);
    return ok({ removed: true }, { headers: NO_STORE });
  } catch (error) {
    log.error("saved_posts.delete_failed", error);
    return fail("server_error", "Couldn't remove that job. Please try again.", 500, NO_STORE);
  }
});
