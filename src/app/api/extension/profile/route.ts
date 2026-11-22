import { ok } from "@/lib/api/respond";
import { readExtensionProfile } from "@/lib/extension/profile";
import { extensionPreflight, extensionRoute } from "@/lib/extension/route";
import type { ExtensionProfileBody } from "@/lib/extension/types";
import { HOUR_MS } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMIT = { name: "profile", limit: 240, windowMs: HOUR_MS };
const VERSION = /^[A-Za-z0-9_-]{22}$/;

// What the badge matches against: resume lines without contacts, the work profile and where they look.
export async function GET(req: Request): Promise<Response> {
  return extensionRoute(req, LIMIT, async ({ user }, headers) => {
    const known = new URL(req.url).searchParams.get("known");
    const read = await readExtensionProfile(user, known && VERSION.test(known) ? known : null);
    const response: ExtensionProfileBody = read.unchanged
      ? { unchanged: true, version: read.version }
      : { unchanged: false, profile: read.profile };
    return ok(response, { headers });
  });
}

export function OPTIONS(req: Request): Response {
  return extensionPreflight(req);
}
