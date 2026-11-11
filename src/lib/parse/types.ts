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
  columnLayout: boolean;
  imageCount: number;
  tableCount: number;
  textBoxCount: number;
  // Many parsers ignore these, so contact details placed there get lost.
  headerFooterText: string;
  // Icon fonts / private-use glyphs (phone and mail icons), which parse as junk.
  iconGlyphCount: number;
};

export type Extraction = {
  kind: FileKind;
  // Lines top-to-bottom, then left-to-right across the full width. Columns come out interleaved on
  // purpose: that's what many ATSs do with them.
  text: string;
  lines: string[];
  pageCount: number;
  wordCount: number;
  pages: PdfPage[];
  // PDF only. A resume often shows a short form ("GitHub") while the link holds the full address.
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
