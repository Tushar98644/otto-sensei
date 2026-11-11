import { getResolvedPDFJS } from "unpdf";
import { UPLOAD_LIMITS } from "@/config/plans";
import { log } from "@/lib/log";
import { groupRows, hasColumnGutter, rowText, type LayoutItem } from "./pdf-layout";
import { countIconGlyphs, countWords, hasReadableText, toLines } from "./text";
import {
  ParseError,
  type Extraction,
  type PdfLinkTarget,
  type PdfPage,
  type PdfTextItem,
} from "./types";

type PdfJs = Awaited<ReturnType<typeof getResolvedPDFJS>>;
type PdfDocument = Awaited<ReturnType<PdfJs["getDocument"]>["promise"]>;
type PdfPageProxy = Awaited<ReturnType<PdfDocument["getPage"]>>;
type TextContentItem = Awaited<ReturnType<PdfPageProxy["getTextContent"]>>["items"][number];

type PageLayout = {
  pageNumber: number;
  width: number;
  height: number;
  items: LayoutItem[];
  images: number;
  links: PdfLinkTarget[];
};

const MAX_LINKS = 40;
const MAX_LINK_LENGTH = 500;

export type ExtractPdfOptions = {
  maxPages?: number;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 10_000;

class ParseTimeout extends Error {
  constructor() {
    super("PDF parsing timed out");
    this.name = "ParseTimeout";
  }
}

// Naive full-width order on purpose: two columns interleave, as many ATSs read them.
export async function extractPdf(
  data: Uint8Array,
  options: ExtractPdfOptions = {},
): Promise<Extraction> {
  const maxPages = options.maxPages ?? UPLOAD_LIMITS.maxPages;
  const deadline = Date.now() + (options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const pdfjs = await getResolvedPDFJS();
  // getDocument, not getDocumentProxy, so the task can be destroyed; pdf.js may detach the buffer.
  const task = pdfjs.getDocument({
    data: data.slice(),
    useSystemFonts: true,
    verbosity: pdfjs.VerbosityLevel.ERRORS,
  });
  try {
    const pdf = await withDeadline(task.promise, deadline);
    if (pdf.numPages > maxPages) {
      throw new ParseError(
        "too_many_pages",
        `That PDF has more than ${maxPages} pages. Upload just your resume.`,
      );
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

async function readPage(
  pdf: PdfDocument,
  pageNumber: number,
  imageOps: ReadonlySet<number>,
): Promise<PageLayout> {
  const page = await pdf.getPage(pageNumber);
  try {
    const viewport = page.getViewport({ scale: 1 });
    const [content, operators, annotations] = await Promise.all([
      page.getTextContent(),
      page.getOperatorList(),
      page.getAnnotations({ intent: "display" }),
    ]);
    const items: LayoutItem[] = [];
    for (const raw of content.items) {
      const item = toLayoutItem(raw, viewport.transform);
      if (item) items.push(item);
    }
    let images = 0;
    for (const fn of operators.fnArray) if (imageOps.has(fn)) images++;
    return {
      pageNumber,
      width: viewport.width,
      height: viewport.height,
      items,
      images,
      links: webLinks(annotations, items, viewport.transform),
    };
  } finally {
    page.cleanup();
  }
}

// Solid-colour masks are left out: pdf.js turns 1x1 masks into plain fills.
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

function toLayoutItem(
  raw: TextContentItem,
  viewportTransform: readonly number[],
): LayoutItem | null {
  if (!("str" in raw) || !raw.str.trim()) return null;
  const [a = 0, b = 0, c = 0, d = 0, e = 0, f = 0] = multiply(
    viewportTransform,
    raw.transform.map(Number),
  );
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
    links: pages.flatMap((page) => page.links).slice(0, MAX_LINKS),
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

function webLinks(
  annotations: readonly unknown[],
  items: readonly LayoutItem[],
  viewportTransform: readonly number[],
): PdfLinkTarget[] {
  try {
    return linksUnder(annotations, items, viewportTransform);
  } catch (error) {
    log.warn("parse.pdf_links_unreadable", {}, error);
    return [];
  }
}

function linksUnder(
  annotations: readonly unknown[],
  items: readonly LayoutItem[],
  viewportTransform: readonly number[],
): PdfLinkTarget[] {
  const [a = 1, b = 0, c = 0, d = 1, e = 0, f = 0] = viewportTransform.map(Number);
  const toViewport = (x: number, y: number) => [a * x + c * y + e, b * x + d * y + f] as const;
  const links: PdfLinkTarget[] = [];
  for (const annotation of annotations) {
    const { subtype, url, rect } = (annotation ?? {}) as {
      subtype?: unknown;
      url?: unknown;
      rect?: unknown;
    };
    if (subtype !== "Link" || typeof url !== "string" || url.length > MAX_LINK_LENGTH) continue;
    if (!/^https?:\/\//i.test(url) || !Array.isArray(rect) || rect.length !== 4) continue;
    const [rx1 = 0, ry1 = 0, rx2 = 0, ry2 = 0] = rect.map(Number);
    const [x1, y1] = toViewport(rx1, ry1);
    const [x2, y2] = toViewport(rx2, ry2);
    const box = {
      left: Math.min(x1, x2),
      right: Math.max(x1, x2),
      top: Math.min(y1, y2),
      bottom: Math.max(y1, y2),
    };
    const text = items
      .filter((item) => underLink(item, box))
      .map((item) => item.str.trim())
      .join(" ")
      .trim();
    links.push({ url, text });
  }
  return links;
}

function underLink(
  item: LayoutItem,
  box: { left: number; right: number; top: number; bottom: number },
): boolean {
  const overlapX = Math.min(item.x + item.width, box.right) - Math.max(item.x, box.left);
  const overlapY = Math.min(item.y + item.height, box.bottom) - Math.max(item.y, box.top);
  return overlapY > 0 && overlapX >= Math.max(item.width, 1) * 0.5;
}

function toPdfTextItem({ str, x, y, width, height, fontName }: LayoutItem): PdfTextItem {
  return { str, x, y, width, height, fontName };
}

function toParseError(error: unknown): ParseError {
  if (error instanceof ParseError) return error;
  if (error instanceof Error && error.name === "PasswordException") {
    return new ParseError(
      "encrypted",
      "That PDF is password-protected. Remove the password and upload it again.",
    );
  }
  if (error instanceof ParseTimeout) {
    log.warn("parse.pdf_timeout");
    return new ParseError(
      "corrupt",
      "That PDF took too long to read. Try exporting it again from the app you made it in.",
    );
  }
  // pdf.js error messages describe file structure, never document text, so they're safe to log.
  log.warn("parse.pdf_unreadable", {}, error);
  return new ParseError(
    "corrupt",
    "We couldn't read that PDF. Try exporting it again from the app you made it in.",
  );
}

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
