import { NextResponse, type NextRequest } from "next/server";
import { loginHref, safeNextPath } from "@/components/account/next-path";
import { clearSession, getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Where /dashboard sends someone whose session cookies no longer work (expired, signed out
// elsewhere, or the account was deleted). Clearing them stops src/proxy.ts from sending them from
// the home page back to the dashboard. Safe as a GET: a working session is never touched, only
// passed on to where it was going.
export async function GET(req: NextRequest) {
  const next = safeNextPath(req.nextUrl.searchParams.get("next"));
  if (await getCurrentUser()) return NextResponse.redirect(new URL(next, req.url));
  await clearSession();
  return NextResponse.redirect(new URL(loginHref(next), req.url));
}
