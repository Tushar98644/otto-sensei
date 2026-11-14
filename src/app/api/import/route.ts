import { structureResume, type StructureResult } from "@/lib/ai/structure";
import { AIError } from "@/lib/ai/types";
import { trackStructureCall } from "@/lib/analytics/ai";
import { fail, ok } from "@/lib/api/respond";
import type { ImportResponse } from "@/lib/api/types";
import { getCurrentUser, hasSessionCookie } from "@/lib/auth/session";
import { linkedInProfileText } from "@/lib/linkedin/profile-pdf";
import { log } from "@/lib/log";
import type { Extraction } from "@/lib/parse";
import { withLinkTargets } from "@/lib/resume/link-targets";
import { emptyResume } from "@/lib/resume/schema";
import { weakReadSigns, type ReadLayout, type WeakReadSign } from "@/lib/resume/read-quality";
import { claimAiRead, NO_AI_READ, type AiRead } from "./ai-reads";
import { checkUpload } from "./upload";

export const runtime = "nodejs";
// The AI read must finish 55 s after the request started; the rest is room for saving and refunds.
export const maxDuration = 60;
const AI_READ_BY_MS = 55_000;

export async function POST(req: Request): Promise<Response> {
  try {
    const askedForAI = new URL(req.url).searchParams.get("reader") === "ai";
    const upload = await checkUpload(req, "import");
    if (upload instanceof Response) return upload;
    const { extraction, report, bytes, startedAt } = upload;
    // Only an AI read needs the account, so a good rules read never waits on Supabase.
    let user = upload.user;
    const source = readableText(extraction);

    let read: AiRead = NO_AI_READ;
    let weakSigns: WeakReadSign[] = [];
    let structured: StructureResult;
    const structuring = Date.now();
    try {
      if (!source) {
        structured = { resume: { ...emptyResume(startedAt), source: "import" }, usedAI: false };
      } else {
        const rules = await structureResume(source.text, startedAt, { ai: false });
        weakSigns = weakReadSigns(source.text, rules.resume, source.layout);
        if (askedForAI || weakSigns.length > 0) {
          if (user === undefined) user = await getCurrentUser();
          read = await claimAiRead(user, startedAt);
        }
        structured = read.useAI
          ? await read.spend(() =>
              structureResume(source.text, startedAt, {
                ai: true,
                deadline: startedAt + AI_READ_BY_MS,
              }),
            )
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
    const signedIn = user === undefined ? await hasSessionCookie() : user !== null;
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
      signedIn,
      // When false, signedIn only means a session cookie came with the upload.
      sessionChecked: user !== undefined,
      durationMs: Date.now() - startedAt,
    });
    if (read.useAI) trackStructureCall(structuring, structured.usedAI);
    const response: Omit<ImportResponse, "ok"> = {
      resume: withLinkTargets(structured.resume, extraction.links ?? []),
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

type ReadableText = { text: string; layout: ReadLayout };

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

// mammoth drops page headers from the body text; Word resumes often keep contacts there.
function withHeaderLines({ text, signals }: Extraction): string {
  const missing = signals.headerFooterText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !text.includes(line));
  return missing.length ? `${missing.join("\n")}\n${text}` : text;
}
