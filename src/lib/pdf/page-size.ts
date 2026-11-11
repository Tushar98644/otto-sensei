export const PDF_PAGE_SIZES = ["LETTER", "A4"] as const;
export type PdfPageSize = (typeof PDF_PAGE_SIZES)[number];

export const PAGE_SIZE_LABELS: Record<PdfPageSize, string> = { LETTER: "Letter", A4: "A4" };

export const PAGE_ASPECT: Record<PdfPageSize, number> = { LETTER: 612 / 792, A4: 595.28 / 841.89 };

export function isPdfPageSize(value: unknown): value is PdfPageSize {
  return value === "LETTER" || value === "A4";
}

const LETTER_REGIONS = new Set(["US", "CA", "MX", "PH", "CL", "CO", "VE", "CR", "GT", "PA", "DO", "PR", "SV", "NI", "HN"]);

export function defaultPageSize(locale: string | undefined): PdfPageSize {
  if (!locale) return "LETTER";
  try {
    const region = new Intl.Locale(locale).maximize().region;
    return region && !LETTER_REGIONS.has(region) ? "A4" : "LETTER";
  } catch {
    return "LETTER";
  }
}
