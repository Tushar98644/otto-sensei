import { fail, NO_STORE } from "@/lib/api/respond";
import type { SessionUser } from "@/lib/auth/types";
import { trialHeadline } from "@/lib/billing/prices";
import { env, isProduction } from "@/lib/env";
import { log } from "@/lib/log";
import { rateLimit, retryAfterHeader, waitText } from "@/lib/rate-limit";
import { extensionAccess } from "./plan";
import { bearerToken, verifyExtensionToken, type TokenAuth } from "./tokens";

// The unpacked dev build's id, fixed by the public key in extension/manifest.ts.
export const DEV_EXTENSION_ID = "noofbknlfdjpiihgeghjeoalkjlfafeb";
// Otto for Chrome's Chrome Web Store id (more can come from OTTO_EXTENSION_IDS).
export const STORE_EXTENSION_IDS: readonly string[] = ["mbndcajinpcaohjpphabgkmadkhccoeo"];

const EXTENSION_ID = /^[a-p]{32}$/;

export function allowedExtensionOrigins(): ReadonlySet<string> {
  const ids = new Set<string>(STORE_EXTENSION_IDS);
  for (const raw of (env().OTTO_EXTENSION_IDS ?? "").split(",")) {
    const id = raw.trim();
    if (EXTENSION_ID.test(id)) ids.add(id);
  }
  if (!isProduction()) ids.add(DEV_EXTENSION_ID);
  return new Set([...ids].map((id) => `chrome-extension://${id}`));
}

function allowed(origin: string | null): origin is string {
  return origin !== null && allowedExtensionOrigins().has(origin);
}

export function extensionHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = { ...NO_STORE, Vary: "Origin" };
  if (!allowed(origin)) return headers;
  return {
    ...headers,
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Max-Age": "600",
  };
}

export function extensionPreflight(req: Request): Response {
  if (!allowed(req.headers.get("origin"))) {
    return new Response(null, { status: 403, headers: { Vary: "Origin" } });
  }
  return new Response(null, { status: 204, headers: extensionHeaders(req) });
}

export type ExtensionLimit = { name: string; limit: number; windowMs: number };

export const SIGNED_OUT = "Connect Otto for Chrome to your account again.";

// Bearer only, never cookies: a page the person visits can't borrow their session here.
export async function extensionRoute(
  req: Request,
  limit: ExtensionLimit,
  handler: (auth: TokenAuth, headers: Record<string, string>) => Promise<Response>,
): Promise<Response> {
  const headers = extensionHeaders(req);
  const origin = req.headers.get("origin");
  // The extension sends its own origin; any web page's is refused before the token is looked at.
  if (origin !== null && !allowed(origin)) {
    return fail(
      "forbidden",
      "That request came from another website, so it wasn't allowed.",
      403,
      headers,
    );
  }
  const token = bearerToken(req);
  if (!token) return fail("unauthorized", SIGNED_OUT, 401, headers);
  try {
    const auth = await verifyExtensionToken(token);
    if (!auth) return fail("unauthorized", SIGNED_OUT, 401, headers);
    const rate = await rateLimit(
      `extension:${limit.name}:${auth.user.id}`,
      limit.limit,
      limit.windowMs,
    );
    if (!rate.allowed) {
      return fail(
        "rate_limited",
        `That's a lot at once. Try again in ${waitText(rate.retryAfterMs)}.`,
        429,
        { ...headers, ...retryAfterHeader(rate.retryAfterMs) },
      );
    }
    return await handler(auth, headers);
  } catch (error) {
    log.error(`extension.${limit.name}_failed`, error);
    return fail(
      "server_error",
      "Something went wrong on our side. Please try again.",
      500,
      headers,
    );
  }
}

// Fill with Otto and its drafts follow the plan rule in plan.ts: Pro and Max.
export function fillRequired(user: SessionUser, headers: Record<string, string>): Response | null {
  if (extensionAccess(user.plan).fill) return null;
  log.info("extension.fill_upgrade_required", { plan: user.plan });
  return fail(
    "upgrade_required",
    `Fill with Otto comes with Pro. ${trialHeadline()}.`,
    402,
    headers,
  );
}

// A response built elsewhere (the metered answer flow), with the extension's CORS headers added.
export function withExtensionHeaders(res: Response, headers: Record<string, string>): Response {
  const merged = new Headers(res.headers);
  for (const [name, value] of Object.entries(headers)) merged.set(name, value);
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: merged,
  });
}
