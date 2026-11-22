import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { getCurrentUser } from "@/lib/auth/session";
import { listSavedPosts } from "@/lib/extension/posts";
import type { SavedPostsResponse } from "@/lib/extension/types";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Jobs saved from Otto for Chrome, for the board's To apply column; the post text stays behind.
export async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", "Sign in to see your saved jobs.", 401, NO_STORE);
    const response: Omit<SavedPostsResponse, "ok"> = { posts: await listSavedPosts(user.id) };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("saved_posts.list_failed", error);
    return fail("server_error", "Couldn't load your saved jobs. Please try again.", 500, NO_STORE);
  }
}
