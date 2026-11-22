import { ok } from "@/lib/api/respond";
import { extensionPreflight, extensionRoute } from "@/lib/extension/route";
import { revokeExtensionToken } from "@/lib/extension/tokens";
import { HOUR_MS } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMIT = { name: "disconnect", limit: 30, windowMs: HOUR_MS };

// Disconnect from inside the extension: only this browser's token goes.
export async function DELETE(req: Request): Promise<Response> {
  return extensionRoute(req, LIMIT, async ({ user, tokenId }, headers) => {
    await revokeExtensionToken(user.id, tokenId);
    return ok({ disconnected: true }, { headers });
  });
}

export function OPTIONS(req: Request): Response {
  return extensionPreflight(req);
}
