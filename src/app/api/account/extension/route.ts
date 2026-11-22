import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import {
  extensionConnection,
  issueExtensionToken,
  revokeExtensionTokens,
} from "@/lib/extension/tokens";
import type { ExtensionConnectionResponse, ExtensionConnectResponse } from "@/lib/extension/types";
import { log } from "@/lib/log";
import { rateLimit, retryAfterHeader, waitText } from "@/lib/rate-limit";
import { HOUR_MS } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGN_IN = "Sign in to connect Otto for Chrome.";
const CONNECTS_PER_HOUR = 20;

export async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const response: Omit<ExtensionConnectionResponse, "ok"> = {
      connection: await extensionConnection(user.id),
    };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("extension.connection_failed", error);
    return fail("server_error", "Couldn't check the extension. Please try again.", 500, NO_STORE);
  }
}

// The connect page asks for a token with the session cookie; it reaches only this site's own scripts.
export async function POST(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const rate = await rateLimit(`extension:connect:${user.id}`, CONNECTS_PER_HOUR, HOUR_MS);
    if (!rate.allowed) {
      return fail(
        "rate_limited",
        `Too many tries. Try again in ${waitText(rate.retryAfterMs)}.`,
        429,
        { ...NO_STORE, ...retryAfterHeader(rate.retryAfterMs) },
      );
    }
    const issued = await issueExtensionToken(user.id);
    if (!issued) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    log.info("extension.connected", {});
    const response: Omit<ExtensionConnectResponse, "ok"> = issued;
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("extension.connect_failed", error);
    return fail("server_error", "Couldn't connect the extension. Please try again.", 500, NO_STORE);
  }
}

// Disconnect from the Account page: every browser's token goes at once.
export async function DELETE(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const revoked = await revokeExtensionTokens(user.id);
    log.info("extension.disconnected", { revoked });
    return ok({ revoked }, { headers: NO_STORE });
  } catch (error) {
    log.error("extension.disconnect_failed", error);
    return fail(
      "server_error",
      "Couldn't disconnect the extension. Please try again.",
      500,
      NO_STORE,
    );
  }
}
