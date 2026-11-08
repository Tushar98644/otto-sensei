import { NextResponse, type NextRequest } from "next/server";
import { loginHref, safeNextPath } from "@/components/account/next-path";
import { finishOAuthSignIn } from "@/lib/auth/oauth";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Where Google (through Supabase) sends the browser back. Supabase adds ?code=... on success and
// ?error=... when the person cancelled or Google refused; either way they land somewhere useful.
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const next = safeNextPath(params.get("next"));
  const code = params.get("code");
  try {
    if (code && (await finishOAuthSignIn(code))) return noStore(NextResponse.redirect(new URL(next, req.url)));
  } catch (error) {
    log.error("auth.oauth_callback_failed", error);
  }
  if (params.has("error")) log.info("auth.oauth_cancelled", { reason: params.get("error")?.slice(0, 64) });
  const login = new URL(loginHref(next), req.url);
  login.searchParams.set("error", "google");
  return noStore(NextResponse.redirect(login));
}

// It carries session cookies: no shared cache may keep it.
function noStore(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "no-store");
  return response;
}
