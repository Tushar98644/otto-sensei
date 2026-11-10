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
import { weakReadSigns, type ReadLayout, type WeakReadSign } from "@/lib/resume/read-quality";
import { claimAiRead, type AiRead } from "./ai-reads";
import { checkUpload } from "./upload";

export const runtime = "nodejs";
// Structuring may call Claude, whose own deadline is 50 seconds.
export const maxDuration = 60;

// Upload → recruiter report plus an editable resume. No account needed, and never refused for the
// plan: past the plan's AI reads the rule-based reader takes over (see ./ai-reads). Every file is
// read by rules first, which is free and instant; the AI reader (and an AI read from the plan)
// only takes over when that read looks weak (lib/resume/read-quality), or when the person asks
// for it with ?reader=ai ("Let Otto re-read it").
export async function POST(req: Request): Promise<Response> {
  try {
    const askedForAI = new URL(req.url).searchParams.get("reader") === "ai";
    const upload = await checkUpload(req, "import");
    if (upload instanceof Response) return upload;
    const { extraction, report, bytes, startedAt } = upload;
    const user = await getCurrentUser();
    const source = readableText(extraction);

    let read: AiRead = NO_AI_READ;
    let weakSigns: WeakReadSign[] = [];
    let structured: StructureResult;
    const structuring = Date.now();
    try {
      if (!source) {
        // A scan has no text to structure (nor to pay the AI for), so it starts as a blank resume.
        structured = { resume: { ...emptyResume(startedAt), source: "import" }, usedAI: false };
      } else {
        const rules = await structureResume(source.text, startedAt, { ai: false });
        weakSigns = weakReadSigns(source.text, rules.resume, source.layout);
        if (askedForAI || weakSigns.length > 0) read = await claimAiRead(user, startedAt);
        structured = read.useAI
          ? await structureResume(source.text, startedAt, { ai: true })
          : rules;
      }
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
    const readWell = source !== null && weakSigns.length === 0 && !askedForAI;
    log.info("import.completed", {
      kind: extraction.kind,
      pages: extraction.pageCount,
      words: extraction.wordCount,
      bytes,
      scanned: !source,
      usedAI: structured.usedAI,
      basicReader: read.limited,
      readWell,
      weakSigns: weakSigns.join(","),
      askedForAI,
      signedIn: user !== null,
      durationMs: Date.now() - startedAt,
    });
    // Only files that went to the AI reader count: a scan or a good rules read never reaches it.
    if (read.useAI) trackStructureCall(structuring, structured.usedAI);
    const response: Omit<ImportResponse, "ok"> = {
      resume: structured.resume,
      report,
      usedAI: structured.usedAI,
      basicReader: read.limited,
      readWell,
    };
    return ok(response);
  } catch (error) {
    log.error("import.failed", error);
    return fail("server_error", "Something went wrong reading that file. Please try again.", 500);
  }
}

const NO_AI_READ: AiRead = { useAI: false, limited: false, giveBack: async () => {} };

type ReadableText = { text: string; layout: ReadLayout };

// The text to structure, or null for a scan. A LinkedIn "Save to PDF" profile is rebuilt column by
// column, so its sidebar can't take the name's place and its columns aren't mixed.
function readableText(extraction: Extraction): ReadableText | null {
  if (!extraction.signals.hasTextLayer) return null;
  const { kind, signals } = extraction;
  const profile = linkedInProfileText(extraction);
  return {
    text: profile ?? withHeaderLines(extraction),
    layout: {
      mixedColumns: kind === "pdf" && signals.columnLayout && profile === null,
      textBoxes: kind === "docx" && signals.textBoxCount > 0,
    },
  };
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
