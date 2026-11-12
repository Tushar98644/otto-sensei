import { audioFormat, transcribeAudio, type AudioFormat } from "@/lib/ai/transcribe";
import { AIError, type AIErrorCode } from "@/lib/ai/types";
import { fail, ok } from "@/lib/api/respond";
import type { ApiErrorCode, TranscribeResponse } from "@/lib/api/types";
import { rejectCrossSite } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { aiEnabled } from "@/lib/env";
import { readBody } from "@/lib/http";
import { log } from "@/lib/log";
import { rateLimit, retryAfterHeader, waitLong } from "@/lib/rate-limit";
import { TRANSCRIBE_LIMITS } from "./limits";

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

type Clip = { bytes: Uint8Array; format: AudioFormat; seconds: number };

export async function POST(req: Request): Promise<Response> {
  try {
    // Multipart needs no preflight, so another site could otherwise spend our speech-to-text.
    const crossSite = rejectCrossSite(req);
    if (crossSite) return crossSite;
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401);
    if (!aiEnabled()) return fail("ai_unavailable", FAILED, 502);
    const limited = await limitTranscribes(user.id);
    if (limited) return limited;

    const clip = await readClip(req);
    if (clip instanceof Response) return clip;

    const startedAt = Date.now();
    const { text, seconds } = await transcribeAudio(clip.bytes, clip.format);
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
    if (error instanceof AIError) {
      log.warn("transcribe.ai_failed", { code: error.code });
      const failure = AI_FAILURES[error.code];
      return fail(failure.code, failure.message, failure.status);
    }
    log.error("transcribe.failed", error);
    return fail("server_error", "Something went wrong. Please try again.", 500);
  }
}

async function limitTranscribes(userId: string): Promise<Response | null> {
  const { burst, daily } = TRANSCRIBE_LIMITS;
  const short = await rateLimit(`transcribe:user:${userId}`, burst.calls, burst.windowMs);
  if (!short.allowed) {
    log.warn("transcribe.burst_limited");
    return tooMany(
      `That's a lot of voice typing at once. Try again in ${waitLong(short.retryAfterMs)}.`,
      short.retryAfterMs,
    );
  }
  const day = await rateLimit(`transcribe:day:user:${userId}`, daily.calls, daily.windowMs);
  if (!day.allowed) {
    log.warn("transcribe.daily_limited");
    return tooMany(
      `You've used voice typing a lot today. Try again in ${waitLong(day.retryAfterMs)}.`,
      day.retryAfterMs,
    );
  }
  return null;
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
  return { bytes: new Uint8Array(await file.arrayBuffer()), format, seconds };
}

function tooLarge(): Response {
  return fail("too_large", TOO_LONG, 413);
}
