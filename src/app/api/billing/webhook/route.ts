import { fail, ok } from "@/lib/api/respond";
import type { ApiErrorCode } from "@/lib/api/types";
import { handleWebhook } from "@/lib/billing";
import { log } from "@/lib/log";

export const runtime = "nodejs";

// Creem calls this; the signature is the auth. Creem only reads the status code.
export async function POST(req: Request) {
  let rawBody: string;
  try {
    // The signature covers the exact bytes Creem sent, so read them before anything parses the body.
    rawBody = await req.text();
  } catch {
    return fail("bad_request", "unreadable_body", 400);
  }
  try {
    const { status, message } = await handleWebhook(rawBody, req.headers);
    return status < 400 ? ok({ message }, { status }) : fail(errorCode(status), message, status);
  } catch (error) {
    log.error("billing.webhook_crashed", error);
    return fail("server_error", "server_error", 500);
  }
}

function errorCode(status: number): ApiErrorCode {
  if (status === 401) return "unauthorized";
  if (status === 413) return "too_large";
  if (status === 503) return "billing_unavailable";
  return status < 500 ? "bad_request" : "server_error";
}
