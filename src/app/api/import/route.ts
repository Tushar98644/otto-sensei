import { structureResume, type StructureResult } from "@/lib/ai/structure";
import { AIError } from "@/lib/ai/types";
import { trackStructureCall } from "@/lib/analytics/ai";
import { fail, ok } from "@/lib/api/respond";
import type { ImportResponse } from "@/lib/api/types";
import { getCurrentUser } from "@/lib/auth/session";
import { linkedInProfileText } from "@/lib/linkedin/profile-pdf";
import { log } from "@/lib/log";
import type { Extraction } from "@/lib/parse";
import { emptyResume } from "@/lib/resume/schema";
import { claimAiRead } from "./ai-reads";
import { checkUpload } from "./upload";

export const runtime = "nodejs";
// Structuring may call Claude, whose own deadline is 50 seconds.
export const maxDuration = 60;

// Upload → recruiter report plus an editable resume. No account needed, and never refused for the
// plan: past the plan's AI reads the rule-based reader takes over (see ./ai-reads).
export async function POST(req: Request): Promise<Response> {
  try {
    const upload = await checkUpload(req, "import");
    if (upload instanceof Response) return upload;
    const { extraction, report, bytes, startedAt } = upload;
    const user = await getCurrentUser();
    const read = extraction.signals.hasTextLayer
      ? await claimAiRead(user, startedAt)
      : { useAI: false, limited: false, giveBack: async () => {} };

    let structured: StructureResult;
    const structuring = Date.now();
    try {
      structured = await toResume(extraction, startedAt, read.useAI);
    } catch (error) {
      await read.giveBack();
      if (!(error instanceof AIError && error.code === "too_long")) throw error;
      log.info("import.too_long", { bytes, words: extraction.wordCount });
      return fail(
        "parse_failed",
        "That file has more text than a resume usually does. Upload just your resume.",
        422,
      );
    }

    if (read.useAI && !structured.usedAI) await read.giveBack();
    log.info("import.completed", {
      kind: extraction.kind,
      pages: extraction.pageCount,
      words: extraction.wordCount,
      bytes,
      scanned: !extraction.signals.hasTextLayer,
      usedAI: structured.usedAI,
      basicReader: read.limited,
      signedIn: user !== null,
      durationMs: Date.now() - startedAt,
    });
    // A scan never reaches the model (see toResume), so there's no AI call to count.
    if (read.useAI) trackStructureCall(structuring, structured.usedAI);
    const response: Omit<ImportResponse, "ok"> = {
      resume: structured.resume,
      report,
      usedAI: structured.usedAI,
      basicReader: read.limited,
    };
    return ok(response);
  } catch (error) {
    log.error("import.failed", error);
    return fail("server_error", "Something went wrong reading that file. Please try again.", 500);
  }
}

// A scan has no text to structure (nor to pay Claude for), so it starts as a blank resume.
async function toResume(extraction: Extraction, now: number, useAI: boolean): Promise<StructureResult> {
  if (!extraction.signals.hasTextLayer) {
    return { resume: { ...emptyResume(now), source: "import" }, usedAI: false };
  }
  // A LinkedIn "Save to PDF" profile is read column by column, so its sidebar can't take the name's place.
  return structureResume(linkedInProfileText(extraction) ?? withHeaderLines(extraction), now, {
    ai: useAI,
  });
}

// Word templates often put the name and contact details only in the page header, which mammoth
// leaves out of the body text. Header lines go first, where a resume's contact block belongs.
function withHeaderLines({ text, signals }: Extraction): string {
  const missing = signals.headerFooterText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !text.includes(line));
  return missing.length ? `${missing.join("\n")}\n${text}` : text;
}
