import { NextResponse, type NextRequest } from "next/server";
import { loginHref, safeNextPath } from "@/components/account/next-path";
import { clearSession, getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Safe as a GET: a working session is never touched.
export async function GET(req: NextRequest) {
  const next = safeNextPath(req.nextUrl.searchParams.get("next"));
  if (await getCurrentUser()) return NextResponse.redirect(new URL(next, req.url));
  await clearSession();
  return NextResponse.redirect(new URL(loginHref(next), req.url));
}
