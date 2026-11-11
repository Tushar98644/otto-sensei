import { UPLOAD_LIMITS } from "@/config/plans";
import { extractDocx } from "./docx";
import { extractPdf } from "./pdf";
import { ParseError, type Extraction, type FileKind } from "./types";

export { ParseError } from "./types";
export type { Extraction, FileKind } from "./types";

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d];
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];
// OLE compound file: legacy .doc, and also what Word writes for a password-protected .docx.
const OLE_MAGIC = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

const startsWith = (data: Uint8Array, magic: number[]) => magic.every((byte, i) => data[i] === byte);

export function detectKind(data: Uint8Array, filename: string): FileKind | null {
  if (startsWith(data, PDF_MAGIC)) return "pdf";
  if (startsWith(data, ZIP_MAGIC) && /\.docx$/i.test(filename)) return "docx";
  return null;
}

export async function extractDocument(data: Uint8Array, filename: string): Promise<Extraction> {
  if (data.byteLength === 0) throw new ParseError("empty_file", "That file is empty.");
  if (data.byteLength > UPLOAD_LIMITS.maxBytes) {
    const megabytes = Math.round(UPLOAD_LIMITS.maxBytes / (1024 * 1024));
    throw new ParseError("too_large", `That file is over ${megabytes} MB. Try a smaller copy.`);
  }

  const kind = detectKind(data, filename);
  if (!kind) throw unsupported(data, filename);

  const { maxPages } = UPLOAD_LIMITS;
  const extraction = kind === "pdf" ? await extractPdf(data, { maxPages }) : await extractDocx(data);
  if (extraction.pageCount > maxPages) {
    throw new ParseError("too_many_pages", `That file has more than ${maxPages} pages. Upload just your resume.`);
  }
  return extraction;
}

function unsupported(data: Uint8Array, filename: string): ParseError {
  if (startsWith(data, OLE_MAGIC)) {
    if (/\.docx$/i.test(filename)) {
      return new ParseError("encrypted", "That Word file is password-protected. Remove the password and upload it again.");
    }
    if (/\.doc$/i.test(filename)) {
      return new ParseError("unsupported_type", "That's an older Word file (.doc). Save it as .docx or PDF, then upload it.");
    }
  }
  return new ParseError("unsupported_type", "That file isn't a PDF or Word document. Upload a .pdf or .docx file.");
}
