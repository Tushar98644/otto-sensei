import { isProduction } from "@/lib/env";
import { mediaStore, readLocalMedia } from "@/lib/portfolio/media-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ key: string[] }> };

// GET /api/portfolio/media/dev/<user id>/<id>.webp: development only. Serves pictures kept in
// web/.uploads when there is no Supabase Storage; production pages load them from the bucket.
export async function GET(_req: Request, { params }: Params): Promise<Response> {
  if (isProduction() || mediaStore()?.name !== "local")
    return new Response("Not found", { status: 404 });
  const { key } = await params;
  const bytes = await readLocalMedia(key.join("/"));
  if (!bytes) return new Response("Not found", { status: 404 });
  return new Response(bytes as Uint8Array<ArrayBuffer>, {
    headers: {
      "content-type": "image/webp",
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
