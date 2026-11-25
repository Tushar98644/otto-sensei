import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { GoogleSignInSchema, type GoogleSignInResponse } from "@/lib/api/types";
import { AuthError } from "@/lib/auth/codes";
import { googleSignInUrl } from "@/lib/auth/oauth";
import { rejectNonJson } from "@/lib/auth/route-guards";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { withApiLocale } from "@/lib/api/localize";

export const runtime = "nodejs";

// JSON-only, so another site can't start a sign-in (and plant a PKCE verifier) with a form post.
export const POST = withApiLocale(async function POST(req: Request): Promise<Response> {
  const notJson = rejectNonJson(req);
  if (notJson) return notJson;
  const body = await readJson(req, GoogleSignInSchema);
  if (!body.ok) return fail("bad_request", "That sign-in link isn't valid.", 400);
  try {
    const response: Omit<GoogleSignInResponse, "ok"> = {
      url: await googleSignInUrl(body.data.next),
    };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof AuthError) return fail("auth_unavailable", error.message, 503);
    log.error("auth.google_start_failed", error);
    return fail(
      "server_error",
      "Google sign-in isn't working right now. Try your email instead.",
      500,
    );
  }
});
