import { fail, ok } from "@/lib/api/respond";
import { ApplicationIdSchema } from "@/lib/applications/validation";
import { undoApplication } from "@/lib/extension/applied";
import { extensionPreflight, extensionRoute, fillRequired } from "@/lib/extension/route";
import { HOUR_MS } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

const LIMIT = { name: "applied_undo", limit: 60, windowMs: HOUR_MS };

// Undo on "Added to Applications": only an application added in the last half hour.
export async function DELETE(req: Request, { params }: Context): Promise<Response> {
  return extensionRoute(req, LIMIT, async ({ user }, headers) => {
    const blocked = fillRequired(user, headers);
    if (blocked) return blocked;
    const { id } = await params;
    const removed = ApplicationIdSchema.safeParse(id).success
      ? await undoApplication(user.id, id)
      : false;
    if (!removed) {
      return fail(
        "not_found",
        "That application can't be undone from here any more. Remove it on your board.",
        404,
        headers,
      );
    }
    return ok({ removed: true }, { headers });
  });
}

export function OPTIONS(req: Request): Response {
  return extensionPreflight(req);
}
