import { fail, ok } from "@/lib/api/respond";
import { readFillProfile } from "@/lib/extension/fill";
import { extensionPreflight, extensionRoute, fillRequired } from "@/lib/extension/route";
import { EXTENSION_LIMITS, type FillProfileResponse } from "@/lib/extension/types";
import { ResumeIdSchema } from "@/lib/extension/validation";
import { HOUR_MS } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMIT = { name: "fill", limit: 240, windowMs: HOUR_MS };

// What Fill with Otto puts into a form: contacts and history from the resume it will send, and the saved answers.
export async function GET(req: Request): Promise<Response> {
  return extensionRoute(req, LIMIT, async ({ user }, headers) => {
    const blocked = fillRequired(user, headers);
    if (blocked) return blocked;
    const params = new URL(req.url).searchParams;
    const picked = ResumeIdSchema.safeParse(params.get("resume"));
    const url = (params.get("url") ?? "").slice(0, EXTENSION_LIMITS.urlChars) || null;
    const fill = await readFillProfile(user, picked.success ? picked.data : null, url);
    if (!fill) {
      return fail(
        "not_found",
        "Otto needs a resume saved to your account to fill this in. Add one in Otto, then try again.",
        404,
        headers,
      );
    }
    const response: Omit<FillProfileResponse, "ok"> = { fill };
    return ok(response, { headers });
  });
}

export function OPTIONS(req: Request): Response {
  return extensionPreflight(req);
}
