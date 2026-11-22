import { fail, ok } from "@/lib/api/respond";
import { rejectNonJson } from "@/lib/auth/route-guards";
import { readWorkProfile } from "@/lib/eligibility/records";
import { readApplyAnswers, saveApplyAnswers } from "@/lib/extension/answer-records";
import { withWorkProfile, type ApplyAnswers } from "@/lib/extension/answers";
import {
  extensionPreflight,
  extensionRoute,
  fillRequired,
  SIGNED_OUT,
} from "@/lib/extension/route";
import type { ApplyAnswersResponse } from "@/lib/extension/types";
import { ApplyAnswersPatchSchema } from "@/lib/extension/validation";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { HOUR_MS } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const READ = { name: "answers", limit: 240, windowMs: HOUR_MS };
const WRITE = { name: "answers_save", limit: 120, windowMs: HOUR_MS };

async function respond(
  userId: string,
  saved: ApplyAnswers,
  headers: Record<string, string>,
): Promise<Response> {
  const work = await readWorkProfile(userId);
  const response: Omit<ApplyAnswersResponse, "ok"> = {
    answers: withWorkProfile(saved, work.updatedAt === null ? null : work.profile),
    saved,
  };
  return ok(response, { headers });
}

// The answers saved once for application forms, synced across browsers.
export async function GET(req: Request): Promise<Response> {
  return extensionRoute(req, READ, async ({ user }, headers) => {
    const blocked = fillRequired(user, headers);
    if (blocked) return blocked;
    return respond(user.id, await readApplyAnswers(user.id), headers);
  });
}

// A partial update: only the answers sent change, and a question with an empty answer is forgotten.
export async function POST(req: Request): Promise<Response> {
  return extensionRoute(req, WRITE, async ({ user }, headers) => {
    const blocked = fillRequired(user, headers) ?? rejectNonJson(req);
    if (blocked) return blocked;
    const body = await readJson(req, ApplyAnswersPatchSchema);
    if (!body.ok) {
      log.info("extension.answers_bad_request", { reason: body.message });
      return fail(
        "bad_request",
        "Otto couldn't read those answers. Check them and try again.",
        400,
        headers,
      );
    }
    const saved = await saveApplyAnswers(user.id, body.data);
    if (!saved) return fail("unauthorized", SIGNED_OUT, 401, headers);
    return respond(user.id, saved, headers);
  });
}

export function OPTIONS(req: Request): Response {
  return extensionPreflight(req);
}
