// Pure sizing for the editor's preview. The page is laid out at a real screen width and zoomed to
// fit its box, so the preview shows the layout visitors get (templates switch layouts by their
// container's width) instead of whatever the editor's column happens to measure.

export type PreviewWidth = "desktop" | "phone";

// A laptop and a common phone (iPhone 12-15).
export const PREVIEW_PAGE_WIDTH: Record<PreviewWidth, number> = { desktop: 1280, phone: 390 };

/**
 * The width to lay the page out at and the zoom that fits it into `box` CSS pixels. Never zooms
 * in: a desktop box wider than a laptop gets the page at its own width, a phone stays phone-sized.
 */
export function previewFit(width: PreviewWidth, box: number): { page: number; zoom: number } {
  const base = PREVIEW_PAGE_WIDTH[width];
  if (!(box > 0)) return { page: base, zoom: 0 };
  const page = width === "desktop" ? Math.max(base, Math.floor(box)) : base;
  return { page, zoom: Math.min(1, box / page) };
}
