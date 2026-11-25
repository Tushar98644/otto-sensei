import { rejectCrossSite } from "@/lib/auth/route-guards";
import { burstAllowed } from "@/lib/burst-limit";
import { clientIp, readBody } from "@/lib/http";
import { sentryDsn, sentryEnabled } from "@/lib/observability/config";
import { envelopeTarget } from "@/lib/observability/tunnel";
import { withApiLocale } from "@/lib/api/localize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 256 * 1024;
const PER_MINUTE = 30;
const UPSTREAM_TIMEOUT_MS = 5_000;
// Sentry's own limits go back to the SDK, so it backs off as it would talking to Sentry directly.
const PASSED_HEADERS = ["retry-after", "x-sentry-rate-limits"];

function empty(status: number, headers?: HeadersInit): Response {
  return new Response(null, { status, headers });
}

// The browser SDK's tunnel: error reports reach Sentry through our own address.
export const POST = withApiLocale(async function POST(req: Request): Promise<Response> {
  if (!sentryEnabled("browser")) return empty(404);
  const blocked = rejectCrossSite(req);
  if (blocked) return blocked;
  if (!burstAllowed(`relay:${clientIp(req)}`, PER_MINUTE, 60_000)) {
    return empty(429, { "Retry-After": "60" });
  }
  if (Number(req.headers.get("content-length") ?? "0") > MAX_BYTES) return empty(413);
  const body = await readBody(req, MAX_BYTES);
  if (!body.ok) return empty(body.reason === "too_large" ? 413 : 400);
  const envelope = new TextDecoder().decode(body.bytes);
  const target = envelopeTarget(envelope, sentryDsn("browser"));
  if (!target) return empty(400);
  try {
    const upstream = await fetch(target, {
      method: "POST",
      body: body.bytes,
      headers: { "Content-Type": "application/x-sentry-envelope" },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    const headers = new Headers();
    for (const name of PASSED_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    return empty(upstream.status, headers);
  } catch {
    return empty(502);
  }
});
