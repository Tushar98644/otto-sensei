import { rateLimit } from "@/lib/rate-limit";
import { findPublicShare, type PublicShare } from "./records";
import { SHARE_SLUG } from "./types";

export const PAGE_OPENS_PER_MINUTE = 60;

export type SharePage =
  | { status: "ok"; share: PublicShare }
  | { status: "missing" }
  | { status: "rate_limited"; retryAfterMs: number };

type HeaderReader = { get(name: string): string | null };

export function ipFromHeaders(headers: HeaderReader): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim() || "unknown";
  return headers.get("x-real-ip")?.trim() || "unknown";
}

export async function openSharePage(
  slug: string,
  ip: string,
  now = Date.now(),
): Promise<SharePage> {
  if (!SHARE_SLUG.test(slug)) return { status: "missing" };
  const limit = await rateLimit(`share:page:ip:${ip}`, PAGE_OPENS_PER_MINUTE, 60_000, now);
  if (!limit.allowed) return { status: "rate_limited", retryAfterMs: limit.retryAfterMs };
  const share = await findPublicShare(slug);
  return share ? { status: "ok", share } : { status: "missing" };
}
