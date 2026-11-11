export type FileKind = "pdf" | "docx";

// Coordinates are in PDF points with the origin at the top-left of the page (y grows downward).
export type PdfTextItem = {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName: string;
};

export type PdfLinkTarget = { url: string; text: string };

export type PdfPage = {
  pageNumber: number;
  width: number;
  height: number;
  items: PdfTextItem[];
};

export type ExtractionSignals = {
  // False for scanned/image-only PDFs: hiring software reads nothing.
  hasTextLayer: boolean;
  // Two or more side-by-side columns (PDF: geometry; DOCX: w:cols in section properties).
  columnLayout: boolean;
  imageCount: number;
  tableCount: number;
  // DOCX text boxes, which many parsers skip entirely.
  textBoxCount: number;
  // DOCX header/footer text, which many parsers ignore (so contact details placed there get lost).
  headerFooterText: string;
  // Characters from icon fonts / Unicode private-use areas (phone and mail icons), which parse as junk.
  iconGlyphCount: number;
};

export type Extraction = {
  kind: FileKind;
  // What a typical parser reads, in the order it reads it: lines sorted top-to-bottom, then
  // left-to-right across the full page width. Multi-column layouts come out interleaved on purpose,
  // because that is what many applicant tracking systems do with them.
  text: string;
  lines: string[];
  pageCount: number;
  wordCount: number;
  // PDF only; empty for DOCX.
  pages: PdfPage[];
  // PDF only: each clickable web link with the words drawn under it, in page order. A resume often
  // shows a short form ("github.com/jane", or just "GitHub") while the link holds the full address.
  links?: PdfLinkTarget[];
  signals: ExtractionSignals;
};

export type ParseErrorCode =
  "unsupported_type" | "too_large" | "too_many_pages" | "empty_file" | "encrypted" | "corrupt";

export class ParseError extends Error {
  readonly code: ParseErrorCode;

  constructor(code: ParseErrorCode, message: string) {
    super(message);
    this.name = "ParseError";
    this.code = code;
  }
}
