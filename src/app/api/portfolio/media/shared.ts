import { fail, ok } from "@/lib/api/respond";
import { rejectCrossSite } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import type { SessionUser } from "@/lib/auth/types";
import { log } from "@/lib/log";
import type { MediaUploadResponse } from "@/lib/portfolio/content";
import { MEDIA_LIMITS, MEDIA_MESSAGES, type MediaKind } from "@/lib/portfolio/media";
import { MediaError, processImage } from "@/lib/portfolio/media-image";
import { mediaUsage, storeMedia } from "@/lib/portfolio/media-records";
import { mediaStore, mediaUrlFor } from "@/lib/portfolio/media-store";
import { canBuildPortfolio } from "@/lib/portfolio/plan";
import { rateLimit, retryAfterHeader, waitText } from "@/lib/rate-limit";
import { NO_STORE, SIGN_IN } from "../limits";

// Server-only. The steps every picture upload shares: POST /api/portfolio/media (a file) and
// POST /api/portfolio/media/icon (a website's icon).

const HOUR_MS = 60 * 60 * 1000;

/** Signed in, on a plan with portfolios, under the hourly upload count. A finished Response otherwise. */
export async function uploadGate(req: Request): Promise<SessionUser | Response> {
  const crossSite = rejectCrossSite(req);
  if (crossSite) return crossSite;
  const user = await getCurrentUser();
  if (!user) return fail("unauthorized", SIGN_IN, 401);
  if (!canBuildPortfolio(user.plan)) return fail("upgrade_required", MEDIA_MESSAGES.plan, 402);
  const limit = await rateLimit(
    `portfolio:media:user:${user.id}`,
    MEDIA_LIMITS.uploadsPerHour,
    HOUR_MS,
  );
  if (!limit.allowed) {
    return fail(
      "rate_limited",
      `That's a lot of pictures in one hour. Try again in ${waitText(limit.retryAfterMs)}.`,
      429,
      retryAfterHeader(limit.retryAfterMs),
    );
  }
  return user;
}

/** Shrinks, re-encodes and keeps one picture for this account; the finished answer either way. */
export async function keepPicture(
  user: SessionUser,
  bytes: Uint8Array,
  kind: MediaKind,
): Promise<Response> {
  const store = mediaStore();
  if (!store) {
    log.error(
      "portfolio.media_unavailable",
      "No media store: set the Supabase secret key (SETUP.md)",
    );
    return fail("server_error", MEDIA_MESSAGES.unavailable, 503);
  }
  let image;
  try {
    image = await processImage(bytes, kind);
  } catch (error) {
    if (!(error instanceof MediaError)) throw error;
    log.info("portfolio.media_rejected", { reason: error.reason, bytes: bytes.byteLength });
    if (error.reason === "type") return fail("unsupported_type", MEDIA_MESSAGES.type, 415);
    if (error.reason === "too_many_pixels")
      return fail("too_large", MEDIA_MESSAGES.tooManyPixels, 413);
    return fail("bad_request", MEDIA_MESSAGES.unreadable, 400);
  }
  const stored = await storeMedia(user.id, kind, image, store);
  if (stored.status === "full") return fail("limit_reached", MEDIA_MESSAGES.full, 409);
  if (stored.status === "no_user") return fail("unauthorized", SIGN_IN, 401);
  log.info("portfolio.media_stored", {
    kind,
    from: bytes.byteLength,
    to: image.bytes.byteLength,
    source: image.source,
  });
  const body: Omit<MediaUploadResponse, "ok"> = {
    image: stored.image,
    src: mediaUrlFor(store, stored.image.key),
    media: await mediaUsage(user.id),
  };
  return ok(body, { status: 201, headers: NO_STORE });
}
