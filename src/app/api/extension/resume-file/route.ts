import { fail } from "@/lib/api/respond";
import { readResume } from "@/lib/extension/fill";
import { extensionPreflight, extensionRoute, fillRequired } from "@/lib/extension/route";
import { ResumeIdSchema } from "@/lib/extension/validation";
import { log } from "@/lib/log";
import { isPdfPageSize } from "@/lib/pdf/page-size";
import { renderResumePdf } from "@/lib/pdf/render";
import { templateOf } from "@/lib/pdf/templates";
import { suggestedFileName } from "@/lib/resume/ops";
import { HOUR_MS } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const LIMIT = { name: "resume_file", limit: 60, windowMs: HOUR_MS };

// The resume's PDF for a form's file field, drawn by the same renderer and template as a download from Otto.
export async function GET(req: Request): Promise<Response> {
  return extensionRoute(req, LIMIT, async ({ user }, headers) => {
    const blocked = fillRequired(user, headers);
    if (blocked) return blocked;
    const params = new URL(req.url).searchParams;
    const id = ResumeIdSchema.safeParse(params.get("id"));
    const size = params.get("size");
    const resume = id.success ? await readResume(user.id, id.data) : null;
    if (!resume)
      return fail("not_found", "That resume isn't in your account any more.", 404, headers);
    const started = Date.now();
    const blob = await renderResumePdf(resume, {
      pageSize: isPdfPageSize(size) ? size : "LETTER",
      template: templateOf(resume),
    });
    log.info("extension.resume_file", { ms: Date.now() - started, bytes: blob.size });
    const name = suggestedFileName(resume);
    return new Response(blob, {
      headers: {
        ...headers,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${name.replace(/[^\w.-]+/g, "-")}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      },
    });
  });
}

export function OPTIONS(req: Request): Response {
  return extensionPreflight(req);
}
