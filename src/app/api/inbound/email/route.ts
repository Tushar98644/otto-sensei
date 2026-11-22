import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { handleOfRecipient } from "@/lib/inbound/address";
import { receiveEmail } from "@/lib/inbound/apply";
import { addressShape, inboundSigningSecret } from "@/lib/inbound/config";
import { recipientOf } from "@/lib/inbound/handles";
import { verifyInbound } from "@/lib/inbound/signature";
import { INBOUND_LIMITS } from "@/lib/inbound/types";
import { InboundEmailSchema } from "@/lib/inbound/validation";
import { readBody } from "@/lib/http";
import { log } from "@/lib/log";
import { rateLimit, retryAfterHeader } from "@/lib/rate-limit";
import { DAY_MS, HOUR_MS } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Only the Cloudflare Worker calls this: the signature is the auth, and no cookie or session is read.
export async function POST(req: Request): Promise<Response> {
  const secret = inboundSigningSecret();
  const shape = addressShape();
  if (!secret || !shape) return fail("server_error", "Email tracking isn't set up.", 503, NO_STORE);
  const read = await readBody(req, INBOUND_LIMITS.bodyBytes);
  if (!read.ok) {
    return read.reason === "too_large"
      ? fail("too_large", "That email is too large.", 413, NO_STORE)
      : fail("bad_request", "Couldn't read the request.", 400, NO_STORE);
  }
  const raw = new TextDecoder().decode(read.bytes);
  const check = verifyInbound(raw, req.headers, secret);
  if (check !== "valid") {
    log.warn("inbound.signature_refused", { check });
    return fail("unauthorized", "Bad signature.", 401, NO_STORE);
  }
  try {
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return fail("bad_request", "Not JSON.", 400, NO_STORE);
    }
    const parsed = InboundEmailSchema.safeParse(json);
    if (!parsed.success) return fail("bad_request", "Not an email.", 400, NO_STORE);
    const mail = parsed.data;
    const handle = handleOfRecipient(mail.to, shape);
    const recipient = handle ? await recipientOf(handle) : null;
    if (!handle || !recipient) return fail("not_found", "No such address.", 404, NO_STORE);
    for (const [limit, window] of [
      [INBOUND_LIMITS.perHour, HOUR_MS],
      [INBOUND_LIMITS.perDay, DAY_MS],
    ] as const) {
      const allowed = await rateLimit(`inbound:${window}:${recipient.userId}`, limit, window);
      if (!allowed.allowed) {
        log.warn("inbound.rate_limited", { window });
        return fail("rate_limited", "Too many emails.", 429, {
          ...NO_STORE,
          ...retryAfterHeader(allowed.retryAfterMs),
        });
      }
    }
    const result = await receiveEmail(recipient, {
      ...mail,
      text: mail.text.slice(0, INBOUND_LIMITS.text),
    });
    log.info("inbound.received", { result });
    return ok({ result }, { headers: NO_STORE });
  } catch (error) {
    log.error("inbound.failed", error);
    return fail("server_error", "Couldn't read that email.", 500, NO_STORE);
  }
}
