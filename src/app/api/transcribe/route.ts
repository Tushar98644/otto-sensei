import type { PlanId } from "@/config/plans";
import {
  audioFormat,
  transcribeAudio,
  type AudioFormat,
  type Transcript,
} from "@/lib/ai/transcribe";
import { AIError, type AIErrorCode } from "@/lib/ai/types";
import { fail, ok } from "@/lib/api/respond";
import type { ApiErrorCode, TranscribeResponse } from "@/lib/api/types";
import { rejectCrossSite } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { aiEnabled } from "@/lib/env";
import { isContentLang, type ContentLang } from "@/lib/i18n/languages";
import { readBody } from "@/lib/http";
import { log } from "@/lib/log";
import { giveBackRateLimit, rateLimit, retryAfterHeader, waitLong } from "@/lib/rate-limit";
import { DAY_MS } from "@/lib/time";
import { TRANSCRIBE_LIMITS } from "./limits";
import { withApiLocale } from "@/lib/api/localize";

export const runtime = "nodejs";
export const maxDuration = 60;

// Room for the multipart boundary and part headers around a clip right at the size limit.
const MAX_BODY_BYTES = TRANSCRIBE_LIMITS.maxBytes + 64 * 1024;

const SIGN_IN = "Sign in to talk to Otto.";
const FAILED = "Couldn't turn that into text. Try again, or type instead.";
const NOTHING_HEARD = "Otto didn't catch anything. Try again a little closer to the mic.";
const NO_AUDIO = "The recording didn't come through. Try again.";
const TOO_LONG = "That recording is over 2 minutes. Keep it shorter.";
const UNREADABLE = "Otto can't read that recording. Try again, or type instead.";

const AI_FAILURES: Record<AIErrorCode, { code: ApiErrorCode; status: number; message: string }> = {
  too_long: { code: "too_large", status: 413, message: TOO_LONG },
  refused: { code: "ai_refused", status: 422, message: FAILED },
  rate_limited: { code: "ai_unavailable", status: 502, message: FAILED },
  unavailable: { code: "ai_unavailable", status: 502, message: FAILED },
  invalid_output: { code: "ai_unavailable", status: 502, message: FAILED },
};

// Outages and limits are given back freely; refusals and rejected audio only 3 times a day.
const FREE_GIVE_BACKS: ReadonlySet<AIErrorCode> = new Set<AIErrorCode>([
  "unavailable",
  "rate_limited",
  "too_long",
]);
const CAPPED_GIVE_BACKS_PER_DAY = 3;

type Clip = { bytes: Uint8Array; format: AudioFormat; seconds: number; language?: ContentLang };

export const POST = withApiLocale(async function POST(req: Request): Promise<Response> {
  try {
    // Multipart needs no preflight, so another site could otherwise spend our speech-to-text.
    const crossSite = rejectCrossSite(req);
    if (crossSite) return crossSite;
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401);
    if (!aiEnabled()) return fail("ai_unavailable", FAILED, 502);
    const tooFast = await limitBurst(user.id);
    if (tooFast) return tooFast;

    const clip = await readClip(req);
    if (clip instanceof Response) return clip;
    // Only a clip that passed the checks counts toward the day.
    const countedAt = Date.now();
    const usedUp = await limitDaily(user.id, user.plan, countedAt);
    if (usedUp) return usedUp;

    const startedAt = Date.now();
    let transcript: Transcript;
    try {
      transcript = clip.language
        ? await transcribeAudio(clip.bytes, clip.format, { language: clip.language })
        : await transcribeAudio(clip.bytes, clip.format);
    } catch (error) {
      if (!(error instanceof AIError)) throw error;
      const givenBack = await giveClipBack(user.id, error.code, countedAt);
      log.warn("transcribe.ai_failed", { code: error.code, givenBack });
      const failure = AI_FAILURES[error.code];
      return fail(failure.code, failure.message, failure.status);
    }
    const { text, seconds } = transcript;
    log.info("transcribe.completed", {
      bytes: clip.bytes.byteLength,
      format: clip.format,
      clipSeconds: clip.seconds,
      billedSeconds: seconds,
      durationMs: Date.now() - startedAt,
      empty: text === "",
    });
    if (!text) return fail("no_speech", NOTHING_HEARD, 422);
    const response: Omit<TranscribeResponse, "ok"> = { text };
    return ok(response);
  } catch (error) {
    log.error("transcribe.failed", error);
    return fail("server_error", "Something went wrong. Please try again.", 500);
  }
});

const dayKey = (userId: string) => `transcribe:day:user:${userId}`;

async function limitBurst(userId: string): Promise<Response | null> {
  const { burst } = TRANSCRIBE_LIMITS;
  const short = await rateLimit(`transcribe:user:${userId}`, burst.calls, burst.windowMs);
  if (short.allowed) return null;
  log.warn("transcribe.burst_limited");
  return tooMany(
    `That's a lot of voice typing at once. Try again in ${waitLong(short.retryAfterMs)}.`,
    short.retryAfterMs,
  );
}

async function limitDaily(userId: string, plan: PlanId, now: number): Promise<Response | null> {
  const { daily } = TRANSCRIBE_LIMITS;
  const perDay = daily.calls[plan];
  const day = await rateLimit(dayKey(userId), perDay, daily.windowMs, now);
  if (day.allowed) return null;
  log.warn("transcribe.daily_limited", { plan });
  const more = plan === "free" ? ` Pro has ${daily.calls.pro} a day.` : "";
  return tooMany(
    `You've used today's ${perDay} voice clips. Try again in ${waitLong(day.retryAfterMs)}.${more}`,
    day.retryAfterMs,
  );
}

async function giveClipBack(
  userId: string,
  code: AIErrorCode,
  countedAt: number,
): Promise<boolean> {
  try {
    if (!FREE_GIVE_BACKS.has(code)) {
      const key = `transcribe:give_back:user:${userId}`;
      const cap = await rateLimit(key, CAPPED_GIVE_BACKS_PER_DAY, DAY_MS, countedAt);
      if (!cap.allowed) return false;
    }
    await giveBackRateLimit(dayKey(userId), TRANSCRIBE_LIMITS.daily.windowMs, countedAt);
    return true;
  } catch (error) {
    log.warn("transcribe.give_back_failed", {}, error);
    return false;
  }
}

function tooMany(message: string, retryAfterMs: number): Response {
  return fail("rate_limited", message, 429, retryAfterHeader(retryAfterMs));
}

async function readClip(req: Request): Promise<Clip | Response> {
  const type = req.headers.get("content-type") ?? "";
  if (!/^multipart\/form-data\b/i.test(type)) return fail("bad_request", NO_AUDIO, 400);
  if (Number(req.headers.get("content-length")) > MAX_BODY_BYTES) return tooLarge();

  const body = await readBody(req, MAX_BODY_BYTES);
  if (!body.ok)
    return body.reason === "too_large" ? tooLarge() : fail("bad_request", NO_AUDIO, 400);

  let form: FormData;
  try {
    form = await new Response(body.bytes, { headers: { "content-type": type } }).formData();
  } catch {
    return fail("bad_request", NO_AUDIO, 400);
  }
  const file = form.get("file");
  if (file === null || typeof file === "string" || file.size === 0)
    return fail("bad_request", NO_AUDIO, 400);
  if (file.size > TRANSCRIBE_LIMITS.maxBytes) return tooLarge();
  const seconds = Number(form.get("seconds"));
  if (!(seconds > 0)) return fail("bad_request", NO_AUDIO, 400);
  if (seconds > TRANSCRIBE_LIMITS.maxSeconds) return fail("too_large", TOO_LONG, 413);
  const format = audioFormat(file.type, file.name);
  if (!format) return fail("unsupported_type", UNREADABLE, 415);
  const bytes = new Uint8Array(await file.arrayBuffer());
  // An optional hint the page sends when it knows what language the person speaks.
  const language = form.get("language");
  return isContentLang(language)
    ? { bytes, format, seconds, language }
    : { bytes, format, seconds };
}

function tooLarge(): Response {
  return fail("too_large", TOO_LONG, 413);
}
