import { fail, ok } from "@/lib/api/respond";
import { FeedbackRequestSchema, type EmptyOk } from "@/lib/api/types";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import type { SessionUser } from "@/lib/auth/types";
import { saveFeedback } from "@/lib/feedback/records";
import { clientIp, getDeviceId, readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { rateLimit, retryAfterHeader, waitText } from "@/lib/rate-limit";
import { DAY_MS, HOUR_MS } from "@/lib/time";

export const runtime = "nodejs";

const LIMITS = [
  { key: "device", limit: 10, windowMs: HOUR_MS },
  { key: "ip", limit: 30, windowMs: DAY_MS },
  { key: "user", limit: 20, windowMs: DAY_MS },
] as const;

export async function POST(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const body = await readJson(req, FeedbackRequestSchema);
    if (!body.ok) {
      log.info("feedback.bad_request", { reason: body.message });
      return fail(
        "bad_request",
        "Write a few words, up to 2,000 characters, and send it again.",
        400,
      );
    }
    const user = await signedInOrAnonymous();
    const subjects = { device: await getDeviceId(), ip: clientIp(req), user: user?.id };
    for (const { key, limit, windowMs } of LIMITS) {
      const subject = subjects[key];
      if (!subject) continue;
      const result = await rateLimit(`feedback:${key}:${subject}`, limit, windowMs);
      if (!result.allowed) {
        log.info("feedback.rate_limited", { by: key });
        return fail(
          "rate_limited",
          `That's a lot of notes at once. Try again in ${waitText(result.retryAfterMs)}.`,
          429,
          retryAfterHeader(result.retryAfterMs),
        );
      }
    }
    await saveFeedback(body.data, user?.id ?? null);
    log.info("feedback.saved", { kind: body.data.kind, signedIn: Boolean(user) });
    return ok({} satisfies Omit<EmptyOk, "ok">);
  } catch (error) {
    log.error("feedback.failed", error);
    return fail("server_error", "Couldn't send that. Please try again.", 500);
  }
}

async function signedInOrAnonymous(): Promise<SessionUser | null> {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}
