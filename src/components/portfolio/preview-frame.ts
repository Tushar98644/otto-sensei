// The page is laid out at a real screen width and zoomed to fit, so the preview shows the layout
// visitors get (templates switch layout by container width), not the editor column's.

export type PreviewWidth = "desktop" | "phone";

// A laptop and a common phone (iPhone 12-15).
export const PREVIEW_PAGE_WIDTH: Record<PreviewWidth, number> = { desktop: 1280, phone: 390 };

// Never zooms in: a box wider than a laptop gets the page at its own width.
export function previewFit(width: PreviewWidth, box: number): { page: number; zoom: number } {
  const base = PREVIEW_PAGE_WIDTH[width];
  if (!(box > 0)) return { page: base, zoom: 0 };
  const page = width === "desktop" ? Math.max(base, Math.floor(box)) : base;
  return { page, zoom: Math.min(1, box / page) };
}
