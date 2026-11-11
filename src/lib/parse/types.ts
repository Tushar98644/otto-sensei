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
  hasTextLayer: boolean;
  columnLayout: boolean;
  imageCount: number;
  tableCount: number;
  textBoxCount: number;
  headerFooterText: string;
  iconGlyphCount: number;
};

export type Extraction = {
  kind: FileKind;
  text: string;
  lines: string[];
  pageCount: number;
  wordCount: number;
  pages: PdfPage[];
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
