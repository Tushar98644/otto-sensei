import { UPLOAD_LIMITS } from "@/config/plans";
import { fail } from "@/lib/api/respond";
import type { ApiErrorCode } from "@/lib/api/types";
import { rejectCrossSite } from "@/lib/auth/route-guards";
import { runRecruiterChecks } from "@/lib/checks/recruiter";
import type { RecruiterReport } from "@/lib/checks/types";
import { log } from "@/lib/log";
import { extractDocument, ParseError, type Extraction } from "@/lib/parse";
import type { ParseErrorCode } from "@/lib/parse/types";
import { noteReferralCheck } from "@/lib/referrals/cookie";
import { limitUploads, type UploadKind } from "./upload-limits";

// Server-only. The shared first half of POST /api/import and POST /api/check: read one resume
// file from multipart form data, apply the anonymous limits, extract it and run the recruiter
// checks. Each route then adds its own step.

const MAX_MB = Math.round(UPLOAD_LIMITS.maxBytes / (1024 * 1024));
// Room for the multipart boundary and part headers around a file right at the size limit.
const MAX_BODY_BYTES = UPLOAD_LIMITS.maxBytes + 64 * 1024;

const NO_FILE = "Choose a PDF or Word (.docx) file to upload.";
const TOO_LARGE = `That file is over ${MAX_MB} MB. Try a smaller copy.`;

// ParseError messages are written for people and name the file type (PDF, .doc, Word), so most go
// out as they are. `message` replaces one where the route has better copy for every file type.
const PARSE_FAILURES: Record<ParseErrorCode, { code: ApiErrorCode; status: number; message?: string }> = {
  unsupported_type: { code: "unsupported_type", status: 415 },
  too_large: { code: "too_large", status: 413 },
  too_many_pages: {
    code: "parse_failed",
    status: 422,
    message: `That file has more than ${UPLOAD_LIMITS.maxPages} pages. Most resumes are 1-2 pages.`,
  },
  encrypted: { code: "parse_failed", status: 422 },
  empty_file: { code: "parse_failed", status: 422 },
  corrupt: { code: "parse_failed", status: 422 },
};

export type CheckedUpload = {
  extraction: Extraction;
  report: RecruiterReport;
  bytes: number;
  startedAt: number;
};

/**
 * Reads, limits, extracts and checks one uploaded file. Anything the person has to change comes
 * back as a finished error Response; unexpected failures throw. A missing or oversized file is
 * turned away before the rate limits, so it doesn't use up the day's allowance.
 */
export async function checkUpload(req: Request, kind: UploadKind): Promise<CheckedUpload | Response> {
  const startedAt = Date.now();
  // Multipart needs no preflight, so another site's page could otherwise spend our parsing and AI
  // on its visitors' behalf, with no device cookie to limit it.
  const crossSite = rejectCrossSite(req);
  if (crossSite) {
    log.warn(`${kind}.cross_site`);
    return crossSite;
  }
  const file = await readUpload(req);
  if (file instanceof Response) return file;
  const limited = await limitUploads(req, kind);
  if (limited) return limited;

  let extraction: Extraction;
  try {
    extraction = await extractDocument(new Uint8Array(await file.arrayBuffer()), file.name);
  } catch (error) {
    if (!(error instanceof ParseError)) throw error;
    log.info(`${kind}.parse_failed`, { code: error.code, bytes: file.size });
    const { code, status, message = error.message } = PARSE_FAILURES[error.code];
    return fail(code, message, status);
  }
  const report = runRecruiterChecks(extraction, startedAt);
  // A first check is what an invite pays out on (src/lib/referrals).
  await noteReferralCheck();
  return { extraction, report, bytes: file.size, startedAt };
}

// The "file" field, size-checked from File.size before any of its bytes are copied out.
async function readUpload(req: Request): Promise<File | Response> {
  const type = req.headers.get("content-type") ?? "";
  if (!/^multipart\/form-data\b/i.test(type)) return fail("bad_request", NO_FILE, 400);
  // Browsers declare the size, so an oversized upload is refused before a byte of it is read.
  if (Number(req.headers.get("content-length")) > MAX_BODY_BYTES) return fail("too_large", TOO_LARGE, 413);

  const body = await readBody(req, MAX_BODY_BYTES);
  if (!body.ok) {
    return body.reason === "too_large"
      ? fail("too_large", TOO_LARGE, 413)
      : fail("bad_request", "The upload didn't come through. Please try again.", 400);
  }

  let form: FormData;
  try {
    form = await new Response(body.bytes, { headers: { "content-type": type } }).formData();
  } catch {
    return fail("bad_request", NO_FILE, 400);
  }
  const file = form.get("file");
  if (file === null || typeof file === "string") return fail("bad_request", NO_FILE, 400);
  if (file.size === 0) return fail("bad_request", "That file is empty. Choose your resume and try again.", 400);
  if (file.size > UPLOAD_LIMITS.maxBytes) return fail("too_large", TOO_LARGE, 413);
  return file;
}

type BodyRead = { ok: true; bytes: Uint8Array<ArrayBuffer> } | { ok: false; reason: "too_large" | "unreadable" };

// Off Vercel nothing caps a request body, and a chunked upload declares no length, so reading
// stops as soon as the body is too big instead of buffering all of it first.
async function readBody(req: Request, maxBytes: number): Promise<BodyRead> {
  if (!req.body) return { ok: true, bytes: new Uint8Array(0) };
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, reason: "too_large" };
      }
      chunks.push(value);
    }
  } catch {
    // The client went away mid-upload.
    return { ok: false, reason: "unreadable" };
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, bytes };
}
