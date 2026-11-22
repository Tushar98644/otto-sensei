import { fail } from "@/lib/api/respond";
import { rejectNonJson } from "@/lib/auth/route-guards";
import { readResume } from "@/lib/extension/fill";
import {
  extensionPreflight,
  extensionRoute,
  fillRequired,
  withExtensionHeaders,
} from "@/lib/extension/route";
import { ExtensionAnswerSchema } from "@/lib/extension/validation";
import { REQUEST_ID_HEADER } from "@/lib/api/request-id";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { HOUR_MS } from "@/lib/time";
import { ANSWER_ROUTE } from "../../answer/metered";
import { runMetered } from "../../fix/metered";

export const runtime = "nodejs";
export const maxDuration = 60;

const LIMIT = { name: "answer", limit: 60, windowMs: HOUR_MS };

// Draft with Otto: the app's own answer flow, run for the token's account with the same plan rule, allowance and limits.
export async function POST(req: Request): Promise<Response> {
  return extensionRoute(req, LIMIT, async ({ user }, headers) => {
    const blocked = fillRequired(user, headers) ?? rejectNonJson(req);
    if (blocked) return blocked;
    const body = await readJson(req, ExtensionAnswerSchema);
    if (!body.ok) {
      log.info("extension.answer_bad_request", { reason: body.message });
      return fail("bad_request", ANSWER_ROUTE.copy.invalid, 400, headers);
    }
    const resume = await readResume(user.id, body.data.resumeId);
    if (!resume)
      return fail("not_found", "That resume isn't in your account any more.", 404, headers);
    // The id rides in the body, so a retry is replayed rather than paid for again.
    const { requestId } = body.data;
    const inner = new Request(req.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(requestId ? { [REQUEST_ID_HEADER]: requestId } : {}),
      },
      body: JSON.stringify({ resume, job: body.data.job, question: body.data.question }),
    });
    return withExtensionHeaders(await runMetered(inner, ANSWER_ROUTE, async () => user), headers);
  });
}

export function OPTIONS(req: Request): Response {
  return extensionPreflight(req);
}
