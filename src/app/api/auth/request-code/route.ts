import { fail, ok } from "@/lib/api/respond";
import { RequestCodeSchema, type RequestCodeResponse } from "@/lib/api/types";
import { AuthError, requestLoginCode } from "@/lib/auth/codes";
import { rejectNonJson } from "@/lib/auth/route-guards";
import { clientIp, readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { retryAfterHeader } from "@/lib/rate-limit";
import { withApiLocale } from "@/lib/api/localize";

export const runtime = "nodejs";

// Same answer whether or not the address has an account, so sign-ups can't be probed.
export const POST = withApiLocale(async function POST(req: Request): Promise<Response> {
  const notJson = rejectNonJson(req);
  if (notJson) return notJson;
  const body = await readJson(req, RequestCodeSchema);
  if (!body.ok) return fail("bad_request", "Enter a valid email address.", 400);

  try {
    const { devCode } = await requestLoginCode(body.data.email, clientIp(req));
    const response: Omit<RequestCodeResponse, "ok"> = devCode ? { devCode } : {};
    return ok(response);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.code) {
        case "rate_limited": {
          const headers = error.retryAfterMs ? retryAfterHeader(error.retryAfterMs) : undefined;
          return fail("rate_limited", error.message, 429, headers);
        }
        case "invalid_email":
          return fail("bad_request", error.message, 400);
        case "not_configured":
          return fail("auth_unavailable", error.message, 503);
        case "email_send_failed":
          return fail("email_unavailable", error.message, 502);
      }
    }
    log.error("auth.request_code_failed", error);
    return fail("server_error", "We couldn't send your code. Please try again in a minute.", 500);
  }
});
