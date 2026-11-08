import { describe, expect, it } from "vitest";
import { UPLOAD_LIMITS } from "@/config/plans";
import { ParseError, detectKind, extractDocument } from "./index";
import { blankPdf, buildDocx, cleanResumePdf, encryptedPdf, noTextPdf, paragraph, templateDocx } from "./test-fixtures";

const bytes = (...values: number[]) => new Uint8Array(values);
const text = (value: string) => new TextEncoder().encode(value);

async function parseError(promise: Promise<unknown>): Promise<ParseError> {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  if (!(error instanceof ParseError)) throw new Error(`Expected a ParseError, got ${String(error)}`);
  return error;
}

describe("detectKind", () => {
  it("trusts magic bytes over names", () => {
    expect(detectKind(text("%PDF-1.7"), "resume.docx")).toBe("pdf");
    expect(detectKind(bytes(0x50, 0x4b, 0x03, 0x04), "resume.DOCX")).toBe("docx");
    expect(detectKind(bytes(0x50, 0x4b, 0x03, 0x04), "archive.zip")).toBeNull();
    expect(detectKind(text("hello"), "resume.pdf")).toBeNull();
  });
});

describe("extractDocument", () => {
  it("dispatches PDFs and Word files", async () => {
    expect((await extractDocument(await cleanResumePdf(), "jane.pdf")).kind).toBe("pdf");
    expect((await extractDocument(await templateDocx(), "sam.docx")).kind).toBe("docx");
  });

  it("returns an extraction for a scan instead of throwing", async () => {
    const extraction = await extractDocument(await noTextPdf(), "scan.pdf");
    expect(extraction.signals.hasTextLayer).toBe(false);
  });

  it("rejects empty and oversized files before parsing", async () => {
    expect((await parseError(extractDocument(new Uint8Array(0), "a.pdf"))).code).toBe("empty_file");
    const huge = new Uint8Array(UPLOAD_LIMITS.maxBytes + 1);
    huge.set(text("%PDF-1.7"));
    expect((await parseError(extractDocument(huge, "a.pdf"))).code).toBe("too_large");
  });

  it("rejects files that aren't PDF or DOCX", async () => {
    const png = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    expect((await parseError(extractDocument(png, "photo.png"))).code).toBe("unsupported_type");
    expect((await parseError(extractDocument(text("plain notes"), "notes.txt"))).code).toBe("unsupported_type");
    const zip = await buildDocx({ body: paragraph("Hi") });
    expect((await parseError(extractDocument(zip, "resume.zip"))).code).toBe("unsupported_type");
    const ole = bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0);
    const legacy = await parseError(extractDocument(ole, "resume.doc"));
    expect(legacy.code).toBe("unsupported_type");
    expect(legacy.message).toContain(".docx");
  });

  it("flags password-protected files", async () => {
    expect((await parseError(extractDocument(await encryptedPdf(), "locked.pdf"))).code).toBe("encrypted");
    const ole = bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0);
    expect((await parseError(extractDocument(ole, "locked.docx"))).code).toBe("encrypted");
  });

  it("rejects files with too many pages", async () => {
    const pdf = await blankPdf(UPLOAD_LIMITS.maxPages + 1);
    expect((await parseError(extractDocument(pdf, "book.pdf"))).code).toBe("too_many_pages");
    const docx = await buildDocx({ body: paragraph("Long one"), pages: UPLOAD_LIMITS.maxPages + 3 });
    expect((await parseError(extractDocument(docx, "book.docx"))).code).toBe("too_many_pages");
    expect((await extractDocument(await blankPdf(UPLOAD_LIMITS.maxPages), "ok.pdf")).pageCount).toBe(UPLOAD_LIMITS.maxPages);
  });

  it("reports garbage as corrupt", async () => {
    expect((await parseError(extractDocument(text("%PDF-1.7\nnot really a pdf"), "a.pdf"))).code).toBe("corrupt");
    const junk = bytes(0x50, 0x4b, 0x03, 0x04, ...Array.from({ length: 64 }, (_, i) => (i * 37) % 256));
    expect((await parseError(extractDocument(junk, "a.docx"))).code).toBe("corrupt");
  });

  it("gives plain, user-facing messages", async () => {
    const error = await parseError(extractDocument(text("plain notes"), "notes.txt"));
    expect(error.message).toBe("That file isn't a PDF or Word document. Upload a .pdf or .docx file.");
  });
});
