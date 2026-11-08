import { getResolvedPDFJS } from "unpdf";
import { UPLOAD_LIMITS } from "@/config/plans";
import { log } from "@/lib/log";
import { groupRows, hasColumnGutter, rowText, type LayoutItem } from "./pdf-layout";
import { countIconGlyphs, countWords, hasReadableText, toLines } from "./text";
import { ParseError, type Extraction, type PdfPage, type PdfTextItem } from "./types";

type PdfJs = Awaited<ReturnType<typeof getResolvedPDFJS>>;
type PdfDocument = Awaited<ReturnType<PdfJs["getDocument"]>["promise"]>;
type PdfPageProxy = Awaited<ReturnType<PdfDocument["getPage"]>>;
type TextContentItem = Awaited<ReturnType<PdfPageProxy["getTextContent"]>>["items"][number];

type PageLayout = { pageNumber: number; width: number; height: number; items: LayoutItem[]; images: number };

export type ExtractPdfOptions = {
  maxPages?: number;
  // A resume parses in well under a second; anything slower is a malformed or hostile file.
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 10_000;

class ParseTimeout extends Error {
  constructor() {
    super("PDF parsing timed out");
    this.name = "ParseTimeout";
  }
}

/**
 * Reads text with positions, rebuilds lines in naive full-width reading order (so two columns come
 * out interleaved, as many applicant tracking systems read them), and collects layout signals.
 */
export async function extractPdf(data: Uint8Array, options: ExtractPdfOptions = {}): Promise<Extraction> {
  const maxPages = options.maxPages ?? UPLOAD_LIMITS.maxPages;
  const deadline = Date.now() + (options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const pdfjs = await getResolvedPDFJS();
  // Created directly instead of through getDocumentProxy() so we hold the loading task and can
  // destroy it even when loading fails. pdf.js may detach the buffer it gets, so it gets a copy.
  const task = pdfjs.getDocument({
    data: data.slice(),
    useSystemFonts: true,
    verbosity: pdfjs.VerbosityLevel.ERRORS,
  });
  try {
    const pdf = await withDeadline(task.promise, deadline);
    if (pdf.numPages > maxPages) {
      throw new ParseError("too_many_pages", `That PDF has more than ${maxPages} pages. Upload just your resume.`);
    }
    const imageOps = imagePaintOps(pdfjs.OPS);
    const pages: PageLayout[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      pages.push(await withDeadline(readPage(pdf, pageNumber, imageOps), deadline));
    }
    return buildExtraction(pages);
  } catch (error) {
    throw toParseError(error);
  } finally {
    await task.destroy().catch(() => undefined);
  }
}

async function readPage(pdf: PdfDocument, pageNumber: number, imageOps: ReadonlySet<number>): Promise<PageLayout> {
  const page = await pdf.getPage(pageNumber);
  try {
    const viewport = page.getViewport({ scale: 1 });
    const [content, operators] = await Promise.all([page.getTextContent(), page.getOperatorList()]);
    const items: LayoutItem[] = [];
    for (const raw of content.items) {
      const item = toLayoutItem(raw, viewport.transform);
      if (item) items.push(item);
    }
    let images = 0;
    for (const fn of operators.fnArray) if (imageOps.has(fn)) images++;
    return { pageNumber, width: viewport.width, height: viewport.height, items, images };
  } finally {
    page.cleanup();
  }
}

// Every way pdf.js paints a raster image. Solid-colour masks are left out: pdf.js turns 1x1 masks
// into plain fills, which aren't pictures.
function imagePaintOps(ops: PdfJs["OPS"]): ReadonlySet<number> {
  return new Set([
    ops.paintImageXObject,
    ops.paintImageXObjectRepeat,
    ops.paintInlineImageXObject,
    ops.paintInlineImageXObjectGroup,
    ops.paintImageMaskXObject,
    ops.paintImageMaskXObjectGroup,
    ops.paintImageMaskXObjectRepeat,
  ]);
}

function toLayoutItem(raw: TextContentItem, viewportTransform: readonly number[]): LayoutItem | null {
  if (!("str" in raw) || !raw.str.trim()) return null;
  // Viewport space has its origin at the top-left, which also handles page rotation and offsets.
  const [a = 0, b = 0, c = 0, d = 0, e = 0, f = 0] = multiply(viewportTransform, raw.transform.map(Number));
  const fontSize = Math.hypot(c, d) || Math.hypot(a, b);
  const height = raw.height > 0 ? raw.height : fontSize;
  return {
    str: raw.str,
    x: round(e),
    y: round(f - height),
    width: round(raw.width),
    height: round(height),
    fontName: raw.fontName,
    baseline: round(f),
    upright: a > 0 && Math.abs(b) <= a * 0.05,
  };
}

function buildExtraction(pages: PageLayout[]): Extraction {
  const pdfPages: PdfPage[] = [];
  const pageTexts: string[] = [];
  let columnLayout = false;
  let imageCount = 0;
  for (const page of pages) {
    const rows = groupRows(page.items);
    pageTexts.push(rows.map((row) => rowText(row.items)).join("\n"));
    columnLayout ||= hasColumnGutter(rows, page.width);
    imageCount += page.images;
    pdfPages.push({
      pageNumber: page.pageNumber,
      width: round(page.width),
      height: round(page.height),
      items: rows.flatMap((row) => row.items.map(toPdfTextItem)),
    });
  }
  const text = pageTexts
    .map((pageText) => toLines(pageText).join("\n"))
    .filter(Boolean)
    .join("\n\n");
  const lines = toLines(text);
  const hasTextLayer = hasReadableText(text, pages.length);
  return {
    kind: "pdf",
    text,
    lines,
    pageCount: pages.length,
    wordCount: countWords(text),
    pages: pdfPages,
    signals: {
      hasTextLayer,
      columnLayout: hasTextLayer && columnLayout,
      imageCount,
      tableCount: 0,
      textBoxCount: 0,
      headerFooterText: "",
      iconGlyphCount: countIconGlyphs(lines),
    },
  };
}

function toPdfTextItem({ str, x, y, width, height, fontName }: LayoutItem): PdfTextItem {
  return { str, x, y, width, height, fontName };
}

function toParseError(error: unknown): ParseError {
  if (error instanceof ParseError) return error;
  if (error instanceof Error && error.name === "PasswordException") {
    return new ParseError("encrypted", "That PDF is password-protected. Remove the password and upload it again.");
  }
  if (error instanceof ParseTimeout) {
    log.warn("parse.pdf_timeout");
    return new ParseError("corrupt", "That PDF took too long to read. Try exporting it again from the app you made it in.");
  }
  // pdf.js error messages describe file structure, never document text, so they're safe to log.
  log.warn("parse.pdf_unreadable", {}, error);
  return new ParseError("corrupt", "We couldn't read that PDF. Try exporting it again from the app you made it in.");
}

// The loading task is destroyed in a finally block, which also stops pdf.js work left running here.
function withDeadline<T>(promise: Promise<T>, deadline: number): Promise<T> {
  const remaining = deadline - Date.now();
  if (remaining <= 0) return Promise.reject(new ParseTimeout());
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ParseTimeout()), remaining);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function multiply(m: readonly number[], n: readonly number[]): number[] {
  const [a = 1, b = 0, c = 0, d = 1, e = 0, f = 0] = m;
  const [a2 = 1, b2 = 0, c2 = 0, d2 = 1, e2 = 0, f2 = 0] = n;
  return [
    a * a2 + c * b2,
    b * a2 + d * b2,
    a * c2 + c * d2,
    b * c2 + d * d2,
    a * e2 + c * f2 + e,
    b * e2 + d * f2 + f,
  ];
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
