import { fail, ok } from "@/lib/api/respond";
import type { CheckResponse } from "@/lib/api/types";
import { log } from "@/lib/log";
import { checkUpload } from "../import/upload";
import { withApiLocale } from "@/lib/api/localize";

export const runtime = "nodejs";

export const POST = withApiLocale(async function POST(req: Request): Promise<Response> {
  try {
    const upload = await checkUpload(req, "check");
    if (upload instanceof Response) return upload;
    const { extraction, report, bytes, startedAt } = upload;
    log.info("check.completed", {
      kind: extraction.kind,
      pages: extraction.pageCount,
      bytes,
      fails: report.counts.fail,
      durationMs: Date.now() - startedAt,
    });
    const response: Omit<CheckResponse, "ok"> = { report };
    return ok(response);
  } catch (error) {
    log.error("check.failed", error);
    return fail("server_error", "Something went wrong checking that file. Please try again.", 500);
  }
});
